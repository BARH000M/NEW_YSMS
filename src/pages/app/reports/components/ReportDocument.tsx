import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Institution } from '@/api/types';

export interface ReportMeta {
  label: string;
  value: string;
}

/**
 * Shared printable frame for the report documents: school identity on the
 * left, document title and generation stamp on the right, the active filters
 * underneath, then whatever table the page hands in.
 */
export default function ReportDocument({
  institution,
  title,
  subtitle,
  meta,
  children,
}: {
  institution: Institution | null;
  title: string;
  subtitle?: string;
  meta?: ReportMeta[];
  children: ReactNode;
}) {
  const { t, i18n } = useTranslation();

  const stamp = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-start justify-between gap-6 border-b-2 border-foreground-900 pb-3">
        <div className="min-w-0">
          <p className="font-heading text-base text-foreground-950">{institution?.name ?? t('app.nav.brand')}</p>
          {institution?.name_ar ? (
            <p className="text-[11px] text-foreground-700 mt-0.5">{institution.name_ar}</p>
          ) : null}
          <p className="text-[10px] text-foreground-600 mt-1 leading-relaxed">
            {institution?.address ?? '—'}
          </p>
          <p className="text-[10px] text-foreground-600" dir="ltr">
            {[institution?.phone, institution?.email].filter(Boolean).join(' · ') || '—'}
            {institution?.code ? ` · ${institution.code}` : ''}
          </p>
        </div>
        <div className="text-end shrink-0">
          <p className="font-heading text-sm text-foreground-950">{title}</p>
          {subtitle ? <p className="text-[10px] text-foreground-600 mt-0.5">{subtitle}</p> : null}
          <p className="text-[10px] text-foreground-600 mt-1">
            {t('app.print.generated')}: <span className="tabular-nums">{stamp}</span>
          </p>
        </div>
      </div>

      {meta && meta.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5 mt-3 border border-background-300 rounded-md px-3 py-2">
          {meta.map((item) => (
            <p key={item.label} className="text-[10px] text-foreground-600">
              <span className="font-semibold text-foreground-800">{item.label}: </span>
              {item.value}
            </p>
          ))}
        </div>
      ) : null}

      <div className="mt-4">{children}</div>

      <div className="mt-10 flex items-center justify-between gap-6 text-[11px] text-foreground-600">
        <span className="border-t border-background-300 pt-1 w-40">{t('app.print.preparedBy')}</span>
        <span className="border-t border-background-300 pt-1 w-40 text-end">{t('app.print.approvedBy')}</span>
      </div>
      <p className="mt-4 text-[10px] text-foreground-500">{t('app.print.docFooter')}</p>
    </div>
  );
}