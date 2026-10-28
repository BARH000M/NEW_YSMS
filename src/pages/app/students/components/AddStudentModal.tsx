import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import { createStudent } from '@/api/college';
import type { SchoolClass, Section } from '@/api/types';

const RELATIONS = ['father', 'mother', 'guardian', 'other'] as const;

export default function AddStudentModal({
  classes,
  sections,
  onClose,
  onSaved,
}: {
  classes: SchoolClass[];
  sections: Section[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstNameAr, setFirstNameAr] = useState('');
  const [lastNameAr, setLastNameAr] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [nationality, setNationality] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianRelation, setGuardianRelation] = useState<string>('father');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const classById = new Map(classes.map((klass) => [klass.id, klass.name]));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firstName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createStudent({
        firstName,
        lastName,
        firstNameAr,
        lastNameAr,
        gender: gender === 'male' || gender === 'female' ? gender : null,
        dob: dob || null,
        nationality,
        sectionId: sectionId || null,
        guardianName,
        guardianPhone,
        guardianRelation: guardianRelation as 'father' | 'mother' | 'guardian' | 'other',
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.students.formTitle')} subtitle={t('app.students.autoNo')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="stu-first">
              {t('app.students.firstName')}
            </label>
            <input
              id="stu-first"
              name="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="stu-last">
              {t('app.students.lastName')}
            </label>
            <input
              id="stu-last"
              name="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="stu-first-ar">
              {t('app.students.firstNameAr')}
            </label>
            <input
              id="stu-first-ar"
              name="firstNameAr"
              type="text"
              dir="rtl"
              value={firstNameAr}
              onChange={(e) => setFirstNameAr(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="stu-last-ar">
              {t('app.students.lastNameAr')}
            </label>
            <input
              id="stu-last-ar"
              name="lastNameAr"
              type="text"
              dir="rtl"
              value={lastNameAr}
              onChange={(e) => setLastNameAr(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="stu-gender">
              {t('app.students.gender')}
            </label>
            <select
              id="stu-gender"
              name="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="male">{t('app.status.male')}</option>
              <option value="female">{t('app.status.female')}</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="stu-dob">
              {t('app.students.dob')}
            </label>
            <input
              id="stu-dob"
              name="dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="stu-nationality">
              {t('app.students.nationality')}
            </label>
            <input
              id="stu-nationality"
              name="nationality"
              type="text"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="stu-section">
            {t('app.students.sectionCol')}
          </label>
          <select
            id="stu-section"
            name="sectionId"
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className={inputClass}
          >
            <option value="">{t('app.common.unknown')}</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {classById.get(section.class_id) ?? ''} / {section.name}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-md border border-background-200 bg-background-100 p-3">
          <p className="text-[11px] font-semibold text-foreground-800 mb-2.5">{t('app.students.guardianCol')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className={labelClass} htmlFor="stu-guardian">
                {t('app.students.guardianName')}
              </label>
              <input
                id="stu-guardian"
                name="guardianName"
                type="text"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className={labelClass} htmlFor="stu-guardian-phone">
                {t('app.students.guardianPhone')}
              </label>
              <input
                id="stu-guardian-phone"
                name="guardianPhone"
                type="tel"
                dir="ltr"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 mt-3">
            <label className={labelClass} htmlFor="stu-relation">
              {t('app.students.guardianRelation')}
            </label>
            <select
              id="stu-relation"
              name="guardianRelation"
              value={guardianRelation}
              onChange={(e) => setGuardianRelation(e.target.value)}
              className={inputClass}
            >
              {RELATIONS.map((relation) => (
                <option key={relation} value={relation}>
                  {t(`app.status.${relation}`)}
                </option>
              ))}
            </select>
          </div>
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
            {busy ? t('app.common.saving') : t('app.students.createStudent')}
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