import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import { createExam } from '@/api/college';

const TYPES = ['quiz', 'midterm', 'final', 'practical'] as const;

const typeKey: Record<string, string> = {
  quiz: 'app.exams.typeQuiz',
  midterm: 'app.exams.typeMidterm',
  final: 'app.exams.typeFinal',
  practical: 'app.exams.typePractical',
};

export default function ExamModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [examType, setExamType] = useState<string>('midterm');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createExam({
        name,
        examType: examType as 'quiz' | 'midterm' | 'final' | 'practical',
        startsOn: startsOn || null,
        endsOn: endsOn || null,
        notes,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.exams.examTitle')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="exam-name">
            {t('app.exams.name')}
          </label>
          <input
            id="exam-name"
            name="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="exam-type">
            {t('app.exams.type')}
          </label>
          <select
            id="exam-type"
            name="examType"
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            className={inputClass}
          >
            {TYPES.map((type) => (
              <option key={type} value={type}>
                {t(typeKey[type])}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="exam-start">
              {t('app.exams.startsOn')}
            </label>
            <input
              id="exam-start"
              name="startsOn"
              type="date"
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="exam-end">
              {t('app.exams.endsOn')}
            </label>
            <input
              id="exam-end"
              name="endsOn"
              type="date"
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="exam-notes">
            {t('app.common.notes')} <span className="font-normal text-foreground-500">({t('app.common.optional')})</span>
          </label>
          <textarea
            id="exam-notes"
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
            {busy ? t('app.common.saving') : t('app.exams.createExam')}
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