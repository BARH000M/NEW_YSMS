import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import { createAdmission } from '@/api/college';

const SOURCES = ['walk_in', 'phone', 'website', 'referral'] as const;

const sourceKey: Record<string, string> = {
  walk_in: 'app.adm.walk_in',
  phone: 'app.adm.phoneSrc',
  website: 'app.adm.website',
  referral: 'app.adm.referral',
};

export default function NewAdmissionModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [applicantName, setApplicantName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [program, setProgram] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [preferredSchedule, setPreferredSchedule] = useState('');
  const [source, setSource] = useState<string>('walk_in');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!applicantName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createAdmission({
        applicantName,
        phone,
        email,
        program,
        educationLevel,
        preferredSchedule,
        source: source as 'website' | 'walk_in' | 'phone' | 'referral',
        notes,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.adm.formTitle')} subtitle={t('app.adm.autoRef')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="adm-name">
            {t('app.adm.applicant')}
          </label>
          <input
            id="adm-name"
            name="applicantName"
            type="text"
            value={applicantName}
            onChange={(e) => setApplicantName(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="adm-phone">
              {t('app.common.phone')}
            </label>
            <input
              id="adm-phone"
              name="phone"
              type="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="adm-email">
              {t('app.common.email')}
            </label>
            <input
              id="adm-email"
              name="email"
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="adm-program">
              {t('app.adm.program')}
            </label>
            <input
              id="adm-program"
              name="program"
              type="text"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="adm-education">
              {t('app.adm.education')}
            </label>
            <input
              id="adm-education"
              name="educationLevel"
              type="text"
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="adm-schedule">
              {t('app.adm.schedule')}
            </label>
            <input
              id="adm-schedule"
              name="preferredSchedule"
              type="text"
              value={preferredSchedule}
              onChange={(e) => setPreferredSchedule(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="adm-source">
              {t('app.adm.source')}
            </label>
            <select
              id="adm-source"
              name="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className={inputClass}
            >
              {SOURCES.map((item) => (
                <option key={item} value={item}>
                  {t(sourceKey[item])}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="adm-notes">
            {t('app.common.notes')} <span className="font-normal text-foreground-500">({t('app.common.optional')})</span>
          </label>
          <textarea
            id="adm-notes"
            name="notes"
            rows={3}
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`${inputClass} resize-none`}
          />
        </div>

        {error && (
          <p className="text-xs text-primary-900 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">{error}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="submit"
            disabled={busy}
            className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-4 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
          >
            {busy ? t('app.common.saving') : t('app.adm.createAdmission')}
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