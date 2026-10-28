import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import { sendMessage } from '@/api/messaging';
import type { MessageAudience } from '@/api/messaging';
import type { AppRole } from '@/api/types';

const AUDIENCES: Exclude<MessageAudience, 'user'>[] = ['all', 'staff', 'teachers', 'students', 'parents'];

/**
 * Compose sheet. Audience targeting is the only routing the reference console
 * needs: admin → teacher, student or parent — plus everyone and all staff.
 */
export default function ComposeMessageModal({
  senderName,
  senderRole,
  onClose,
  onSent,
}: {
  senderName: string;
  senderRole: AppRole | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const { t } = useTranslation();
  const [audience, setAudience] = useState<Exclude<MessageAudience, 'user'>>('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!subject.trim()) {
      setError(t('app.messages.subjectRequired'));
      return;
    }
    if (!body.trim()) {
      setError(t('app.messages.bodyRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendMessage({
        subject,
        body,
        audience,
        senderName,
        senderRole,
      });
      onSent();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.messages.compose')} subtitle={t('app.messages.composeHint')} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5 min-w-0">
          <label className={labelClass} htmlFor="msg-audience">
            {t('app.messages.audienceLabel')}
          </label>
          <select
            id="msg-audience"
            value={audience}
            onChange={(event) => setAudience(event.target.value as Exclude<MessageAudience, 'user'>)}
            className={inputClass}
          >
            {AUDIENCES.map((value) => (
              <option key={value} value={value}>
                {t(`app.messages.audience.${value}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="msg-subject">
            {t('app.messages.subject')}
          </label>
          <input
            id="msg-subject"
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className={inputClass}
            maxLength={140}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="msg-body">
            {t('app.messages.message')}
          </label>
          <textarea
            id="msg-body"
            rows={6}
            maxLength={1200}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className={inputClass}
          />
          <p className="text-[11px] text-foreground-500 tabular-nums text-end">{body.length} / 1200</p>
        </div>

        {error && (
          <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2.5 rounded-md border border-background-300 text-xs font-semibold text-foreground-700 whitespace-nowrap cursor-pointer"
          >
            {t('app.common.cancel')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold whitespace-nowrap cursor-pointer"
          >
            <i className="ri-send-plane-line" />
            {busy ? t('app.common.saving') : t('app.messages.send')}
          </button>
        </div>
      </div>
    </Modal>
  );
}