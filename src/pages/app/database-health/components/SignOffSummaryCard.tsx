import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { HealthReviewEvent } from '@/api/healthReview';
import { Card } from '@/components/app/ui';

interface PersonRow {
  name: string;
  signedOff: number;
  reopened: number;
  lastAt: string;
}

/**
 * "Who cleared what this month" — a small leaderboard built only from the
 * sign-off history, so it needs no extra storage and stays honest even after a
 * check was reopened again.
 */
export default function SignOffSummaryCard({ events }: { events: HealthReviewEvent[] }) {
  const { t, i18n } = useTranslation();

  const monthLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(
        new Date(),
      );
    } catch {
      return new Date().toLocaleDateString();
    }
  }, [i18n.language]);

  const rows = useMemo<PersonRow[]>(() => {
    const now = new Date();
    const bucket = new Map<string, PersonRow>();

    events.forEach((event) => {
      const at = new Date(event.at);
      if (Number.isNaN(at.getTime())) return;
      if (event.action === 'cleared') return;
      // Only the current calendar month, in the viewer's own timezone.
      if (at.getFullYear() !== now.getFullYear() || at.getMonth() !== now.getMonth()) return;

      const name = event.byName ?? t('app.health.unknownReviewer');
      const row = bucket.get(name) ?? { name, signedOff: 0, reopened: 0, lastAt: event.at };
      if (event.action === 'reopened') row.reopened += 1;
      else row.signedOff += 1;
      if (event.at > row.lastAt) row.lastAt = event.at;
      bucket.set(name, row);
    });

    return Array.from(bucket.values()).sort(
      (a, b) => b.signedOff - a.signedOff || a.name.localeCompare(b.name),
    );
  }, [events, t]);

  const total = rows.reduce((sum, row) => sum + row.signedOff, 0);
  const top = rows.length > 0 ? Math.max(rows[0].signedOff, 1) : 1;

  const stamp = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(iso));
    } catch {
      return new Date(iso).toLocaleDateString();
    }
  };

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');

  return (
    <Card className="mt-3 md:mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 md:px-5 py-3 border-b border-background-200">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground-900 inline-flex items-center gap-1.5">
            <i className="ri-team-line text-secondary-600" />
            {t('app.health.summaryMonthTitle')}
          </h2>
          <p className="text-[11px] text-foreground-500 mt-0.5">
            {t('app.health.summaryMonthHint', { month: monthLabel })}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 bg-secondary-100 text-secondary-900 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
          <i className="ri-check-double-line" />
          {t('app.health.summaryMonthTotal', { count: total })}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 md:px-5 py-6 text-xs text-foreground-500 text-center">
          {t('app.health.summaryMonthEmpty')}
        </p>
      ) : (
        <ul className="divide-y divide-background-100">
          {rows.map((row) => (
            <li key={row.name} className="px-4 md:px-5 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-7 h-7 rounded-full bg-background-200 text-foreground-800 text-[10px] font-semibold flex items-center justify-center shrink-0">
                    {initials(row.name) || '?'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground-900 truncate">{row.name}</p>
                    <p className="text-[10px] text-foreground-500">
                      {t('app.health.summaryMonthLatest', { date: stamp(row.lastAt) })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {row.reopened > 0 ? (
                    <span className="inline-flex items-center gap-1 bg-accent-100 text-accent-950 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                      <i className="ri-arrow-go-back-line" />
                      {t('app.health.summaryMonthReopened', { count: row.reopened })}
                    </span>
                  ) : null}
                  <span className="font-heading text-sm tabular-nums text-foreground-950 whitespace-nowrap">
                    {row.signedOff}
                    <span className="text-[10px] font-sans font-normal text-foreground-500 ms-1">
                      {t('app.health.summaryMonthChecks')}
                    </span>
                  </span>
                </div>
              </div>
              <div className="mt-1.5 h-1 w-full rounded-full bg-background-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-secondary-500"
                  style={{ width: `${Math.max(6, Math.round((row.signedOff / top) * 100))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}