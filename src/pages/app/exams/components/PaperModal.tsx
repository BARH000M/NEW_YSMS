import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import { createExamPaper } from '@/api/college';
import type { Section, Subject } from '@/api/types';

export default function PaperModal({
  examId,
  examName,
  subjects,
  sections,
  onClose,
  onSaved,
}: {
  examId: string;
  examName: string;
  subjects: Subject[];
  sections: Section[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const [sectionId, setSectionId] = useState('');
  const [examDate, setExamDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [maxMarks, setMaxMarks] = useState('100');
  const [passMarks, setPassMarks] = useState('50');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!subjectId) return;
    setBusy(true);
    setError(null);
    try {
      await createExamPaper({
        examId,
        subjectId,
        sectionId: sectionId || null,
        examDate: examDate || null,
        startTime: startTime || null,
        durationMinutes: Number(duration) || 60,
        maxMarks: Number(maxMarks) || 100,
        passMarks: Number(passMarks) || 50,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.exams.paperTitle')} subtitle={examName} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="paper-subject">
            {t('app.exams.subject')}
          </label>
          <select
            id="paper-subject"
            name="subjectId"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className={inputClass}
            required
          >
            <option value="">{t('app.common.unknown')}</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
                {subject.code ? ` · ${subject.code}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="paper-section">
            {t('app.exams.section')} <span className="font-normal text-foreground-500">({t('app.common.optional')})</span>
          </label>
          <select
            id="paper-section"
            name="sectionId"
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className={inputClass}
          >
            <option value="">{t('app.common.all')}</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
                {section.room ? ` · ${section.room}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="paper-date">
              {t('app.exams.paperDate')}
            </label>
            <input
              id="paper-date"
              name="examDate"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="paper-time">
              {t('app.exams.startTime')}
            </label>
            <input
              id="paper-time"
              name="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="paper-duration">
              {t('app.exams.duration')}
            </label>
            <input
              id="paper-duration"
              name="durationMinutes"
              type="number"
              min="10"
              step="5"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="paper-max">
              {t('app.exams.maxMarks')}
            </label>
            <input
              id="paper-max"
              name="maxMarks"
              type="number"
              min="1"
              value={maxMarks}
              onChange={(e) => setMaxMarks(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="paper-pass">
              {t('app.exams.passMarks')}
            </label>
            <input
              id="paper-pass"
              name="passMarks"
              type="number"
              min="0"
              value={passMarks}
              onChange={(e) => setPassMarks(e.target.value)}
              className={inputClass}
            />
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
            {busy ? t('app.common.saving') : t('app.exams.createPaper')}
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