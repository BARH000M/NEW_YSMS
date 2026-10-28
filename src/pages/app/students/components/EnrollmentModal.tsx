import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import { saveEnrollment } from '@/api/college';
import type { EnrollmentRow } from '@/api/college';
import type { AcademicYear, EnrollmentStatus, SchoolClass, Section } from '@/api/types';

const STATUSES: EnrollmentStatus[] = [
  'enrolled',
  'promoted',
  'repeated',
  'transferred',
  'graduated',
  'withdrawn',
];

export default function EnrollmentModal({
  studentId,
  institutionId,
  years,
  classes,
  sections,
  usedYearIds,
  existing,
  onClose,
  onSaved,
}: {
  studentId: string;
  institutionId: string;
  years: AcademicYear[];
  classes: SchoolClass[];
  sections: Section[];
  usedYearIds: string[];
  existing: EnrollmentRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [academicYearId, setAcademicYearId] = useState(existing?.academic_year_id ?? '');
  const [classId, setClassId] = useState(existing?.class_id ?? '');
  const [sectionId, setSectionId] = useState(existing?.section_id ?? '');
  const [status, setStatus] = useState<EnrollmentStatus>(existing?.status ?? 'enrolled');
  const [rollNo, setRollNo] = useState(existing?.roll_no ? String(existing.roll_no) : '');
  const [startedOn, setStartedOn] = useState(existing?.started_on ?? '');
  const [endedOn, setEndedOn] = useState(existing?.ended_on ?? '');
  const [result, setResult] = useState(existing?.result ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const yearOptions = useMemo(
    () => years.filter((year) => !usedYearIds.includes(year.id) || year.id === existing?.academic_year_id),
    [years, usedYearIds, existing],
  );

  const sectionOptions = useMemo(
    () => sections.filter((section) => !classId || section.class_id === classId),
    [sections, classId],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!academicYearId) {
      setError(t('app.enroll.needYear'));
      return;
    }
    const chosenSection = sections.find((section) => section.id === sectionId) ?? null;
    setBusy(true);
    setError(null);
    try {
      await saveEnrollment({
        studentId,
        institutionId,
        academicYearId,
        classId: classId || chosenSection?.class_id || null,
        sectionId: sectionId || null,
        rollNo: rollNo ? Number(rollNo) : null,
        status,
        startedOn: startedOn || null,
        endedOn: endedOn || null,
        result: result || null,
        notes: notes || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={existing ? t('app.enroll.editTitle') : t('app.enroll.newTitle')}
      subtitle={t('app.enroll.hint')}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="en-year">
            {t('app.enroll.year')}
          </label>
          <select
            id="en-year"
            name="academicYearId"
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
            className={inputClass}
            required
          >
            <option value="">—</option>
            {yearOptions.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
                {year.is_current ? ` · ${t('app.enroll.current')}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="en-class">
              {t('app.students.classCol')}
            </label>
            <select
              id="en-class"
              name="classId"
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSectionId('');
              }}
              className={inputClass}
            >
              <option value="">—</option>
              {classes.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="en-section">
              {t('app.students.sectionCol')}
            </label>
            <select
              id="en-section"
              name="sectionId"
              value={sectionId}
              onChange={(e) => {
                setSectionId(e.target.value);
                const found = sections.find((section) => section.id === e.target.value);
                if (found) setClassId(found.class_id);
              }}
              className={inputClass}
            >
              <option value="">—</option>
              {sectionOptions.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="en-status">
              {t('app.common.status')}
            </label>
            <select
              id="en-status"
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as EnrollmentStatus)}
              className={inputClass}
            >
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {t(`app.enroll.status.${item}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="en-roll">
              {t('app.enroll.rollNo')}
            </label>
            <input
              id="en-roll"
              name="rollNo"
              type="number"
              min="1"
              value={rollNo}
              onChange={(e) => setRollNo(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="en-start">
              {t('app.enroll.startedOn')}
            </label>
            <input
              id="en-start"
              name="startedOn"
              type="date"
              value={startedOn}
              onChange={(e) => setStartedOn(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="en-end">
              {t('app.enroll.endedOn')}
            </label>
            <input
              id="en-end"
              name="endedOn"
              type="date"
              value={endedOn}
              onChange={(e) => setEndedOn(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="en-result">
            {t('app.enroll.result')}
          </label>
          <input
            id="en-result"
            name="result"
            type="text"
            value={result}
            onChange={(e) => setResult(e.target.value)}
            className={inputClass}
            maxLength={120}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="en-notes">
            {t('app.enroll.notes')}
          </label>
          <textarea
            id="en-notes"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={500}
            className={inputClass}
          />
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
            {busy ? t('app.common.saving') : t('app.enroll.save')}
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