import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PrintSheet from './PrintSheet';

/**
 * One-record printout. The reference console puts a printer icon on every row
 * so a single receipt, invoice or message can be handed to a parent without
 * printing the whole register. This is the same A4 sheet as ExportBar, scoped
 * to exactly one record.
 */
export interface RecordPrintProps {
  title: string;
  columns: string[];
  values: (string | number | null | undefined)[];
  meta?: { label: string; value: string }[];
  size?: 'sm' | 'md';
}

export default function RecordPrintButton({ title, columns, values, meta, size = 'sm' }: RecordPrintProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const stamp = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t('app.print.printRecord')}
        aria-label={t('app.print.printRecord')}
        className={`${size === 'sm' ? 'w-8 h-8' : 'w-9 h-9'} shrink-0 flex items-center justify-center rounded-md border border-background-300 text-foreground-700 hover:border-primary-400 cursor-pointer`}
      >
        <i className="ri-printer-line text-sm" />
      </button>

      {open && (
        <PrintSheet title={title} hint={t('app.print.singleRecord')} onClose={() => setOpen(false)}>
          <div className="p-6 md:p-8">
            <div className="flex items-start justify-between gap-4 border-b-2 border-foreground-900 pb-3">
              <div className="min-w-0">
                <h2 className="font-heading text-lg text-foreground-950">{title}</h2>
                <p className="text-[11px] text-foreground-600 mt-1">{t('app.print.singleRecord')}</p>
              </div>
              <div className="text-end shrink-0">
                <p className="text-[11px] text-foreground-600">{t('app.print.generated')}</p>
                <p className="text-[11px] text-foreground-900 font-semibold tabular-nums">{stamp}</p>
              </div>
            </div>

            {meta && meta.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-4">
                {meta.map((item) => (
                  <p key={item.label} className="text-[11px] text-foreground-800">
                    <span className="font-semibold">{item.label}:</span> {item.value || '—'}
                  </p>
                ))}
              </div>
            ) : null}

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
                <tr>
                  {columns.map((column, index) => (
                    <td
                      key={column}
                      className="px-2.5 py-1.5 text-[11px] text-foreground-900 border-b border-background-200 align-top"
                    >
                      {values[index] ?? '—'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>

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