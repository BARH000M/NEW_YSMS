import type { GuardianLink, InvoiceWithStudent } from '@/api/college';
import type { Guardian } from '@/api/types';
import { toNumber } from './money';

const round2 = (value: number) => Math.round(value * 100) / 100;

export interface OutstandingInvoiceRow {
  invoice: InvoiceWithStudent;
  paid: number;
  balance: number;
}

export interface FamilyStudentRow {
  id: string;
  name: string;
  studentNo: string | null;
  className: string | null;
  sectionName: string | null;
  rows: OutstandingInvoiceRow[];
  billed: number;
  paid: number;
  balance: number;
}

export interface FamilyGroupRow {
  key: string;
  guardianName: string;
  relation: string | null;
  phone: string | null;
  email: string | null;
  hasGuardian: boolean;
  students: FamilyStudentRow[];
  billed: number;
  paid: number;
  balance: number;
}

/** Prefer the guardian flagged as primary, fall back to any linked guardian. */
function guardianLookup(links: GuardianLink[]): Map<string, Guardian> {
  const primary = new Map<string, Guardian>();
  const fallback = new Map<string, Guardian>();

  links.forEach((link) => {
    const guardian = link.guardians;
    if (!guardian) return;
    if (link.is_primary) primary.set(link.student_id, guardian);
    else if (!fallback.has(link.student_id)) fallback.set(link.student_id, guardian);
  });

  const merged = new Map<string, Guardian>(fallback);
  primary.forEach((guardian, studentId) => merged.set(studentId, guardian));
  return merged;
}

/**
 * Groups every unpaid invoice by household so one guardian statement can show
 * all siblings at once. Students with no guardian land in one shared bucket.
 */
export function buildFamilies(invoices: InvoiceWithStudent[], links: GuardianLink[]): FamilyGroupRow[] {
  const guardians = guardianLookup(links);
  const families = new Map<string, FamilyGroupRow>();
  const studentIndex = new Map<string, FamilyStudentRow>();

  invoices.forEach((invoice) => {
    const paid = (invoice.payments ?? []).reduce((sum, payment) => sum + toNumber(payment.amount), 0);
    const balance = round2(toNumber(invoice.total) - paid);
    if (balance <= 0.5) return;

    const student = invoice.students;
    const studentId = student?.id ?? invoice.student_id;
    const guardian = guardians.get(studentId) ?? null;
    const familyKey = guardian ? guardian.id : '__no_guardian__';

    const family =
      families.get(familyKey) ?? {
        key: familyKey,
        guardianName: guardian?.full_name ?? '',
        relation: guardian?.relation ?? null,
        phone: guardian?.phone ?? null,
        email: guardian?.email ?? null,
        hasGuardian: Boolean(guardian),
        students: [],
        billed: 0,
        paid: 0,
        balance: 0,
      };

    const studentKey = `${familyKey}:${studentId}`;
    const studentRow =
      studentIndex.get(studentKey) ?? {
        id: studentId,
        name: student ? `${student.first_name} ${student.last_name ?? ''}`.trim() : '',
        studentNo: student?.student_no ?? null,
        className: student?.sections?.classes?.name ?? null,
        sectionName: student?.sections?.name ?? null,
        rows: [],
        billed: 0,
        paid: 0,
        balance: 0,
      };

    studentRow.rows.push({ invoice, paid: round2(paid), balance });
    studentRow.billed = round2(studentRow.billed + toNumber(invoice.total));
    studentRow.paid = round2(studentRow.paid + paid);
    studentRow.balance = round2(studentRow.balance + balance);

    family.billed = round2(family.billed + toNumber(invoice.total));
    family.paid = round2(family.paid + paid);
    family.balance = round2(family.balance + balance);

    if (!studentIndex.has(studentKey)) {
      studentIndex.set(studentKey, studentRow);
      family.students.push(studentRow);
    }
    families.set(familyKey, family);
  });

  return Array.from(families.values())
    .map((family) => ({
      ...family,
      students: family.students.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => b.balance - a.balance);
}

export interface SiblingBalanceRow {
  studentId: string;
  name: string;
  studentNo: string | null;
  className: string | null;
  sectionName: string | null;
  billed: number;
  paid: number;
  balance: number;
  isSelf: boolean;
}

export interface StudentFamilySummary {
  hasGuardian: boolean;
  guardianName: string | null;
  relation: string | null;
  phone: string | null;
  email: string | null;
  siblings: SiblingBalanceRow[];
  billed: number;
  paid: number;
  balance: number;
}

export interface FamilyStudentRef {
  id: string;
  first_name: string;
  last_name: string | null;
  student_no: string | null;
  sections?: { name: string; classes: { name: string } | null } | null;
}

/**
 * One student's household: the guardian on file, every sibling sharing that
 * guardian, and the combined outstanding balance the front desk can quote.
 */
export function buildStudentFamily(
  studentId: string,
  students: FamilyStudentRef[],
  links: GuardianLink[],
  invoices: InvoiceWithStudent[],
): StudentFamilySummary {
  const guardians = guardianLookup(links);
  const guardian = guardians.get(studentId) ?? null;

  const household = guardian
    ? students.filter((student) => guardians.get(student.id)?.id === guardian.id)
    : students.filter((student) => student.id === studentId);

  const siblings: SiblingBalanceRow[] = household.map((student) => {
    const own = invoices.filter((invoice) => invoice.student_id === student.id);
    const billed = round2(own.reduce((sum, invoice) => sum + toNumber(invoice.total), 0));
    const paid = round2(
      own.reduce(
        (sum, invoice) =>
          sum + (invoice.payments ?? []).reduce((inner, payment) => inner + toNumber(payment.amount), 0),
        0,
      ),
    );
    return {
      studentId: student.id,
      name: `${student.first_name} ${student.last_name ?? ''}`.trim(),
      studentNo: student.student_no ?? null,
      className: student.sections?.classes?.name ?? null,
      sectionName: student.sections?.name ?? null,
      billed,
      paid,
      balance: round2(billed - paid),
      isSelf: student.id === studentId,
    };
  });

  return {
    hasGuardian: Boolean(guardian),
    guardianName: guardian?.full_name ?? null,
    relation: guardian?.relation ?? null,
    phone: guardian?.phone ?? null,
    email: guardian?.email ?? null,
    siblings: siblings.sort((a, b) => (a.isSelf ? -1 : b.isSelf ? 1 : a.name.localeCompare(b.name))),
    billed: round2(siblings.reduce((sum, row) => sum + row.billed, 0)),
    paid: round2(siblings.reduce((sum, row) => sum + row.paid, 0)),
    balance: round2(siblings.reduce((sum, row) => sum + row.balance, 0)),
  };
}