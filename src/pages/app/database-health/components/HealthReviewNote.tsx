import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HealthReviewEvent, HealthReviewRecord } from '@/api/healthReview';

/**
 * Sign-off strip for one check. It never touches school data — it records that
 * a person looked at this finding and dealt with it, so the next admin does not
 * re-investigate the same rows.
 *
 * Signing off is one half of the loop; reopening is the other. A reopened check
 * goes back to outstanding and the reason is appended to the history, so a
 * problem that came back never silently looks solved.
 */
export default function HealthReviewNote({
  review,
  events,
  hasFindings,
  saving,
  onSave,
  onReopen,
}: {
  review?: HealthReviewRecord;
  events: HealthReviewEvent[];
  hasFindings: boolean;
  saving: boolean;
  onSave: (note: string) => Promise<void>;
  onReopen: (reason: string) => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [note, setNote] = useState(review?.note ?? '');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(false);

  const stamp = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(iso));
    } catch {
      return new Date(iso).toLocaleDateString();
    }
  };

  const stampExact = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(i18n.language, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso));
    } catch {
      return new Date(iso).toLocaleString();
    }
  };

  const submit = async () => {
    await onSave(note);
    setOpen(false);
  };

  const submitReopen = async () => {
    if (!reason.trim()) {
      setReasonError(true);
      return;
    }
    setReasonError(false);
    await onReopen(reason);
    setReason('');
    setReopenOpen(false);
  };

  const actionLabel = (action: HealthReviewEvent['action']) => {
    if (action === 'reopened') return t('app.health.historyReopened');
    if (action === 'cleared') return t('app.health.historyCleared');
    return t('app.health.historySignedOff');
  };

  const actionDot = (action: HealthReviewEvent['action']) => {
    if (action === 'reopened') return 'bg-primary-500';
    if (action === 'cleared') return 'bg-accent-500';
    return 'bg-secondary-500';
  };

  if (!review && !hasFindings) return null;

  return (
    <div className="border-t border-background-200 bg-background-100/40 px-3 md:px-4 py-2">
      {review ? (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-secondary-700">
              <i className="ri-verified-badge-line text-[13px]" />
              {t('app.health.reviewedBadge')}
              <span className="font-normal text-foreground-600">
                {review.reviewedByName
                  ? t('app.health.reviewedBy', { name: review.reviewedByName })
                  : ''}{' '}
                {t('app.health.reviewedOn', { date: stamp(review.reviewedAt) })}
              </span>
            </p>
            {review.note ? (
              <p className="mt-1 text-[11px] leading-relaxed text-foreground-700 break-words">
                “{review.note}”
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setNote(review.note ?? '');
                setOpen((value) => !value);
                setReopenOpen(false);
              }}
              className="inline-flex items-center gap-1 border border-background-300 hover:border-primary-400 text-foreground-800 text-[11px] font-semibold px-2.5 py-1.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-edit-line" />
              {t('app.health.editReview')}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setReopenOpen((value) => !value);
                setOpen(false);
                setReasonError(false);
              }}
              aria-expanded={reopenOpen}
              className="inline-flex items-center gap-1 border border-background-300 hover:border-primary-400 disabled:opacity-50 text-foreground-700 text-[11px] font-semibold px-2.5 py-1.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-arrow-go-back-line" />
              {t('app.health.reopen')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen((value) => !value);
            setReopenOpen(false);
          }}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground-700 hover:text-primary-700 cursor-pointer"
        >
          <i className="ri-checkbox-circle-line text-[13px]" />
          {t('app.health.markReviewed')}
        </button>
      )}

      {open ? (
        <div className="mt-2">
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-foreground-500 mb-1">
            {t('app.health.reviewNote')}
          </label>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, 500))}
            rows={2}
            placeholder={t('app.health.reviewPlaceholder')}
            className="w-full box-border bg-background-50 border border-background-300 rounded-md px-2.5 py-2 text-xs text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
          />
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] text-foreground-500">{t('app.health.reviewHint')}</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[11px] font-semibold text-foreground-600 px-2 py-1 rounded-md cursor-pointer hover:bg-background-200 whitespace-nowrap"
              >
                {t('app.common.cancel')}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void submit()}
                className="inline-flex items-center gap-1 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-[11px] font-semibold px-3 py-1.5 rounded-md whitespace-nowrap cursor-pointer"
              >
                <i className={saving ? 'ri-loader-4-line animate-spin' : 'ri-check-line'} />
                {saving ? t('app.common.saving') : t('app.health.saveReview')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {reopenOpen ? (
        <div className="mt-2 rounded-md border border-accent-300 bg-accent-100/50 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-accent-950 mb-1">
            {t('app.health.reopenTitle')}
          </p>
          <textarea
            value={reason}
            onChange={(event) => {
              setReason(event.target.value.slice(0, 500));
              if (reasonError) setReasonError(false);
            }}
            rows={2}
            placeholder={t('app.health.reopenPlaceholder')}
            className={`w-full box-border bg-background-50 border rounded-md px-2.5 py-2 text-xs text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 ${
              reasonError ? 'border-primary-500' : 'border-background-300'
            }`}
          />
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
            <span
              className={`text-[10px] leading-relaxed ${
                reasonError ? 'text-primary-700' : 'text-foreground-600'
              }`}
            >
              {reasonError ? t('app.health.reopenNeedReason') : t('app.health.reopenHint')}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setReopenOpen(false);
                  setReason('');
                  setReasonError(false);
                }}
                className="text-[11px] font-semibold text-foreground-600 px-2 py-1 rounded-md cursor-pointer hover:bg-background-200 whitespace-nowrap"
              >
                {t('app.common.cancel')}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void submitReopen()}
                className="inline-flex items-center gap-1 bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-background-50 text-[11px] font-semibold px-3 py-1.5 rounded-md whitespace-nowrap cursor-pointer"
              >
                <i className={saving ? 'ri-loader-4-line animate-spin' : 'ri-arrow-go-back-line'} />
                {saving ? t('app.common.saving') : t('app.health.reopenConfirm')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {events.length > 0 ? (
        <div className="mt-1.5">
          <button
            type="button"
            onClick={() => setHistoryOpen((value) => !value)}
            aria-expanded={historyOpen}
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-secondary-800 hover:text-primary-700 cursor-pointer"
          >
            <i className={historyOpen ? 'ri-arrow-up-s-line' : 'ri-history-line'} />
            {historyOpen
              ? t('app.health.historyHide')
              : t('app.health.history', { count: events.length })}
          </button>

          {historyOpen ? (
            <ol className="mt-2 space-y-1.5 border-s border-background-300 ps-3">
              {events.map((event) => (
                <li key={event.id} className="relative">
                  <span
                    className={`absolute -start-[17px] top-1.5 w-2 h-2 rounded-full ${actionDot(
                      event.action,
                    )}`}
                  />
                  <p className="text-[10px] font-semibold text-foreground-900 flex flex-wrap items-center gap-1.5">
                    <span>{actionLabel(event.action)}</span>
                    <span className="font-normal text-foreground-600">
                      {event.byName
                        ? t('app.health.reviewedBy', { name: event.byName })
                        : t('app.health.unknownReviewer')}
                    </span>
                    <span className="font-normal text-foreground-500 tabular-nums">
                      {stampExact(event.at)}
                    </span>
                    {typeof event.findingCount === 'number' ? (
                      <span className="font-normal text-foreground-500">
                        · {t('app.health.historyFindings', { count: event.findingCount })}
                      </span>
                    ) : null}
                  </p>
                  {event.note ? (
                    <p className="text-[10px] leading-relaxed text-foreground-600 break-words">
                      “{event.note}”
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}