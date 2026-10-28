import { useTranslation } from 'react-i18next';
import type { FamilyGroupRow } from '@/utils/family';
import { formatMoney } from '@/utils/money';
import { Card, Row, TableWrap, Td, Th } from '@/components/app/ui';

export default function FamilyPanel({
  families,
  onPrint,
}: {
  families: FamilyGroupRow[];
  onPrint: (family: FamilyGroupRow) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {families.map((family) => (
        <Card key={family.key}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 md:p-5 border-b border-background-200">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-7 h-7 rounded-md bg-accent-100 text-accent-950 flex items-center justify-center shrink-0">
                  <i className="ri-parent-line text-sm" />
                </span>
                <h2 className="text-sm font-semibold text-foreground-950 truncate">
                  {family.hasGuardian ? family.guardianName : t('app.out.noGuardian')}
                </h2>
                <span className="inline-flex items-center rounded-full bg-background-200 text-foreground-800 border border-background-300 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap">
                  {family.students.length} {t('app.out.children')}
                </span>
              </div>
              <p className="text-[11px] text-foreground-500 mt-1">
                {family.phone ?? t('app.common.noData')}
                {family.relation
                  ? ` · ${t(`app.status.${family.relation}`, { defaultValue: family.relation })}`
                  : ''}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-end">
                <p className="text-[10px] text-foreground-500 uppercase tracking-wide">{t('app.out.balance')}</p>
                <p className="text-sm font-bold text-primary-700 tabular-nums">{formatMoney(family.balance)}</p>
              </div>
              <button
                type="button"
                onClick={() => onPrint(family)}
                className="inline-flex items-center gap-1 border border-background-300 hover:border-primary-400 text-foreground-800 text-[11px] font-semibold px-2.5 py-1.5 rounded-md whitespace-nowrap cursor-pointer"
              >
                <i className="ri-printer-line" />
                {t('app.out.printFamily')}
              </button>
            </div>
          </div>

          <div className="md:hidden divide-y divide-background-100">
            {family.students.map((student) => (
              <div key={student.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground-950 truncate">{student.name}</p>
                    <p className="text-[11px] text-foreground-500 mt-0.5 truncate">
                      {student.className ?? '—'}
                      {student.sectionName ? ` / ${student.sectionName}` : ''} · {student.rows.length}{' '}
                      {t('app.out.invoices')}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-primary-700 tabular-nums shrink-0">
                    {formatMoney(student.balance)}
                  </p>
                </div>
                <p className="text-[11px] text-foreground-500 tabular-nums mt-2">
                  {t('app.out.billed')}: {formatMoney(student.billed)} · {t('app.out.paid')}:{' '}
                  {formatMoney(student.paid)}
                </p>
                <p className="text-[10px] text-foreground-400 mt-1 truncate">
                  {student.rows.map((row) => row.invoice.invoice_no).join(', ')}
                </p>
              </div>
            ))}
          </div>

          <div className="hidden md:block">
          <TableWrap>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th>{t('app.out.child')}</Th>
                <Th>{t('app.students.classCol')}</Th>
                <Th>{t('app.out.invoices')}</Th>
                <Th>{t('app.out.billed')}</Th>
                <Th>{t('app.out.paid')}</Th>
                <Th>{t('app.out.balance')}</Th>
              </tr>
            </thead>
            <tbody>
              {family.students.map((student) => (
                <Row key={student.id}>
                  <Td>
                    <p className="text-sm font-medium text-foreground-950 truncate max-w-[200px]">{student.name}</p>
                    <p className="text-[11px] text-foreground-500">
                      {student.rows.map((row) => row.invoice.invoice_no).join(', ')}
                    </p>
                  </Td>
                  <Td className="text-xs">
                    {student.className ?? '—'}
                    {student.sectionName ? ` / ${student.sectionName}` : ''}
                  </Td>
                  <Td className="text-xs tabular-nums">{student.rows.length}</Td>
                  <Td className="text-xs tabular-nums">{formatMoney(student.billed)}</Td>
                  <Td className="text-xs tabular-nums text-secondary-700">{formatMoney(student.paid)}</Td>
                  <Td className="text-xs font-semibold tabular-nums text-primary-700">
                    {formatMoney(student.balance)}
                  </Td>
                </Row>
              ))}
            </tbody>
          </TableWrap>
          </div>
        </Card>
      ))}
    </div>
  );
}