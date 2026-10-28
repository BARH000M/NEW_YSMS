import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import PrintSheet from './PrintSheet';
import { copyRows, downloadCsv, downloadExcel, fileSlug, todayStamp } from '@/utils/csv';

/**
 * One toolbar for every list in the console: the same two actions (print an
 * A4 document, export exactly what is on screen as CSV) wired to the same
 * rows the table renders — so the paper copy and the spreadsheet can never
 * drift away from what the user is looking at.
 */
export interface ExportBarProps {
  /** Document / file title, already translated. */
  title: string;
  /** Base file name (no extension) used for the download. */
  fileName: string;
  columns: string[];
  rows: (string | number | null | undefined)[][];
  /** Optional totals printed under the table. */
  summary?: { label: string; value: string }[];
  /** Small line under the print title, e.g. the active filter description. */
  hint?: string;
  /** Extra buttons that should sit next to print/export. */
  children?: ReactNode;
}

export default function ExportBar({
  title,
  fileName,
  columns,
  rows,
  summary,
  hint,
  children,
}: ExportBarProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const disabled = rows.length === 0;

  const handleCsv = () => {
    if (disabled) return;
    downloadCsv(`${fileSlug(fileName)}-${todayStamp()}.csv`, [columns, ...rows]);
  };

  const handleExcel = () => {
    if (disabled) return;
    downloadExcel(`${fileSlug(fileName)}-${todayStamp()}.xls`, [columns, ...rows]);
  };

  const handleCopy = async () => {
    if (disabled) return;
    try {
      await copyRows([columns, ...rows]);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const stamp = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  // On phones the toolbar collapses to icon buttons so five actions still fit
  // on one tidy row instead of pushing the whole page sideways.
  const actionClass =
    'inline-flex items-center justify-center gap-1.5 border border-background-300 hover:border-primary-400 disabled:opacity-50 text-foreground-800 text-xs font-semibold px-2.5 sm:px-3 py-2.5 rounded-md whitespace-nowrap cursor-pointer';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={t('app.print.printRecord')}
        aria-label={t('app.print.printRecord')}
        className={actionClass}
      >
        <i className="ri-printer-line" />
        <span className="hidden sm:inline">{t('app.print.printRecord')}</span>
      </button>
      <button
        type="button"
        onClick={handleCsv}
        disabled={disabled}
        title={t('app.print.exportCsv')}
        aria-label={t('app.print.exportCsv')}
        className={actionClass}
      >
        <i className="ri-file-text-line" />
        <span className="hidden sm:inline">{t('app.print.exportCsv')}</span>
      </button>
      <button
        type="button"
        onClick={handleExcel}
        disabled={disabled}
        title={t('app.print.exportExcel')}
        aria-label={t('app.print.exportExcel')}
        className={actionClass}
      >
        <i className="ri-file-excel-2-line" />
        <span className="hidden sm:inline">{t('app.print.exportExcel')}</span>
      </button>
      <button
        type="button"
        onClick={() => void handleCopy()}
        disabled={disabled}
        title={copied ? t('app.print.copied') : t('app.print.copy')}
        aria-label={copied ? t('app.print.copied') : t('app.print.copy')}
        className={actionClass}
      >
        <i className={copied ? 'ri-checkbox-circle-line text-secondary-700' : 'ri-file-copy-line'} />
        <span className="hidden sm:inline">{copied ? t('app.print.copied') : t('app.print.copy')}</span>
      </button>
      {children}

      {open && (
        <PrintSheet
          title={title}
          hint={t('app.print.printHint')}
          onClose={() => setOpen(false)}
        >
          <div className="p-6 md:p-8">
            <div className="flex items-start justify-between gap-4 border-b-2 border-foreground-900 pb-3">
              <div className="min-w-0">
                <h2 className="font-heading text-lg text-foreground-950">{title}</h2>
                {hint ? <p className="text-[11px] text-foreground-600 mt-1">{hint}</p> : null}
                <p className="text-[11px] text-foreground-600 mt-1">
                  {t('app.print.records')}: {rows.length}
                </p>
              </div>
              <div className="text-end shrink-0">
                <p className="text-[11px] text-foreground-600">{t('app.print.generated')}</p>
                <p className="text-[11px] text-foreground-900 font-semibold tabular-nums">{stamp}</p>
              </div>
            </div>

            <table className="w-full border-collapse mt-4">
              <thead>
                <tr className="bg-background-100">
                  {columns.map((column) => (
                    <th
                      key={column}
                      className="text-start text-[10px] font-bold uppercase tracking-wide text-foreground-700 px-2.5 py-2 border-b border-background-300 whitespace-nowrap"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={`${rowIndex}-${String(row[0] ?? '')}`} className="print-break">
                    {columns.map((column, columnIndex) => (
                      <td
                        key={column}
                        className="px-2.5 py-1.5 text-[11px] text-foreground-900 border-b border-background-200 align-top"
                      >
                        {row[columnIndex] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {summary && summary.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-end gap-x-6 gap-y-1 border-t border-foreground-900 pt-2">
                {summary.map((item) => (
                  <p key={item.label} className="text-[11px] text-foreground-800">
                    <span className="font-semibold">{item.label}:</span>{' '}
                    <span className="tabular-nums">{item.value}</span>
                  </p>
                ))}
              </div>
            ) : null}

            <div className="mt-10 flex items-center justify-between gap-6 text-[11px] text-foreground-600">
              <span className="border-t border-background-300 pt-1 w-40">{t('app.print.preparedBy')}</span>
              <span className="border-t border-background-300 pt-1 w-40 text-end">{t('app.print.approvedBy')}</span>
            </div>
            <p className="mt-4 text-[10px] text-foreground-500">{t('app.print.docFooter')}</p>
          </div>
        </PrintSheet>
      )}
    </>
  );
}