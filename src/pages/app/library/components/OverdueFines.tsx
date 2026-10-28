import { useTranslation } from 'react-i18next';
import type { LibraryIssueRow } from '@/api/campus';
import { formatMoney } from '@/utils/money';
import { loanDaysLate, loanFine } from '@/utils/libraryFine';

/*
  Fine ledger for late returns. Instead of a bare "overdue" list, the office
  sees how many loans are late, how deep the delay runs and the money owed —
  with the daily rate editable so the figure matches the library's own policy.
*/

export default function OverdueFinesPanel({
  issues,
  rate,
  onRateChange,
  today,
}: {
  issues: LibraryIssueRow[];
  rate: number;
  onRateChange: (value: number) => void;
  today: string;
}) {
  const { t } = useTranslation();

  const late = issues.filter((issue) => issue.status === 'issued' && loanDaysLate(issue, today) > 0);
  const owed = late.reduce((sum, issue) => sum + loanFine(loanDaysLate(issue, today), rate), 0);
  const longest = late.reduce((max, issue) => Math.max(max, loanDaysLate(issue, today)), 0);

  const cells = [
    { label: t('app.library.overdueLoans'), value: String(late.length) },
    { label: t('app.library.overdueTotal'), value: formatMoney(owed) },
    { label: t('app.library.longestDelay'), value: t('app.library.dayCount', { count: longest }) },
  ];

  return (
    <div className="rounded-lg border border-primary-200 bg-primary-50/70 p-3.5 md:p-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6 flex-1">
          {cells.map((cell) => (
            <div key={cell.label} className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-600 whitespace-nowrap">
                {cell.label}
              </p>
              <p className="text-lg font-semibold text-foreground-950 tabular-nums mt-0.5 whitespace-nowrap">
                {cell.value}
              </p>
            </div>
          ))}
        </div>

        <div className="shrink-0">
          <label htmlFor="fine-rate" className="block text-[10px] font-semibold uppercase tracking-wide text-foreground-600 mb-1">
            {t('app.library.finePerDay')}
          </label>
          <div className="flex items-center gap-1.5">
            <input
              id="fine-rate"
              type="number"
              min={0}
              step={1}
              dir="ltr"
              value={rate}
              onChange={(event) => onRateChange(Math.max(0, Number(event.target.value) || 0))}
              className="w-24 rounded-md border border-background-300 bg-background-50 px-2.5 py-1.5 text-xs tabular-nums text-foreground-900 focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
            <span className="text-[11px] text-foreground-600 whitespace-nowrap">{t('app.library.perDay')}</span>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-foreground-600 mt-2.5">{t('app.library.fineNote', { rate: formatMoney(rate) })}</p>
    </div>
  );
}