import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchExamResults,
  fetchExamSubjects,
  fetchExams,
  fetchSections,
  fetchSubjects,
} from '@/api/college';
import type { Exam } from '@/api/types';
import { formatDate } from '@/utils/date';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Row,
  StatCard,
  StatusPill,
  TableWrap,
  Td,
  Th,
} from '@/components/app/ui';
import ExamModal from './components/ExamModal';
import PaperModal from './components/PaperModal';

const WRITE_ROLES = ['super_admin', 'admin', 'teacher'];

const typeKey: Record<string, string> = {
  quiz: 'app.exams.typeQuiz',
  midterm: 'app.exams.typeMidterm',
  final: 'app.exams.typeFinal',
  practical: 'app.exams.typePractical',
};

export default function ExamsPage() {
  const { t, i18n } = useTranslation();
  const { role } = useAuth();
  const canWrite = role ? WRITE_ROLES.includes(role) : false;

  const [expanded, setExpanded] = useState<string | null>(null);
  const [examOpen, setExamOpen] = useState(false);
  const [paperFor, setPaperFor] = useState<Exam | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const state = useAsync(async () => {
    const [exams, papers, results, subjects, sections] = await Promise.all([
      fetchExams(),
      fetchExamSubjects(),
      fetchExamResults(),
      fetchSubjects(),
      fetchSections(),
    ]);
    return { exams, papers, results, subjects, sections };
  }, []);

  const resultCountByPaper = useMemo(() => {
    const map = new Map<string, number>();
    (state.data?.results ?? []).forEach((result) => {
      map.set(result.exam_subject_id, (map.get(result.exam_subject_id) ?? 0) + 1);
    });
    return map;
  }, [state.data]);

  if (state.loading) return <LoadingBlock />;
  if (state.error || !state.data) {
    return <ErrorState message={state.error ?? t('app.common.errorDesc')} onRetry={state.reload} />;
  }

  const { exams, papers, results, subjects, sections } = state.data;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = exams.filter((exam) => (exam.starts_on ?? '') >= today).length;

  return (
    <>
      <PageHeader
        title={t('app.exams.title')}
        subtitle={t('app.exams.subtitle')}
        action={
          canWrite ? (
            <>
              <Link
                to="/app/exams/marks"
                className="inline-flex items-center gap-1.5 border border-background-300 hover:border-primary-400 text-foreground-800 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
              >
                <i className="ri-edit-2-line" />
                {t('app.marks.enterMarks')}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setNotice(null);
                  setExamOpen(true);
                }}
                className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
              >
                <i className="ri-add-line" />
                {t('app.exams.newExam')}
              </button>
            </>
          ) : null
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.exams.examsCount')} value={exams.length} icon="ri-draft-line" tone="primary" />
        <StatCard label={t('app.exams.papers')} value={papers.length} icon="ri-file-text-line" tone="secondary" />
        <StatCard label={t('app.exams.results')} value={results.length} icon="ri-bar-chart-box-line" tone="accent" />
        <StatCard label={t('app.exams.upcoming')} value={upcoming} icon="ri-calendar-check-line" tone="neutral" />
      </div>

      {notice && (
        <div className="mb-3 rounded-md border border-secondary-200 bg-secondary-100 px-3 py-2 text-xs text-secondary-900">
          {notice}
        </div>
      )}

      {exams.length === 0 ? (
        <Card>
          <EmptyState icon="ri-draft-line" />
        </Card>
      ) : (
        <div className="flex flex-col gap-3 md:gap-4">
          {exams.map((exam) => {
            const examPapers = papers.filter((paper) => paper.exam_id === exam.id);
            const paperResults = examPapers.reduce(
              (sum, paper) => sum + (resultCountByPaper.get(paper.id) ?? 0),
              0,
            );
            const isOpen = expanded === exam.id;

            return (
              <Card key={exam.id}>
                <div className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-semibold text-foreground-950">{exam.name}</h2>
                      <Badge tone="neutral">{t(typeKey[exam.exam_type] ?? 'app.exams.typeMidterm')}</Badge>
                      <StatusPill value={exam.status} />
                    </div>
                    <p className="text-[11px] text-foreground-500 mt-1.5">
                      {exam.starts_on ? formatDate(exam.starts_on, i18n.language) : '—'}
                      {' → '}
                      {exam.ends_on ? formatDate(exam.ends_on, i18n.language) : '—'}
                      {' · '}
                      {examPapers.length} {t('app.exams.papers')}
                      {' · '}
                      {paperResults} {t('app.exams.results')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canWrite && (
                      <button
                        type="button"
                        onClick={() => {
                          setNotice(null);
                          setPaperFor(exam);
                        }}
                        className="inline-flex items-center gap-1 border border-background-300 hover:border-primary-400 text-foreground-800 text-[11px] font-semibold px-2.5 py-1.5 rounded-md whitespace-nowrap cursor-pointer"
                      >
                        <i className="ri-add-line" />
                        {t('app.exams.addPaper')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : exam.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
                    >
                      <i className={isOpen ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} />
                      {isOpen ? t('app.exams.hide') : t('app.exams.details')}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-background-200">
                    {examPapers.length === 0 ? (
                      <EmptyState label={t('app.exams.noPapers')} icon="ri-file-text-line" />
                    ) : (
                      <TableWrap>
                        <thead className="bg-background-100 border-b border-background-200">
                          <tr>
                            <Th>{t('app.exams.subject')}</Th>
                            <Th>{t('app.exams.section')}</Th>
                            <Th>{t('app.exams.paperDate')}</Th>
                            <Th>{t('app.exams.maxMarks')}</Th>
                            <Th>{t('app.exams.passMarks')}</Th>
                            <Th>{t('app.exams.results')}</Th>
                            <Th className="text-end">{t('app.common.actions')}</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {examPapers.map((paper) => (
                            <Row key={paper.id}>
                              <Td>
                                <p className="text-sm font-medium text-foreground-950 truncate max-w-[200px]">
                                  {paper.subjects?.name ?? '—'}
                                </p>
                                <p className="text-[11px] text-foreground-500">{paper.subjects?.name_ar ?? ''}</p>
                              </Td>
                              <Td className="text-xs">{paper.sections?.name ?? t('app.common.all')}</Td>
                              <Td className="text-xs whitespace-nowrap">
                                {paper.exam_date ? formatDate(paper.exam_date, i18n.language) : '—'}
                                {paper.start_time ? (
                                  <span className="block text-[11px] text-foreground-500" dir="ltr">
                                    {paper.start_time.slice(0, 5)}
                                  </span>
                                ) : null}
                              </Td>
                              <Td className="text-xs tabular-nums">{Number(paper.max_marks)}</Td>
                              <Td className="text-xs tabular-nums">{Number(paper.pass_marks)}</Td>
                              <Td className="text-xs tabular-nums">{resultCountByPaper.get(paper.id) ?? 0}</Td>
                              <Td className="text-end">
                                {canWrite ? (
                                  <Link
                                    to={`/app/exams/marks?paper=${paper.id}`}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
                                  >
                                    <i className="ri-edit-2-line" />
                                    {t('app.marks.enterMarks')}
                                  </Link>
                                ) : (
                                  <span className="text-xs text-foreground-400">—</span>
                                )}
                              </Td>
                            </Row>
                          ))}
                        </tbody>
                      </TableWrap>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {examOpen && (
        <ExamModal
          onClose={() => setExamOpen(false)}
          onSaved={() => {
            setExamOpen(false);
            setNotice(t('app.exams.examSaved'));
            state.reload();
          }}
        />
      )}

      {paperFor && (
        <PaperModal
          examId={paperFor.id}
          examName={paperFor.name}
          subjects={subjects}
          sections={sections}
          onClose={() => setPaperFor(null)}
          onSaved={() => {
            setPaperFor(null);
            setNotice(t('app.exams.paperSaved'));
            state.reload();
          }}
        />
      )}
    </>
  );
}