import { useTranslation } from 'react-i18next';
import type { Institution } from '@/api/types';
import type { FamilyGroupRow } from '@/utils/family';
import { formatDate } from '@/utils/date';
import { formatMoney } from '@/utils/money';

export default function FamilyStatement({
  family,
  institution,
}: {
  family: FamilyGroupRow;
  institution: Institution | null;
}) {
  const { t, i18n } = useTranslation();
  const invoiceCount = family.students.reduce((sum, student) => sum + student.rows.length, 0);

  return (
    <div className="print-break p-6 sm:p-8 text-foreground-950">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b-2 border-foreground-900">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-12 h-12 shrink-0 rounded-md bg-foreground-950 text-background-50 flex items-center justify-center font-bold text-sm">
            SAI
          </span>
          <div className="min-w-0">
            <p className="font-heading text-lg leading-tight">
              {institution?.name_ar || institution?.name || 'SAI Educational College'}
            </p>
            <p className="text-[11px] text-foreground-600 mt-0.5">
              {institution?.name || 'SAI Educational College'}
            </p>
            <p className="text-[11px] text-foreground-600">
              {institution?.address ?? '—'} · {institution?.phone ?? '—'}
            </p>
          </div>
        </div>

        <div className="text-end shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground-500">
            {t('app.out.familyStatement')}
          </p>
          <p className="text-sm font-semibold">{formatDate(new Date().toISOString(), i18n.language)}</p>
          <p className="text-[11px] text-foreground-600 mt-1">
            {family.students.length} {t('app.out.children')} · {invoiceCount} {t('app.out.invoices')}
          </p>
        </div>
      </div>

      <div className="text-center my-4">
        <h1 className="font-heading text-xl">{t('app.out.familyTitle')}</h1>
        <p className="text-[11px] text-foreground-500 mt-0.5">{t('app.out.familySubtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-md border border-foreground-200 px-4 py-3 text-xs">
        <div>
          <span className="text-foreground-500">{t('app.out.guardian')}: </span>
          <span className="font-semibold">
            {family.hasGuardian ? family.guardianName : t('app.out.noGuardian')}
          </span>
        </div>
        <div>
          <span className="text-foreground-500">{t('app.students.guardianPhone')}: </span>
          <span className="font-semibold tabular-nums" dir="ltr">
            {family.phone ?? '—'}
          </span>
        </div>
        <div>
          <span className="text-foreground-500">{t('app.students.guardianRelation')}: </span>
          <span className="font-semibold">
            {family.relation ? t(`app.status.${family.relation}`, { defaultValue: family.relation }) : '—'}
          </span>
        </div>
        <div>
          <span className="text-foreground-500">{t('app.common.email')}: </span>
          <span className="font-semibold" dir="ltr">
            {family.email ?? '—'}
          </span>
        </div>
      </div>

      <table className="w-full mt-4 border-collapse text-xs">
        <thead>
          <tr className="bg-background-200">
            <th className="text-start font-semibold px-3 py-2 border border-foreground-200">
              {t('app.out.child')}
            </th>
            <th className="text-start font-semibold px-3 py-2 border border-foreground-200">
              {t('app.fees.invoiceNo')}
            </th>
            <th className="text-start font-semibold px-3 py-2 border border-foreground-200 w-24">
              {t('app.fees.issued')}
            </th>
            <th className="text-end font-semibold px-3 py-2 border border-foreground-200 w-28">
              {t('app.fees.total')}
            </th>
            <th className="text-end font-semibold px-3 py-2 border border-foreground-200 w-28">
              {t('app.fees.paid')}
            </th>
            <th className="text-end font-semibold px-3 py-2 border border-foreground-200 w-28">
              {t('app.fees.balance')}
            </th>
          </tr>
        </thead>
        <tbody>
          {family.students.flatMap((student) =>
            student.rows.map((row, index) => (
              <tr key={row.invoice.id}>
                <td className="px-3 py-2 border border-foreground-200">
                  {index === 0 ? (
                    <>
                      <span className="font-medium">{student.name}</span>
                      <span className="block text-[10px] text-foreground-500">
                        {student.className ?? '—'}
                        {student.sectionName ? ` / ${student.sectionName}` : ''}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-foreground-400">{t('app.out.sameChild')}</span>
                  )}
                </td>
                <td className="px-3 py-2 border border-foreground-200 tabular-nums" dir="ltr">
                  {row.invoice.invoice_no}
                </td>
                <td className="px-3 py-2 border border-foreground-200">
                  {formatDate(row.invoice.issue_date, i18n.language)}
                </td>
                <td className="px-3 py-2 border border-foreground-200 text-end tabular-nums">
                  {formatMoney(row.invoice.total)}
                </td>
                <td className="px-3 py-2 border border-foreground-200 text-end tabular-nums">
                  {formatMoney(row.paid)}
                </td>
                <td className="px-3 py-2 border border-foreground-200 text-end font-semibold tabular-nums">
                  {formatMoney(row.balance)}
                </td>
              </tr>
            )),
          )}
        </tbody>
        <tfoot>
          <tr className="bg-background-200 font-semibold">
            <td className="px-3 py-2 border border-foreground-200" colSpan={3}>
              {t('app.out.familyTotal')}
            </td>
            <td className="px-3 py-2 border border-foreground-200 text-end tabular-nums">
              {formatMoney(family.billed)}
            </td>
            <td className="px-3 py-2 border border-foreground-200 text-end tabular-nums">
              {formatMoney(family.paid)}
            </td>
            <td className="px-3 py-2 border border-foreground-200 text-end tabular-nums">
              {formatMoney(family.balance)}
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="grid grid-cols-2 gap-8 mt-10 text-[11px] text-foreground-600">
        <div>
          <div className="border-t border-foreground-400 pt-1.5">{t('app.print.cashierSign')}</div>
        </div>
        <div>
          <div className="border-t border-foreground-400 pt-1.5">{t('app.print.parentSign')}</div>
        </div>
      </div>

      <p className="text-[10px] text-foreground-500 mt-5 text-center leading-relaxed">
        {t('app.out.familyFooter')}
      </p>
    </div>
  );
}