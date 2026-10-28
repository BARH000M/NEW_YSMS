import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import { ENTITY_DEFAULT_ROLE, linkAccount, provisionAccount } from '@/api/accountLinks';
import type { LinkAccount, LinkEntity, LinkRecord } from '@/api/accountLinks';
import type { AppRole } from '@/api/types';

const ROLE_CHOICES: AppRole[] = [
  'admin',
  'teacher',
  'accountant',
  'receptionist',
  'librarian',
  'student',
  'parent',
];

export default function LinkAccountModal({
  entity,
  record,
  accounts,
  onClose,
  onSaved,
}: {
  entity: LinkEntity;
  record: LinkRecord;
  accounts: LinkAccount[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState(record.name);
  const [role, setRole] = useState<AppRole>(ENTITY_DEFAULT_ROLE[entity]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [temp, setTemp] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const linkable = useMemo(
    () => accounts.filter((account) => account.email).sort((a, b) => a.email.localeCompare(b.email)),
    [accounts],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) {
      setError(t('app.links.emailRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === 'existing') {
        await linkAccount({ entity, recordId: record.id, email: value, role });
        onSaved(t('app.links.linked'));
        return;
      }
      const result = await provisionAccount({
        entity,
        recordId: record.id,
        email: value,
        fullName: fullName.trim() || record.name,
        role,
      });
      if (result.tempPassword) {
        setTemp({ email: value, password: result.tempPassword });
      } else {
        onSaved(t('app.links.created'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  const copyPassword = async () => {
    if (!temp) return;
    try {
      await navigator.clipboard.writeText(`${temp.email} / ${temp.password}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  if (temp) {
    return (
      <Modal title={t('app.links.createdTitle')} subtitle={t('app.links.createdHint')} onClose={onClose}>
        <div className="flex flex-col gap-3">
          <div className="rounded-md border border-secondary-200 bg-secondary-100 px-3 py-2.5">
            <p className="text-[11px] font-semibold text-secondary-900">{t('app.common.email')}</p>
            <p className="text-sm text-foreground-950 break-all" dir="ltr">
              {temp.email}
            </p>
          </div>
          <div className="rounded-md border border-background-300 bg-background-100 px-3 py-2.5">
            <p className="text-[11px] font-semibold text-foreground-700">{t('app.links.tempPassword')}</p>
            <p className="text-sm font-semibold text-foreground-950 break-all tabular-nums" dir="ltr">
              {temp.password}
            </p>
          </div>
          <p className="text-[11px] text-foreground-600 leading-relaxed">{t('app.links.passwordHint')}</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => void copyPassword()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 border border-background-300 text-foreground-800 text-xs font-semibold px-4 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className={copied ? 'ri-check-line' : 'ri-file-copy-line'} />
              {copied ? t('app.links.copied') : t('app.links.copy')}
            </button>
            <button
              type="button"
              onClick={() => onSaved(t('app.links.created'))}
              className="flex-1 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-4 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              {t('app.common.close')}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={t('app.links.modalTitle')}
      subtitle={`${record.name}${record.code ? ` · ${record.code}` : ''}`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="inline-flex items-center gap-1 p-1 bg-background-100 border border-background-200 rounded-full self-start">
          {(['existing', 'new'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                mode === item ? 'bg-primary-500 text-background-50' : 'text-foreground-700 hover:bg-background-200'
              }`}
            >
              {item === 'existing' ? t('app.links.modeExisting') : t('app.links.modeNew')}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="link-email">
            {t('app.common.email')}
          </label>
          <input
            id="link-email"
            name="email"
            type="email"
            dir="ltr"
            list={mode === 'existing' ? 'link-email-options' : undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            required
          />
          {mode === 'existing' ? (
            <>
              <datalist id="link-email-options">
                {linkable.map((account) => (
                  <option key={account.userId} value={account.email} />
                ))}
              </datalist>
              <p className="text-[11px] text-foreground-500">{t('app.links.existingHint')}</p>
            </>
          ) : (
            <p className="text-[11px] text-foreground-500">{t('app.links.newHint')}</p>
          )}
        </div>

        {mode === 'new' ? (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="link-name">
              {t('app.common.name')}
            </label>
            <input
              id="link-name"
              name="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="link-role">
            {t('app.roles.role')}
          </label>
          <select
            id="link-role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as AppRole)}
            className={inputClass}
          >
            {ROLE_CHOICES.map((item) => (
              <option key={item} value={item}>
                {t(`app.role.${item}`)}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-foreground-500">{t('app.links.roleHint')}</p>
        </div>

        {error && (
          <p className="text-xs text-primary-900 bg-primary-100 border border-primary-200 rounded-md px-3 py-2 break-words">
            {error}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="submit"
            disabled={busy}
            className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-4 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
          >
            {busy ? t('app.common.saving') : mode === 'existing' ? t('app.links.link') : t('app.links.create')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-background-300 text-foreground-800 text-xs font-semibold px-4 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
          >
            {t('app.common.cancel')}
          </button>
        </div>
      </form>
    </Modal>
  );
}