import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import {
  fetchGuardianLinks,
  fetchInstitution,
  fetchInvoiceItems,
  fetchInvoices,
  fetchPayments,
} from '@/api/college';
import type { InvoiceWithStudent } from '@/api/college';
import type { Payment } from '@/api/types';
import { formatMoney, toNumber } from '@/utils/money';
import { buildFamilies } from '@/utils/family';
import type { FamilyGroupRow } from '@/utils/family';
import PrintSheet from '@/components/app/PrintSheet';
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Row,
  SearchBox,
  StatCard,
  TableWrap,
  Tabs,
  Td,
  Th,
} from '@/components/app/ui';
import FeeReceipt from '@/pages/app/fees/components/FeeReceipt';
import FamilyPanel from './components/FamilyPanel';
import FamilyStatement from './components/FamilyStatement';

interface OutstandingInvoice {
  invoice: InvoiceWithStudent;
  paid: number;
  balance: number;
}

interface StudentGroup {
  id: string;
  name: string;
  sectionName: string | null;
  rows: OutstandingInvoice[];
  billed: number;
  paid: number;
  balance: number;
}

interface ClassGroup {
  key: string;
  label: string;
  students: StudentGroup[];
  billed: number;
  paid: number;
  balance: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export default function OutstandingPage() {
  const { t } = useTranslation();

  const [classFilter, setClassFilter] = useState('all');
  const [view, setView] = useState<'class' | 'family'>('class');
  const [query, setQuery] = useState('');
  const [printGroups, setPrintGroups] = useState<ClassGroup[] | null>(null);
  const [printFamilies, setPrintFamilies] = useState<FamilyGroupRow[] | null>(null);
  const [printTitle, setPrintTitle] = useState('');

  const state = useAsync(async () => {
    const [invoices, payments, items, institution, links] = await Promise.all([
      fetchInvoices(),
      fetchPayments(),
      fetchInvoiceItems(),
      fetchInstitution(),
      fetchGuardianLinks(),
    ]);
    return { invoices, payments, items, institution, links };
  }, []);

  const groups = useMemo<ClassGroup[]>(() => {
    const invoiceList = state.data?.invoices ?? [];
    const map = new Map<string, ClassGroup>();

    invoiceList.forEach((invoice) => {
      const paid = (invoice.payments ?? []).reduce((sum, payment) => sum + toNumber(payment.amount), 0);
      const balance = round2(toNumber(invoice.total) - paid);
      if (balance <= 0.5) return;

      const student = invoice.students;
      const className = student?.sections?.classes?.name ?? '';
      const classKey = className || '__unassigned__';
      const studentId = student?.id ?? invoice.student_id;
      const studentName = student
        ? `${student.first_name} ${student.last_name ?? ''}`.trim()
        : t('app.common.unknown');

      const group =
        map.get(classKey) ?? { key: classKey, label: className, students: [], billed: 0, paid: 0, balance: 0 };

      const studentGroup: StudentGroup =
        group.students.find((entry) => entry.id === studentId) ?? {
          id: studentId,
          name: studentName,
          sectionName: student?.sections?.name ?? null,
          rows: [],
          billed: 0,
          paid: 0,
          balance: 0,
        };

      studentGroup.rows.push({
        invoice,
        paid: round2(paid),
        balance,
      });
      studentGroup.billed = round2(studentGroup.billed + toNumber(invoice.total));
      studentGroup.paid = round2(studentGroup.paid + paid);
      studentGroup.balance = round2(studentGroup.balance + balance);

      group.billed = round2(group.billed + toNumber(invoice.total));
      group.paid = round2(group.paid + paid);
      group.balance = round2(group.balance + balance);

      if (!group.students.some((entry) => entry.id === studentId)) group.students.push(studentGroup);
      map.set(classKey, group);
    });

    return Array.from(map.values())
      .map((group) => ({
        ...group,
        students: group.students.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => {
        if (!a.label) return 1;
        if (!b.label) return -1;
        return a.label.localeCompare(b.label);
      });
  }, [state.data, t]);

  const visibleGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return groups
      .filter((group) => classFilter === 'all' || group.key === classFilter)
      .map((group) => ({
        ...group,
        students: group.students.filter((student) => {
          if (!needle) return true;
          return (
            student.name.toLowerCase().includes(needle) ||
            student.rows.some((row) => row.invoice.invoice_no.toLowerCase().includes(needle))
          );
        }),
      }))
      .filter((group) => group.students.length > 0);
  }, [groups, classFilter, query]);

  /** Every unpaid invoice rolled up per household. */
  const families = useMemo(
    () => buildFamilies(state.data?.invoices ?? [], state.data?.links ?? []),
    [state.data],
  );

  const visibleFamilies = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return families;
    return families
      .map((family) => {
        const guardianHit =
          family.guardianName.toLowerCase().includes(needle) ||
          (family.phone ?? '').toLowerCase().includes(needle);
        const students = guardianHit
          ? family.students
          : family.students.filter(
              (student) =>
                student.name.toLowerCase().includes(needle) ||
                student.rows.some((row) => row.invoice.invoice_no.toLowerCase().includes(needle)),
            );
        return { ...family, students };
      })
      .filter((family) => family.students.length > 0);
  }, [families, query]);

  const totalOutstanding = groups.reduce((sum, group) => sum + group.balance, 0);
  const classesOwing = groups.length;
  const studentsOwing = groups.reduce((sum, group) => sum + group.students.length, 0);
  const openInvoices = groups.reduce(
    (sum, group) => sum + group.students.reduce((inner, student) => inner + student.rows.length, 0),
    0,
  );

  const paymentsFor = (invoiceId: string): Payment[] =>
    (state.data?.payments ?? []).filter((payment) => payment.invoice_id === invoiceId);

  const itemsFor = (invoiceId: string) =>
    (state.data?.items ?? [])
      .filter((item) => item.invoice_id === invoiceId)
      .map((item) => ({
        id: item.id,
        invoice_id: item.invoice_id,
        fee_head_id: item.fee_head_id,
        description: item.description,
        amount: item.amount,
      }));

  const openPrint = (targets: ClassGroup[], title: string) => {
    if (targets.length === 0) return;
    setPrintTitle(title);
    setPrintGroups(targets);
  };

  const openFamilyPrint = (targets: FamilyGroupRow[]) => {
    if (targets.length === 0) return;
    setPrintFamilies(targets);
  };

  const printableInvoiceIds = printGroups
    ? printGroups.flatMap((group) =>
        group.students.flatMap((student) => student.rows.map((row) => row.invoice.id)),
      )
    : [];
  const lastInvoiceId = printableInvoiceIds[printableInvoiceIds.length - 1] ?? '';

  if (state.loading) return <LoadingBlock />;
  if (state.error || !state.data) {
    return <ErrorState message={state.error ?? t('app.common.errorDesc')} onRetry={state.reload} />;
  }

  return (
    <>
      <div className="mb-4">
        <Link
          to="/app/fees"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground-600 hover:text-primary-700 cursor-pointer"
        >
          <i className="ri-arrow-left-line" />
          {t('app.fees.title')}
        </Link>
      </div>

      <PageHeader
        title={t('app.out.title')}
        subtitle={t('app.out.subtitle')}
        action={
          view === 'family' ? (
            <button
              type="button"
              onClick={() => openFamilyPrint(visibleFamilies)}
              disabled={visibleFamilies.length === 0}
              className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-printer-line" />
              {t('app.out.printAllFamilies')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openPrint(visibleGroups, t('app.out.hintAll'))}
              disabled={visibleGroups.length === 0}
              className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-printer-line" />
              {t('app.out.printAll')}
            </button>
          )
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard
          label={t('app.out.totalOutstanding')}
          value={formatMoney(totalOutstanding)}
          icon="ri-money-dollar-circle-line"
          tone="danger"
        />
        <StatCard label={t('app.out.classesOwing')} value={classesOwing} icon="ri-building-2-line" tone="primary" />
        <StatCard label={t('app.out.studentsOwing')} value={studentsOwing} icon="ri-user-unfollow-line" tone="secondary" />
        <StatCard label={t('app.out.openInvoices')} value={openInvoices} icon="ri-receipt-line" tone="accent" />
      </div>

      <div className="mb-3 md:mb-4">
        <Tabs
          items={[
            { key: 'class', label: t('app.out.byClass'), count: groups.length },
            { key: 'family', label: t('app.out.byFamily'), count: families.length },
          ]}
          value={view}
          onChange={(key) => setView(key === 'family' ? 'family' : 'class')}
        />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <SearchBox value={query} onChange={setQuery} />
          {view === 'class' && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setClassFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer border transition-colors ${
                classFilter === 'all'
                  ? 'bg-primary-500 text-background-50 border-primary-500'
                  : 'bg-background-50 text-foreground-700 border-background-300 hover:border-primary-400'
              }`}
            >
              {t('app.common.all')}
            </button>
            {groups.map((group) => (
              <button
                key={group.key}
                type="button"
                onClick={() => setClassFilter(group.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer border transition-colors ${
                  classFilter === group.key
                    ? 'bg-primary-500 text-background-50 border-primary-500'
                    : 'bg-background-50 text-foreground-700 border-background-300 hover:border-primary-400'
                }`}
              >
                {group.label || t('app.common.unknown')}
                <span className="ms-1.5 opacity-70 tabular-nums">{formatMoney(group.balance)}</span>
              </button>
            ))}
          </div>
          )}
        </div>
      </Card>

      {view === 'family' ? (
        visibleFamilies.length === 0 ? (
          <Card>
            <EmptyState label={t('app.out.noRows')} icon="ri-checkbox-circle-line" />
          </Card>
        ) : (
          <FamilyPanel families={visibleFamilies} onPrint={(family) => openFamilyPrint([family])} />
        )
      ) : visibleGroups.length === 0 ? (
        <Card>
          <EmptyState label={t('app.out.noRows')} icon="ri-checkbox-circle-line" />
        </Card>
      ) : (
        <div className="flex flex-col gap-3 md:gap-4">
          {visibleGroups.map((group) => (
            <Card key={group.key}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 md:p-5 border-b border-background-200">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-semibold text-foreground-950">
                      {group.label || t('app.common.unknown')}
                    </h2>
                    <span className="inline-flex items-center rounded-full bg-background-200 text-foreground-800 border border-background-300 px-2 py-0.5 text-[11px] font-semibold">
                      {group.students.length} {t('app.out.students')}
                    </span>
                  </div>
                  <p className="text-[11px] text-foreground-500 mt-1">
                    {t('app.out.billed')}: {formatMoney(group.billed)} · {t('app.out.paid')}: {formatMoney(group.paid)}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-end">
                    <p className="text-[10px] text-foreground-500 uppercase tracking-wide">{t('app.out.balance')}</p>
                    <p className="text-sm font-bold text-primary-700 tabular-nums">{formatMoney(group.balance)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openPrint([group], t('app.out.hintClass'))}
                    className="inline-flex items-center gap-1 border border-background-300 hover:border-primary-400 text-foreground-800 text-[11px] font-semibold px-2.5 py-1.5 rounded-md whitespace-nowrap cursor-pointer"
                  >
                    <i className="ri-printer-line" />
                    {t('app.out.printClass')}
                  </button>
                </div>
              </div>

              <div className="md:hidden divide-y divide-background-100">
                {group.students.map((student) => (
                  <div key={student.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground-950 truncate">{student.name}</p>
                        <p className="text-[11px] text-foreground-500 mt-0.5 truncate">
                          {student.sectionName ?? '—'} · {student.rows.length} {t('app.out.invoices')}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-primary-700 tabular-nums shrink-0">
                        {formatMoney(student.balance)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-2.5">
                      <p className="text-[11px] text-foreground-500 tabular-nums truncate">
                        {t('app.out.billed')}: {formatMoney(student.billed)} · {t('app.out.paid')}:{' '}
                        {formatMoney(student.paid)}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          openPrint(
                            [
                              {
                                key: `${group.key}-${student.id}`,
                                label: `${group.label || t('app.common.unknown')} · ${student.name}`,
                                students: [student],
                                billed: student.billed,
                                paid: student.paid,
                                balance: student.balance,
                              },
                            ],
                            t('app.out.hintClass'),
                          )
                        }
                        className="inline-flex items-center gap-1 border border-background-300 text-foreground-800 text-[11px] font-semibold px-2.5 py-1.5 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <i className="ri-printer-line" />
                        {t('app.out.printStudent')}
                      </button>
                    </div>

                    <p className="text-[10px] text-foreground-400 mt-1.5 truncate">
                      {student.rows.map((row) => row.invoice.invoice_no).join(', ')}
                    </p>
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
              <TableWrap>
                <thead className="bg-background-100 border-b border-background-200">
                  <tr>
                    <Th>{t('app.fees.student')}</Th>
                    <Th>{t('app.students.sectionCol')}</Th>
                    <Th>{t('app.out.invoices')}</Th>
                    <Th>{t('app.out.billed')}</Th>
                    <Th>{t('app.out.paid')}</Th>
                    <Th>{t('app.out.balance')}</Th>
                    <Th className="text-end">{t('app.common.actions')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {group.students.map((student) => (
                    <Row key={student.id}>
                      <Td>
                        <p className="text-sm font-medium text-foreground-950 truncate max-w-[200px]">{student.name}</p>
                        <p className="text-[11px] text-foreground-500">
                          {student.rows.map((row) => row.invoice.invoice_no).join(', ')}
                        </p>
                      </Td>
                      <Td className="text-xs">{student.sectionName ?? '—'}</Td>
                      <Td className="text-xs tabular-nums">{student.rows.length}</Td>
                      <Td className="text-xs tabular-nums">{formatMoney(student.billed)}</Td>
                      <Td className="text-xs tabular-nums text-secondary-700">{formatMoney(student.paid)}</Td>
                      <Td className="text-xs font-semibold tabular-nums text-primary-700">
                        {formatMoney(student.balance)}
                      </Td>
                      <Td className="text-end">
                        <button
                          type="button"
                          onClick={() =>
                            openPrint(
                              [
                                {
                                  key: `${group.key}-${student.id}`,
                                  label: `${group.label || t('app.common.unknown')} · ${student.name}`,
                                  students: [student],
                                  billed: student.billed,
                                  paid: student.paid,
                                  balance: student.balance,
                                },
                              ],
                              t('app.out.hintClass'),
                            )
                          }
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
                        >
                          <i className="ri-printer-line" />
                          {t('app.out.printStudent')}
                        </button>
                      </Td>
                    </Row>
                  ))}
                </tbody>
              </TableWrap>
              </div>
            </Card>
          ))}
        </div>
      )}

      {printGroups && (
        <PrintSheet
          title={printTitle || t('app.out.printAll')}
          hint={t('app.out.hintAll')}
          onClose={() => setPrintGroups(null)}
        >
          <div>
            {printGroups.map((group) => (
              <div key={group.key}>
                <div className="print-break px-6 sm:px-8 pt-6 pb-3 border-b border-foreground-300">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-heading text-base">{group.label || t('app.common.unknown')}</p>
                      <p className="text-[11px] text-foreground-600">
                        {group.students.length} {t('app.out.students')} · {t('app.out.balance')}:{' '}
                        {formatMoney(group.balance)}
                      </p>
                    </div>
                    <p className="text-[10px] text-foreground-500 uppercase tracking-wide">{t('app.out.classSummary')}</p>
                  </div>
                </div>

                {group.students.flatMap((student) =>
                  student.rows.map((row) => (
                    <div
                      key={row.invoice.id}
                      className={row.invoice.id === lastInvoiceId ? '' : 'print-page-break'}
                    >
                      <FeeReceipt
                        invoice={row.invoice}
                        payments={paymentsFor(row.invoice.id)}
                        items={itemsFor(row.invoice.id)}
                        institution={state.data?.institution ?? null}
                      />
                    </div>
                  )),
                )}
              </div>
            ))}
          </div>
        </PrintSheet>
      )}
      {printFamilies && (
        <PrintSheet
          title={t('app.out.printFamily')}
          hint={t('app.out.familyHint')}
          onClose={() => setPrintFamilies(null)}
        >
          <div>
            {printFamilies.map((family, index) => (
              <div
                key={family.key}
                className={index < printFamilies.length - 1 ? 'print-page-break' : ''}
              >
                <FamilyStatement family={family} institution={state.data?.institution ?? null} />
              </div>
            ))}
          </div>
        </PrintSheet>
      )}
    </>
  );
}