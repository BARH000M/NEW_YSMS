import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import { assignRole } from '@/api/roles';
import type { AccessStaff, AccessUser } from '@/api/roles';
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

export default function RoleModal({
  user,
  staff,
  canGrantSuperAdmin,
  onClose,
  onSaved,
}: {
  user: AccessUser | null;
  staff: AccessStaff[];
  canGrantSuperAdmin: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState<string>(user?.role ?? 'teacher');
  const [isActive, setIsActive] = useState(user ? user.isActive : true);
  const [staffId, setStaffId] = useState(user?.staffId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const choices = canGrantSuperAdmin ? (['super_admin', ...ROLE_CHOICES] as AppRole[]) : ROLE_CHOICES;

  /** Free staff records, plus whichever one is linked to this account already. */
  const staffOptions = useMemo(
    () =>
      staff
        .filter((member) => !member.profileId || member.profileId === user?.userId || member.id === user?.staffId)
        .sort((a, b) => (a.staffNo ?? '').localeCompare(b.staffNo ?? '')),
    [staff, user],
  );

  const showStaffPicker = role === 'teacher' || role === 'admin';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError(t('app.roles.emailRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await assignRole(trimmed, role as AppRole, isActive, role === 'teacher' ? staffId : null);
      onSaved(t('app.roles.saved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={user ? t('app.roles.editTitle') : t('app.roles.assignTitle')}
      subtitle={t('app.roles.modalHint')}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="role-email">
            {t('app.common.email')}
          </label>
          <input
            id="role-email"
            name="email"
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={Boolean(user)}
            className={`${inputClass} ${user ? 'bg-background-100 text-foreground-600' : ''}`}
            required
          />
          <p className="text-[11px] text-foreground-500">{t('app.roles.emailHint')}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="role-role">
            {t('app.roles.role')}
          </label>
          <select
            id="role-role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={inputClass}
          >
            {choices.map((item) => (
              <option key={item} value={item}>
                {t(`app.role.${item}`)}
              </option>
            ))}
          </select>
        </div>

        {showStaffPicker && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="role-staff">
              {t('app.roles.staffLink')}
            </label>
            <select
              id="role-staff"
              name="staffId"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className={inputClass}
            >
              <option value="">{t('app.roles.staffNone')}</option>
              {staffOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName}
                  {member.staffNo ? ` · ${member.staffNo}` : ''}
                  {member.designation ? ` · ${member.designation}` : ''}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-foreground-500">{t('app.roles.staffHint')}</p>
            {staffOptions.length === 0 ? (
              <p className="text-[11px] text-accent-950 bg-accent-100 border border-accent-300 rounded-md px-2.5 py-2">
                {t('app.roles.staffEmpty')}
              </p>
            ) : null}
          </div>
        )}

        <label
          htmlFor="role-active"
          className="flex items-start gap-2.5 rounded-md border border-background-300 bg-background-100 px-3 py-2.5 cursor-pointer"
        >
          <input
            id="role-active"
            name="isActive"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-primary-500 cursor-pointer"
          />
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-foreground-900">{t('app.roles.activeLabel')}</span>
            <span className="block text-[11px] text-foreground-500">{t('app.roles.activeHint')}</span>
          </span>
        </label>

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
            {busy ? t('app.common.saving') : t('app.roles.saveRole')}
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