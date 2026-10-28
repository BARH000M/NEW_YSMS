import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import {
  deleteEnrollment,
  fetchAcademicYears,
  fetchClasses,
  fetchEnrollments,
  fetchExamResults,
  fetchExamSubjects,
  fetchExams,
  fetchSections,
  fetchTerms,
} from '@/api/college';
import type { EnrollmentRow, StudentRow } from '@/api/college';
import { buildTranscript } from '@/utils/transcript';
import { Card, EmptyState, ErrorState, LoadingBlock } from '@/components/app/ui';
import EnrollmentModal from './EnrollmentModal';
import TranscriptCard from './TranscriptCard';

export default function EnrollmentHistory({
  student,
  canWrite,
}: {
  student: StudentRow;
  canWrite: boolean;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<EnrollmentRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const state = useAsync(async () => {
    const [enrollments, years, classes, sections, exams, terms, examSubjects, results] = await Promise.all([
      fetchEnrollments(student.id),
      fetchAcademicYears(),
      fetchClasses(),
      fetchSections(),
      fetchExams(),
      fetchTerms(),
      fetchExamSubjects(),
      fetchExamResults(),
    ]);
    return { enrollments, years, classes, sections, exams, terms, examSubjects, results };
  }, [student.id]);

  const transcript = useMemo(() => {
    if (!state.data) return [];
    return buildTranscript({
      enrollments: state.data.enrollments,
      results: state.data.results,
      exams: state.data.exams,
      terms: state.data.terms,
      examSubjects: state.data.examSubjects,
      studentId: student.id,
    });
  }, [state.data, student.id]);

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  const years = state.data?.years ?? [];
  const usedYearIds = (state.data?.enrollments ?? []).map((row) => row.academic_year_id);

  const handleDelete = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await deleteEnrollment(id);
      setConfirmId(null);
      state.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xs font-semibold text-foreground-900">{t('app.enroll.title')}</h3>
          <p className="text-[11px] text-foreground-500 mt-0.5">{t('app.enroll.subtitle')}</p>
        </div>
        {canWrite ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setCreating(true);
            }}
            className="inline-flex items-center gap-1 bg-primary-500 hover:bg-primary-600 text-background-50 text-[11px] font-semibold px-3 py-2 rounded-md whitespace-nowrap cursor-pointer shrink-0"
          >
            <i className="ri-calendar-2-line" />
            {t('app.enroll.add')}
          </button>
        ) : null}
      </div>

      {error && (
        <p className="text-xs text-primary-900 bg-primary-100 border border-primary-200 rounded-md px-3 py-2 break-words">
          {error}
        </p>
      )}

      {transcript.length === 0 ? (
        <Card>
          <EmptyState icon="ri-history-line" label={t('app.enroll.empty')} />
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {transcript.map((year) => (
            <div key={year.enrollment.id}>
              <TranscriptCard
                year={year}
                canWrite={canWrite}
                busy={busy}
                onEdit={() => {
                  setError(null);
                  setEditing(year.enrollment);
                }}
                onDelete={() => setConfirmId(year.enrollment.id)}
              />
              {confirmId === year.enrollment.id ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border border-primary-200 bg-primary-100 px-3 py-2 mt-1.5">
                  <p className="text-[11px] text-primary-900 flex-1">{t('app.enroll.confirmDelete')}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDelete(year.enrollment.id)}
                      className="text-[11px] font-semibold text-background-50 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 px-2.5 py-1.5 rounded-md whitespace-nowrap cursor-pointer"
                    >
                      {busy ? t('app.common.saving') : t('app.enroll.delete')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="text-[11px] font-semibold text-foreground-700 border border-background-300 px-2.5 py-1.5 rounded-md whitespace-nowrap cursor-pointer"
                    >
                      {t('app.common.cancel')}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <EnrollmentModal
          studentId={student.id}
          institutionId={student.institution_id}
          years={years}
          classes={state.data?.classes ?? []}
          sections={state.data?.sections ?? []}
          usedYearIds={usedYearIds}
          existing={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            state.reload();
          }}
        />
      )}
    </div>
  );
}