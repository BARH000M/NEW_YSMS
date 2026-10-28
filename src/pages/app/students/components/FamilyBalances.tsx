import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { GuardianLink, InvoiceWithStudent, StudentRow } from '@/api/college';
import { buildStudentFamily } from '@/utils/family';
import { formatMoney } from '@/utils/money';

export default function FamilyBalances({
  student,
  students,
  links,
  invoices,
}: {
  student: StudentRow;
  students: StudentRow[];
  links: GuardianLink[];
  invoices: InvoiceWithStudent[];
}) {
  const { t } = useTranslation();

  const family = useMemo(
    () => buildStudentFamily(student.id, students, links, invoices),
    [student.id, students, links, invoices],
  );

  const owes = family.balance > 0.5;

  return (
    <div className="rounded-lg border border-background-200 bg-background-50 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3.5 py-3 bg-background-100 border-b border-background-200">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-accent-100 text-accent-950 flex items-center justify-center shrink-0">
              <i className="ri-parent-line text-xs" />
            </span>
            <p className="text-xs font-semibold text-foreground-950 truncate">
              {family.hasGuardian ? family.guardianName : t('app.students.noGuardians')}
            </p>
          </div>
          <p className="text-[11px] text-foreground-500 mt-1">
            {family.hasGuardian
              ? `${family.phone ?? t('app.common.noData')}${
                  family.relation
                    ? ` · ${t(`app.status.${family.relation}`, { defaultValue: family.relation })}`
                    : ''
                }`
              : t('app.students.siblingHint')}
          </p>
        </div>
        <div className="text-start sm:text-end shrink-0">
          <p className="text-[10px] uppercase tracking-wide text-foreground-500">{t('app.students.familyTotal')}</p>
          <p
            className={`text-sm font-bold tabular-nums ${
              owes ? 'text-primary-700' : 'text-secondary-700'
            }`}
          >
            {formatMoney(family.balance)}
          </p>
        </div>
      </div>

      <div className="px-3.5 py-2.5">
        <p className="text-[11px] font-semibold text-foreground-600 mb-2">
          {t('app.students.siblings')} · {family.siblings.length}
        </p>

        {family.siblings.length <= 1 && !family.hasGuardian ? (
          <p className="text-[11px] text-foreground-500">{t('app.students.noSiblings')}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {family.siblings.map((row) => (
              <li
                key={row.studentId}
                className={`flex items-center justify-between gap-3 rounded-md px-2.5 py-2 text-[11px] border ${
                  row.isSelf
                    ? 'border-accent-300 bg-accent-100/70'
                    : 'border-background-200 bg-background-100'
                }`}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground-900 truncate">
                    {row.name}
                    {row.isSelf ? (
                      <span className="ms-1.5 text-[10px] text-foreground-500">({t('app.roles.you')})</span>
                    ) : null}
                  </p>
                  <p className="text-[10px] text-foreground-500 truncate">
                    {row.className ?? '—'}
                    {row.sectionName ? ` / ${row.sectionName}` : ''}
                    {row.studentNo ? ` · ${row.studentNo}` : ''}
                  </p>
                </div>
                <div className="text-end shrink-0">
                  <p
                    className={`font-bold tabular-nums ${
                      row.balance > 0.5 ? 'text-primary-700' : 'text-secondary-700'
                    }`}
                  >
                    {formatMoney(row.balance)}
                  </p>
                  <p className="text-[10px] text-foreground-500 tabular-nums">
                    {formatMoney(row.paid)} / {formatMoney(row.billed)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}