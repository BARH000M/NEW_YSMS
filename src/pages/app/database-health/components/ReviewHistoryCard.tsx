import { useTranslation } from 'react-i18next';
import type { HealthReviewEvent } from '@/api/healthReview';
import { Badge, Card } from '@/components/app/ui';

/**
 * Every sign-off ever recorded, newest first. The cards still show the latest
 * state of each check; this panel is the audit trail behind them — including
 * sign-offs that were later cleared.
 */
export default function ReviewHistoryCard({
  events,
  limit = 8,
}: {
  events: HealthReviewEvent[];
  limit?: number;
}) {
  const { t, i18n } = useTranslation();

  const stamp = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(i18n.language, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso));
    } catch {
      return new Date(iso).toLocaleString();
    }
  };

  const recent = events.slice(0, limit);

  return (
    <Card className="mt-3 md:mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 md:px-5 py-3 border-b border-background-200">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground-900">{t('app.health.historyTitle')}</h2>
          <p className="text-[11px] text-foreground-500 mt-0.5">{t('app.health.historyHint')}</p>
        </div>
        <Badge tone="secondary">
          <i className="ri-history-line" />
          {t('app.health.historyTotal', { count: events.length })}
        </Badge>
      </div>

      {recent.length === 0 ? (
        <p className="px-4 md:px-5 py-6 text-xs text-foreground-500 text-center">
          {t('app.health.historyEmpty')}
        </p>
      ) : (
        <ol className="divide-y divide-background-100">
          {recent.map((event) => (
            <li key={event.id} className="flex flex-wrap items-start justify-between gap-2 px-4 md:px-5 py-2.5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-foreground-900 flex flex-wrap items-center gap-1.5">
                  <Badge
                    tone={
                      event.action === 'reopened'
                        ? 'primary'
                        : event.action === 'cleared'
                          ? 'accent'
                          : 'secondary'
                    }
                  >
                    {event.action === 'reopened'
                      ? t('app.health.historyReopened')
                      : event.action === 'cleared'
                        ? t('app.health.historyCleared')
                        : t('app.health.historySignedOff')}
                  </Badge>
                  <span className="break-words">{t(`app.health.check.${event.checkKey}`)}</span>
                </p>
                <p className="text-[10px] text-foreground-600 mt-0.5 break-words">
                  {event.byName
                    ? t('app.health.reviewedBy', { name: event.byName })
                    : t('app.health.unknownReviewer')}
                  {event.note ? ` — “${event.note}”` : ''}
                </p>
              </div>
              <span className="text-[10px] text-foreground-500 tabular-nums whitespace-nowrap shrink-0">
                {stamp(event.at)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}