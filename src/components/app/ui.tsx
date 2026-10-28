import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SkeletonBar } from './Skeleton';

export type Tone = 'primary' | 'accent' | 'secondary' | 'neutral' | 'danger';

const toneClasses: Record<Tone, string> = {
  primary: 'bg-primary-100 text-primary-800 border-primary-200',
  accent: 'bg-accent-100 text-accent-950 border-accent-300',
  secondary: 'bg-secondary-100 text-secondary-900 border-secondary-200',
  neutral: 'bg-background-200 text-foreground-800 border-background-300',
  danger: 'bg-primary-100 text-primary-900 border-primary-300',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 border rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

const statusTone = (value: string): Tone => {
  if (['accepted', 'enrolled', 'resolved', 'active', 'closed'].includes(value)) return 'secondary';
  if (['rejected', 'withdrawn', 'suspended'].includes(value)) return 'danger';
  if (['new', 'open', 'interview'].includes(value)) return 'accent';
  if (['contacted', 'in_progress', 'investigating', 'documents_pending'].includes(value)) return 'primary';
  return 'neutral';
};

export function StatusPill({ value }: { value: string | null | undefined }) {
  const { t } = useTranslation();
  if (!value) return <span className="text-xs text-foreground-400">—</span>;
  return <Badge tone={statusTone(value)}>{t(`app.status.${value}`, { defaultValue: value })}</Badge>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-background-50 border border-background-200 rounded-lg ${className}`}>{children}</div>
  );
}

export function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-3 border-b border-background-200">
      <h2 className="text-sm font-semibold text-foreground-900">{title}</h2>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 mb-4 md:mb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="font-heading text-lg sm:text-xl md:text-2xl text-foreground-950 break-words">{title}</h1>
        {subtitle ? <p className="text-xs md:text-sm text-foreground-600 mt-1 break-words">{subtitle}</p> : null}
      </div>
      {action ? (
        <div className="flex flex-wrap items-center gap-1.5 md:gap-2 min-w-0 lg:justify-end">{action}</div>
      ) : null}
    </div>
  );
}

const statTones: Record<Tone, string> = {
  primary: 'bg-primary-500 text-background-50',
  accent: 'bg-accent-500 text-foreground-950',
  secondary: 'bg-secondary-500 text-background-50',
  neutral: 'bg-background-200 text-foreground-900',
  danger: 'bg-primary-700 text-background-50',
};

export function StatCard({
  label,
  value,
  icon,
  tone = 'neutral',
  hint,
}: {
  label: string;
  value: string | number;
  icon: string;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] md:text-xs font-semibold text-foreground-600">{label}</p>
          <p className="font-heading text-xl sm:text-2xl md:text-3xl text-foreground-950 mt-1 tabular-nums break-words leading-tight">
            {value}
          </p>
          {hint ? <p className="text-[11px] text-foreground-500 mt-1">{hint}</p> : null}
        </div>
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${statTones[tone]}`}>
          <i className={`${icon} text-base`} />
        </span>
      </div>
    </Card>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <Card className="p-6 text-center">
      <span className="w-10 h-10 mx-auto rounded-full bg-primary-100 text-primary-700 flex items-center justify-center">
        <i className="ri-error-warning-line text-lg" />
      </span>
      <h3 className="text-sm font-semibold text-foreground-950 mt-3">{t('app.common.errorTitle')}</h3>
      <p className="text-xs text-foreground-600 mt-1 break-words">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-4 py-2 rounded-md cursor-pointer whitespace-nowrap"
      >
        <i className="ri-refresh-line" />
        {t('app.common.retry')}
      </button>
    </Card>
  );
}

export function LoadingBlock({ label, rows = 5 }: { label?: string; rows?: number }) {
  const { t } = useTranslation();
  return (
    <div className="w-full" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label ?? t('app.common.loading')}</span>
      <div className="divide-y divide-background-100">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-start gap-3 px-1 py-3">
            <SkeletonBar className="h-9 w-9 rounded-full shrink-0" />
            <div className="min-w-0 flex-1">
              <SkeletonBar className="h-3 w-2/5" />
              <SkeletonBar className="h-2.5 w-1/4 mt-2" />
            </div>
            <SkeletonBar className="h-3 w-14 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ label, icon = 'ri-inbox-line' }: { label?: string; icon?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <span className="w-11 h-11 rounded-full bg-background-100 text-foreground-400 flex items-center justify-center">
        <i className={`${icon} text-xl`} />
      </span>
      <p className="text-sm text-foreground-500 mt-3">{label ?? t('app.common.noData')}</p>
    </div>
  );
}

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: { key: string; label: string; count?: number }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 p-1 bg-background-100 border border-background-200 rounded-full flex-wrap">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
            value === item.key
              ? 'bg-primary-500 text-background-50'
              : 'text-foreground-700 hover:bg-background-200'
          }`}
        >
          {item.label}
          {typeof item.count === 'number' ? <span className="ms-1.5 opacity-70 tabular-nums">{item.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="relative w-full sm:w-64">
      <span className="absolute inset-y-0 start-3 flex items-center text-foreground-400">
        <i className="ri-search-line text-sm" />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('app.common.searchPlaceholder')}
        className="w-full box-border bg-background-50 border border-background-300 rounded-md ps-9 pe-3 py-2 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
      />
    </div>
  );
}

export function Th({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={`text-start text-[11px] font-semibold uppercase tracking-wide text-foreground-500 px-4 py-2.5 whitespace-nowrap ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-sm text-foreground-800 align-middle ${className}`}>{children}</td>;
}

export function TableWrap({
  children,
  minWidth = 640,
  className = '',
}: {
  children: ReactNode;
  minWidth?: number;
  className?: string;
}) {
  return (
    <div className={`-mx-0 overflow-x-auto overscroll-x-contain ${className}`}>
      <table className="w-full border-collapse" style={{ minWidth: `${minWidth}px` }}>
        {children}
      </table>
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <tr className="border-b border-background-100 last:border-b-0 hover:bg-background-100/60">{children}</tr>;
}

/** Compact percentage bar used by attendance, collection and evaluation tables. */
export function ProgressRow({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
  const bar = clamped >= 80 ? 'bg-secondary-500' : clamped >= 50 ? 'bg-accent-500' : 'bg-primary-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-background-200 overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.max(3, clamped)}%` }} />
      </div>
      <span className="w-9 text-end text-[11px] font-semibold text-foreground-800 tabular-nums">{clamped}%</span>
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  const initial = (name || '?').trim().charAt(0);
  return (
    <span className="w-8 h-8 rounded-full bg-accent-500 text-foreground-950 text-xs font-bold flex items-center justify-center shrink-0">
      {initial}
    </span>
  );
}