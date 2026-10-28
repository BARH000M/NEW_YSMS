import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import type { SiblingRow, StudentExtras } from '@/api/campusOps';
import { createSibling, deleteSibling, saveStudentExtras } from '@/api/campusOps';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className={labelClass}>{label}</span>
      {children}
    </div>
  );
}

export default function StudentExtrasModal({
  studentId,
  studentName,
  extras,
  siblings,
  onClose,
  onSaved,
}: {
  studentId: string;
  studentName: string;
  extras: StudentExtras | null;
  siblings: SiblingRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'profile' | 'siblings'>('profile');
  const [form, setForm] = useState({
    caste: extras?.caste ?? '',
    religion: extras?.religion ?? '',
    rte: extras?.rte ?? false,
    skill_ability: extras?.skill_ability ?? '',
    mother_tongue: extras?.mother_tongue ?? '',
    national_id: extras?.national_id ?? '',
    father_name: extras?.father_name ?? '',
    mother_name: extras?.mother_name ?? '',
    guardian_occupation: extras?.guardian_occupation ?? '',
    prev_school_name: extras?.prev_school_name ?? '',
    prev_school_class: extras?.prev_school_class ?? '',
    prev_school_tc_no: extras?.prev_school_tc_no ?? '',
  });
  const [sibling, setSibling] = useState({ siblingName: '', relation: 'brother', className: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownSiblings = siblings.filter((row) => row.student_id === studentId);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await saveStudentExtras({ student_id: studentId, ...form });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
      setBusy(false);
    }
  };

  const addSibling = async () => {
    if (!sibling.siblingName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createSibling({ studentId, ...sibling });
      setSibling({ siblingName: '', relation: 'brother', className: '' });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={studentName} subtitle={t('app.categories.editProfile')} onClose={onClose}>
      <div className="flex items-center gap-1 p-1 bg-background-100 border border-background-200 rounded-full mb-3 w-fit">
        {(['profile', 'siblings'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer ${
              tab === key ? 'bg-primary-500 text-background-50' : 'text-foreground-700 hover:bg-background-200'
            }`}
          >
            {key === 'profile' ? t('app.categories.profileTab') : t('app.categories.siblingsTab')}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <form onSubmit={saveProfile} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('app.categories.caste')}>
              <input className={inputClass} value={form.caste} onChange={(e) => setForm({ ...form, caste: e.target.value })} />
            </Field>
            <Field label={t('app.categories.religion')}>
              <input
                className={inputClass}
                value={form.religion}
                onChange={(e) => setForm({ ...form, religion: e.target.value })}
              />
            </Field>
            <Field label={t('app.categories.skill')}>
              <input
                className={inputClass}
                value={form.skill_ability}
                onChange={(e) => setForm({ ...form, skill_ability: e.target.value })}
                placeholder="Football, robotics…"
              />
            </Field>
            <Field label={t('app.categories.motherTongue')}>
              <input
                className={inputClass}
                value={form.mother_tongue}
                onChange={(e) => setForm({ ...form, mother_tongue: e.target.value })}
              />
            </Field>
            <Field label={t('app.categories.nationalId')}>
              <input
                className={inputClass}
                dir="ltr"
                value={form.national_id}
                onChange={(e) => setForm({ ...form, national_id: e.target.value })}
              />
            </Field>
            <Field label={t('app.categories.guardianOccupation')}>
              <input
                className={inputClass}
                value={form.guardian_occupation}
                onChange={(e) => setForm({ ...form, guardian_occupation: e.target.value })}
              />
            </Field>
            <Field label={t('app.categories.fatherName')}>
              <input
                className={inputClass}
                value={form.father_name}
                onChange={(e) => setForm({ ...form, father_name: e.target.value })}
              />
            </Field>
            <Field label={t('app.categories.motherName')}>
              <input
                className={inputClass}
                value={form.mother_name}
                onChange={(e) => setForm({ ...form, mother_name: e.target.value })}
              />
            </Field>
          </div>

          <div className="rounded-md border border-background-200 bg-background-100 p-3">
            <p className="text-[11px] font-semibold text-foreground-800 mb-2.5">{t('app.categories.previousSchool')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label={t('app.categories.schoolName')}>
                <input
                  className={inputClass}
                  value={form.prev_school_name}
                  onChange={(e) => setForm({ ...form, prev_school_name: e.target.value })}
                />
              </Field>
              <Field label={t('app.categories.lastClass')}>
                <input
                  className={inputClass}
                  value={form.prev_school_class}
                  onChange={(e) => setForm({ ...form, prev_school_class: e.target.value })}
                />
              </Field>
              <Field label={t('app.categories.tcNo')}>
                <input
                  className={inputClass}
                  dir="ltr"
                  value={form.prev_school_tc_no}
                  onChange={(e) => setForm({ ...form, prev_school_tc_no: e.target.value })}
                />
              </Field>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-foreground-800 cursor-pointer">
            <input
              type="checkbox"
              checked={form.rte}
              onChange={(e) => setForm({ ...form, rte: e.target.checked })}
              className="w-4 h-4 accent-primary-500 cursor-pointer"
            />
            {t('app.categories.rte')}
          </label>

          {error && (
            <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">{error}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-4 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              {busy ? t('app.common.saving') : t('app.common.save')}
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
      )}

      {tab === 'siblings' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            {ownSiblings.length === 0 && <p className="text-xs text-foreground-500">{t('app.categories.noSiblings')}</p>}
            {ownSiblings.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-2 rounded-md border border-background-200 bg-background-50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground-900 truncate">{row.sibling_name}</p>
                  <p className="text-[11px] text-foreground-500">
                    {row.relation ?? '—'}
                    {row.class_name ? ` · ${row.class_name}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteSibling(row.id);
                    onSaved();
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-md border border-background-300 text-foreground-600 hover:border-primary-400 cursor-pointer"
                  aria-label={t('app.common.delete')}
                >
                  <i className="ri-delete-bin-line" />
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-background-200 bg-background-100 p-3 flex flex-col gap-3">
            <Field label={t('app.categories.siblingName')}>
              <input
                className={inputClass}
                value={sibling.siblingName}
                onChange={(e) => setSibling({ ...sibling, siblingName: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t('app.categories.relation')}>
                <select
                  className={inputClass}
                  value={sibling.relation}
                  onChange={(e) => setSibling({ ...sibling, relation: e.target.value })}
                >
                  <option value="brother">{t('app.categories.brother')}</option>
                  <option value="sister">{t('app.categories.sister')}</option>
                  <option value="other">{t('app.common.unknown')}</option>
                </select>
              </Field>
              <Field label={t('app.categories.className')}>
                <input
                  className={inputClass}
                  value={sibling.className}
                  onChange={(e) => setSibling({ ...sibling, className: e.target.value })}
                />
              </Field>
            </div>
            {error && (
              <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">{error}</p>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void addSibling()}
              className="inline-flex items-center justify-center gap-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-4 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-add-line" />
              {t('app.categories.addSibling')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}