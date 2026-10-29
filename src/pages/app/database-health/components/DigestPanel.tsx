import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DigestSettings } from '@/api/healthReview';
import { Card } from '@/components/app/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Weekly digest settings. The schedule itself is honoured by the backend
 * function; this card is where admins say who gets it and when, and where they
 * can fire one immediately to prove delivery works.
 */
export default function DigestPanel({
  settings,
  saving,
  sending,
  onSave,
  onSendNow,
}: {
  settings: DigestSettings;
  saving: boolean;
  sending: boolean;
  onSave: (next: DigestSettings) => Promise<void>;
  onSendNow: (recipients: string[]) => Promise<string>;
}) {
  const { t, i18n } = useTranslation();
  const [draft, setDraft] = useState<DigestSettings>(settings);
  const [rawRecipients, setRawRecipients] = useState(settings.recipients.join(', '));
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setDraft(settings);
    setRawRecipients(settings.recipients.join(', '));
  }, [settings]);

  const parsedRecipients = rawRecipients
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

  const invalid = parsedRecipients.filter((item) => !EMAIL_RE.test(item));

  const stamp = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(iso),
      );
    } catch {
      return new Date(iso).toLocaleString();
    }
  };

  const handleSave = async () => {
    setStatus(null);
    if (invalid.length > 0) {
      setStatus({ tone: 'error', text: t('app.health.digestInvalidEmail', { email: invalid[0] }) });
      return;
    }
    const next: DigestSettings = { ...draft, recipients: parsedRecipients };
    try {
      await onSave(next);
      setStatus({ tone: 'ok', text: t('app.health.digestSaved') });
    } catch (error) {
      setStatus({ tone: 'error', text: error instanceof Error ? error.message : String(error) });
    }
  };

  const handleSend = async () => {
    setStatus(null);
    if (parsedRecipients.length === 0) {
      setStatus({ tone: 'error', text: t('app.health.digestNoRecipients') });
      return;
    }
    try {
      const message = await onSendNow(parsedRecipients);
      setStatus({ tone: 'ok', text: message });
    } catch (error) {
      setStatus({
        tone: 'error',
        text: `${t('app.health.digestFailed')} — ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  return (
    <Card className="mb-3 md:mb-4">
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 md:px-5 py-3 border-b border-background-200">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground-900 inline-flex items-center gap-1.5">
            <i className="ri-mail-send-line text-accent-500" />
            {t('app.health.digestTitle')}
          </h2>
          <p className="text-[11px] text-foreground-600 mt-1 break-words">{t('app.health.digestSubtitle')}</p>
        </div>
        <div className="text-end shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-500">
            {t('app.health.digestLastSentLabel')}
          </p>
          <p className="text-[11px] text-foreground-800">
            {draft.lastSentAt ? stamp(draft.lastSentAt) : t('app.health.digestNeverSent')}
          </p>
        </div>
      </div>

      <div className="p-4 md:p-5 grid grid-cols-1 lg:grid-cols-5 gap-3 md:gap-4">
        <div className="lg:col-span-2 min-w-0">
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-foreground-500 mb-1">
            {t('app.health.digestRecipients')}
          </label>
          <input
            type="text"
            value={rawRecipients}
            onChange={(event) => setRawRecipients(event.target.value)}
            placeholder={t('app.health.digestRecipientsPlaceholder')}
            className="w-full box-border bg-background-50 border border-background-300 rounded-md px-2.5 py-2 text-xs text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
          />
          <p className="mt-1 text-[10px] text-foreground-500 leading-relaxed">
            {t('app.health.digestRecipientsHint')}
          </p>
        </div>

        <div className="min-w-0">
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-foreground-500 mb-1">
            {t('app.health.digestDay')}
          </label>
          <select
            value={draft.weekday}
            onChange={(event) => setDraft({ ...draft, weekday: Number(event.target.value) })}
            className="w-full box-border bg-background-50 border border-background-300 rounded-md px-2.5 py-2 text-xs text-foreground-900 focus:outline-none focus:ring-2 focus:ring-primary-400 cursor-pointer"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <option key={day} value={day}>
                {t(`app.health.weekday.${day}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0">
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-foreground-500 mb-1">
            {t('app.health.digestHour')}
          </label>
          <select
            value={draft.hourUtc}
            onChange={(event) => setDraft({ ...draft, hourUtc: Number(event.target.value) })}
            className="w-full box-border bg-background-50 border border-background-300 rounded-md px-2.5 py-2 text-xs text-foreground-900 focus:outline-none focus:ring-2 focus:ring-primary-400 cursor-pointer"
          >
            {Array.from({ length: 24 }, (_, hour) => hour).map((hour) => (
              <option key={hour} value={hour}>
                {`${String(hour).padStart(2, '0')}:00 UTC`}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-foreground-500 mb-1">
            {t('app.health.digestEnabled')}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={draft.enabled}
            onClick={() => setDraft({ ...draft, enabled: !draft.enabled })}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
              draft.enabled
                ? 'bg-secondary-500 border-secondary-500 text-background-50'
                : 'bg-background-50 border-background-300 text-foreground-700'
            }`}
          >
            <i className={draft.enabled ? 'ri-toggle-fill' : 'ri-toggle-line'} />
            {draft.enabled ? t('app.health.digestOn') : t('app.health.digestOff')}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-background-200 bg-background-100/50 px-4 md:px-5 py-3">
        <p className="text-[10px] text-foreground-500 leading-relaxed max-w-xl">
          {t('app.health.digestEmailNote')}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {status ? (
            <span
              className={`text-[11px] font-semibold me-1 ${
                status.tone === 'ok' ? 'text-secondary-700' : 'text-primary-700'
              }`}
            >
              {status.text}
            </span>
          ) : null}
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-1 border border-background-300 hover:border-primary-400 disabled:opacity-60 text-foreground-800 text-[11px] font-semibold px-3 py-2 rounded-md whitespace-nowrap cursor-pointer"
          >
            <i className={saving ? 'ri-loader-4-line animate-spin' : 'ri-save-line'} />
            {saving ? t('app.common.saving') : t('app.health.digestSave')}
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={() => void handleSend()}
            className="inline-flex items-center gap-1 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-[11px] font-semibold px-3 py-2 rounded-md whitespace-nowrap cursor-pointer"
          >
            <i className={sending ? 'ri-loader-4-line animate-spin' : 'ri-send-plane-line'} />
            {sending ? t('app.health.digestSending') : t('app.health.digestSendNow')}
          </button>
        </div>
      </div>
    </Card>
  );
}