import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchClassSubjects,
  fetchExamResults,
  fetchExamSubjects,
  fetchExams,
  fetchStaff,
  fetchStudents,
  saveExamResults,
} from '@/api/college';
import { gradeFor, percentageOf } from '@/utils/grades';
import { downloadCsv, fileSlug, todayStamp } from '@/utils/csv';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Row,
  SearchBox,
  StatCard,
  TableWrap,
  Td,
  Th,
} from '@/components/app/ui';

const WRITE_ROLES = ['super_admin', 'admin', 'teacher'];

interface DraftEntry {
  marks: string;
  remarks: string;
}

export default function MarksEntryPage() {
  const { t } = useTranslation();
  const { role, user } = useAuth();
  const canWrite = role ? WRITE_ROLES.includes(role) : false;
  const [params] = useSearchParams();
  const presetPaper = params.get('paper') ?? '';

  const [examId, setExamId] = useState('');
  const [paperId, setPaperId] = useState(presetPaper);
  const [draft, setDraft] = useState<Record<string, DraftEntry>>({});
  const [sectionFilter, setSectionFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const state = useAsync(async () => {
    const [exams, papers, students, results, staff, assignments] = await Promise.all([
      fetchExams(),
      fetchExamSubjects(),
      fetchStudents(),
      fetchExamResults(),
      fetchStaff(),
      fetchClassSubjects(),
    ]);
    return { exams, papers, students, results, staff, assignments };
  }, []);

  const exams = state.data?.exams ?? [];
  const papers = state.data?.papers ?? [];
  const students = state.data?.students ?? [];
  const results = state.data?.results ?? [];
  const staff = state.data?.staff ?? [];
  const assignments = state.data?.assignments ?? [];

  // First load: honour a ?paper= link, otherwise pick the newest exam's first paper.
  useEffect(() => {
    if (!state.data) return;
    const { papers: allPapers } = state.data;
    const stillValid = paperId && allPapers.some((paper) => paper.id === paperId);
    if (stillValid) return;
    const fallback = allPapers.find((paper) => paper.exam_id === examId) ?? allPapers[0];
    if (fallback) {
      setPaperId(fallback.id);
      setExamId(fallback.exam_id);
    }
  }, [state.data, paperId, examId]);

  // Keep the exam selector in sync with the chosen paper.
  useEffect(() => {
    if (!paperId) return;
    const paper = papers.find((item) => item.id === paperId);
    if (paper && paper.exam_id !== examId) setExamId(paper.exam_id);
  }, [paperId, papers, examId]);

  const selectedPaper = useMemo(
    () => papers.find((paper) => paper.id === paperId) ?? null,
    [papers, paperId],
  );

  const examPapers = useMemo(
    () => papers.filter((paper) => paper.exam_id === examId),
    [papers, examId],
  );

  /** The staff record linked to the signed-in account, when there is one. */
  const myStaff = useMemo(
    () => (user ? staff.find((member) => member.profile_id === user.id) ?? null : null),
    [staff, user],
  );

  /** Sections this teacher is assigned to for the selected paper's subject. */
  const mySectionIds = useMemo(() => {
    if (role !== 'teacher' || !selectedPaper || !myStaff) return new Set<string>();
    return new Set(
      assignments
        .filter(
          (assignment) =>
            assignment.teacher_id === myStaff.id && assignment.subject_id === selectedPaper.subject_id,
        )
        .map((assignment) => assignment.section_id),
    );
  }, [role, selectedPaper, myStaff, assignments]);

  /** True when the grid is narrowed to the teacher's own class-subject sections. */
  const scopedToTeacher = mySectionIds.size > 0;

  /** Everyone sitting this paper, before the optional section/search narrowing. */
  const basePool = useMemo(() => {
    if (!selectedPaper) return [];
    return selectedPaper.section_id
      ? students.filter((student) => student.section_id === selectedPaper.section_id)
      : students;
  }, [selectedPaper, students]);

  const sectionOptions = useMemo(() => {
    const map = new Map<string, string>();
    basePool.forEach((student) => {
      if (!student.section_id || map.has(student.section_id)) return;
      if (scopedToTeacher && !mySectionIds.has(student.section_id)) return;
      const className = student.sections?.classes?.name ?? '';
      const sectionName = student.sections?.name ?? '';
      map.set(student.section_id, className ? `${className} / ${sectionName}` : sectionName);
    });
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [basePool, scopedToTeacher, mySectionIds]);

  const paperPool = useMemo(() => {
    if (sectionFilter === 'all') return basePool;
    if (sectionFilter === 'mine') {
      return basePool.filter((student) => student.section_id && mySectionIds.has(student.section_id));
    }
    return basePool.filter((student) => student.section_id === sectionFilter);
  }, [basePool, sectionFilter, mySectionIds]);

  const paperStudents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return paperPool;
    return paperPool.filter((student) => {
      const name = `${student.first_name} ${student.last_name ?? ''} ${student.first_name_ar ?? ''}`.toLowerCase();
      return name.includes(needle) || (student.student_no ?? '').toLowerCase().includes(needle);
    });
  }, [paperPool, query]);

  // Teachers land on their own sections; everyone else keeps the full roster.
  useEffect(() => {
    if (!selectedPaper) return;
    setSectionFilter(scopedToTeacher ? 'mine' : 'all');
  }, [selectedPaper?.id, scopedToTeacher]);

  // Seed the grid from saved results whenever the paper (or refreshed data) changes.
  useEffect(() => {
    if (!selectedPaper) return;
    const next: Record<string, DraftEntry> = {};
    basePool.forEach((student) => {
      const existing = results.find(
        (result) => result.exam_subject_id === selectedPaper.id && result.student_id === student.id,
      );
      next[student.id] = {
        marks: existing ? String(Number(existing.marks_obtained)) : '',
        remarks: existing?.remarks ?? '',
      };
    });
    setDraft(next);
    setError(null);
    setNotice(null);
  }, [selectedPaper?.id, basePool, results]);

  const maxMarks = Number(selectedPaper?.max_marks ?? 0);

  /** Only the students currently in view count towards the entered/average stats. */
  const enteredEntries = useMemo(
    () =>
      paperPool
        .map((student) => ({ studentId: student.id, entry: draft[student.id] }))
        .filter((item): item is { studentId: string; entry: DraftEntry } => (item.entry?.marks ?? '').trim() !== ''),
    [paperPool, draft],
  );

  const average = useMemo(() => {
    if (!selectedPaper || enteredEntries.length === 0) return 0;
    const total = enteredEntries.reduce((sum, item) => {
      const value = Number(item.entry.marks);
      return sum + (Number.isFinite(value) ? percentageOf(value, maxMarks) : 0);
    }, 0);
    return Math.round((total / enteredEntries.length) * 10) / 10;
  }, [enteredEntries, selectedPaper, maxMarks]);

  const updateEntry = (studentId: string, patch: Partial<DraftEntry>) => {
    setDraft((current) => ({
      ...current,
      [studentId]: { ...(current[studentId] ?? { marks: '', remarks: '' }), ...patch },
    }));
    setNotice(null);
  };

  const handleSave = async () => {
    if (!selectedPaper) return;
    setError(null);
    setNotice(null);

    const rows: Parameters<typeof saveExamResults>[0] = [];
    for (const [studentId, entry] of Object.entries(draft)) {
      if (entry.marks.trim() === '') continue;
      const value = Number(entry.marks);
      if (!Number.isFinite(value) || value < 0 || value > maxMarks) {
        setError(t('app.marks.invalid'));
        return;
      }
      rows.push({
        examId: selectedPaper.exam_id,
        examSubjectId: selectedPaper.id,
        studentId,
        marksObtained: value,
        grade: gradeFor(percentageOf(value, maxMarks)),
        remarks: entry.remarks,
      });
    }

    if (rows.length === 0) {
      setError(t('app.marks.empty'));
      return;
    }

    setBusy(true);
    try {
      await saveExamResults(rows);
      setNotice(t('app.marks.saved'));
      state.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  /**
   * Offline copy of exactly what is on screen: the students currently in view,
   * their saved/entered marks, percentage and grade.
   */
  const handleExport = () => {
    if (!selectedPaper) return;
    const rows: (string | number | null)[][] = [
      [
        t('app.common.name'),
        t('app.students.studentNo'),
        t('app.reports.class'),
        t('app.reports.section'),
        t('app.marks.marks'),
        t('app.marks.max'),
        t('app.marks.percentage'),
        t('app.marks.grade'),
        t('app.marks.remarks'),
      ],
    ];

    paperStudents.forEach((student) => {
      const entry = draft[student.id] ?? { marks: '', remarks: '' };
      const value = Number(entry.marks);
      const hasValue = entry.marks.trim() !== '' && Number.isFinite(value);
      const percentage = hasValue ? percentageOf(value, maxMarks) : null;
      rows.push([
        `${student.first_name} ${student.last_name ?? ''}`.trim(),
        student.student_no ?? '',
        student.sections?.classes?.name ?? '',
        student.sections?.name ?? '',
        hasValue ? value : '',
        maxMarks,
        percentage === null ? '' : `${percentage}%`,
        percentage === null ? '' : gradeFor(percentage),
        entry.remarks ?? '',
      ]);
    });

    const paperName = selectedPaper.subjects?.name ?? t('app.marks.paper');
    downloadCsv(`${fileSlug(paperName)}-marks-${todayStamp()}.csv`, rows);
    setNotice(t('app.marks.exported'));
  };

  if (state.loading) return <LoadingBlock />;
  if (state.error || !state.data) {
    return <ErrorState message={state.error ?? t('app.common.errorDesc')} onRetry={state.reload} />;
  }

  return (
    <>
      <div className="mb-4">
        <Link
          to="/app/exams"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground-600 hover:text-primary-700 cursor-pointer"
        >
          <i className="ri-arrow-left-line" />
          {t('app.exams.title')}
        </Link>
      </div>

      <PageHeader
        title={t('app.marks.title')}
        subtitle={t('app.marks.subtitle')}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={!selectedPaper || paperStudents.length === 0}
              className="inline-flex items-center gap-1.5 border border-background-300 hover:border-primary-400 disabled:opacity-60 text-foreground-800 text-xs font-semibold px-3 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-download-2-line" />
              {t('app.marks.exportCsv')}
            </button>
            {canWrite ? (
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={busy || !selectedPaper}
                className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
              >
                <i className="ri-save-3-line" />
                {busy ? t('app.common.saving') : t('app.marks.save')}
              </button>
            ) : null}
          </div>
        }
      />

      {scopedToTeacher && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-accent-300 bg-accent-100 px-3 py-2 text-xs text-accent-950">
          <span className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
            <i className="ri-user-star-line" />
          </span>
          <span>{t('app.marks.teacherScope')}</span>
        </div>
      )}

      {!canWrite && (
        <div className="mb-3 rounded-md border border-secondary-200 bg-secondary-100 px-3 py-2 text-xs text-secondary-900">
          {t('app.marks.readOnly')}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard
          label={t('app.marks.students')}
          value={paperPool.length}
          icon="ri-group-line"
          tone="primary"
        />
        <StatCard
          label={t('app.marks.entered')}
          value={`${enteredEntries.length} / ${paperPool.length}`}
          icon="ri-checkbox-circle-line"
          tone="secondary"
        />
        <StatCard label={t('app.marks.average')} value={`${average}%`} icon="ri-bar-chart-line" tone="accent" />
        <StatCard
          label={t('app.exams.maxMarks')}
          value={selectedPaper ? Number(selectedPaper.max_marks) : '—'}
          icon="ri-hashtag"
          tone="neutral"
          hint={selectedPaper ? `${t('app.exams.passMarks')}: ${Number(selectedPaper.pass_marks)}` : undefined}
        />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="marks-exam">
              {t('app.marks.exam')}
            </label>
            <select
              id="marks-exam"
              value={examId}
              onChange={(event) => {
                const nextExam = event.target.value;
                setExamId(nextExam);
                const first = papers.find((paper) => paper.exam_id === nextExam);
                setPaperId(first?.id ?? '');
                setSectionFilter('all');
                setQuery('');
              }}
              className={inputClass}
            >
              {exams.length === 0 && <option value="">{t('app.common.noData')}</option>}
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="marks-paper">
              {t('app.marks.paper')}
            </label>
            <select
              id="marks-paper"
              value={paperId}
              onChange={(event) => {
                setPaperId(event.target.value);
                setSectionFilter('all');
                setQuery('');
              }}
              className={inputClass}
              disabled={examPapers.length === 0}
            >
              {examPapers.length === 0 && <option value="">{t('app.exams.noPapers')}</option>}
              {examPapers.map((paper) => (
                <option key={paper.id} value={paper.id}>
                  {paper.subjects?.name ?? '—'}
                  {paper.sections?.name ? ` · ${paper.sections.name}` : ''}
                  {paper.exam_date ? ` · ${paper.exam_date}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="marks-section">
              {t('app.reports.section')}
            </label>
            <select
              id="marks-section"
              value={sectionFilter}
              onChange={(event) => setSectionFilter(event.target.value)}
              className={inputClass}
              disabled={sectionOptions.length === 0}
            >
              {scopedToTeacher ? (
                <option value="mine">{t('app.marks.mySections')}</option>
              ) : (
                <option value="all">{t('app.common.all')}</option>
              )}
              {sectionOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="marks-search">
              {t('app.common.search')}
            </label>
            <div id="marks-search">
              <SearchBox value={query} onChange={setQuery} />
            </div>
          </div>
        </div>
      </Card>

      {error && (
        <p className="mb-3 text-xs text-primary-900 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      {notice && (
        <p className="mb-3 text-xs text-secondary-900 bg-secondary-100 border border-secondary-200 rounded-md px-3 py-2">
          {notice}
        </p>
      )}

      {!selectedPaper ? (
        <Card>
          <EmptyState label={t('app.marks.noPaper')} icon="ri-edit-2-line" />
        </Card>
      ) : paperStudents.length === 0 ? (
        <Card>
          <EmptyState label={t('app.marks.noStudents')} icon="ri-user-search-line" />
        </Card>
      ) : (
        <Card>
          <TableWrap>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th>{t('app.common.name')}</Th>
                <Th>{t('app.students.studentNo')}</Th>
                <Th>{`${t('app.marks.marks')} / ${maxMarks}`}</Th>
                <Th>{t('app.marks.percentage')}</Th>
                <Th>{t('app.marks.grade')}</Th>
                <Th>{t('app.marks.remarks')}</Th>
              </tr>
            </thead>
            <tbody>
              {paperStudents.map((student) => {
                const entry = draft[student.id] ?? { marks: '', remarks: '' };
                const value = Number(entry.marks);
                const hasValue = entry.marks.trim() !== '' && Number.isFinite(value);
                const percentage = hasValue ? percentageOf(value, maxMarks) : null;
                const grade = hasValue ? gradeFor(percentage ?? 0) : '—';
                const failed = hasValue && (percentage ?? 0) < 50;

                return (
                  <Row key={student.id}>
                    <Td>
                      <p className="text-sm font-medium text-foreground-950 truncate max-w-[180px]">
                        {student.first_name} {student.last_name ?? ''}
                      </p>
                      <p className="text-[11px] text-foreground-500 truncate">
                        {student.first_name_ar} {student.last_name_ar}
                      </p>
                    </Td>
                    <Td className="text-xs tabular-nums whitespace-nowrap">{student.student_no ?? '—'}</Td>
                    <Td>
                      <input
                        type="number"
                        min="0"
                        max={maxMarks}
                        step="0.5"
                        value={entry.marks}
                        disabled={!canWrite}
                        onChange={(event) => updateEntry(student.id, { marks: event.target.value })}
                        aria-label={`${student.first_name} ${t('app.marks.marks')}`}
                        className="w-20 box-border bg-background-50 border border-background-300 rounded-md px-2 py-1.5 text-sm text-foreground-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 disabled:opacity-60"
                      />
                    </Td>
                    <Td className="text-xs tabular-nums">
                      {percentage === null ? <span className="text-foreground-400">—</span> : `${percentage}%`}
                    </Td>
                    <Td>
                      <span
                        className={`inline-flex items-center justify-center min-w-[2.5rem] rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          !hasValue
                            ? 'bg-background-200 text-foreground-500'
                            : failed
                              ? 'bg-primary-100 text-primary-900'
                              : 'bg-secondary-100 text-secondary-900'
                        }`}
                      >
                        {grade}
                      </span>
                    </Td>
                    <Td>
                      <input
                        type="text"
                        value={entry.remarks}
                        disabled={!canWrite}
                        onChange={(event) => updateEntry(student.id, { remarks: event.target.value })}
                        placeholder={t('app.marks.remarks')}
                        aria-label={`${student.first_name} ${t('app.marks.remarks')}`}
                        className="w-full sm:w-48 box-border bg-background-50 border border-background-300 rounded-md px-2 py-1.5 text-xs text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 disabled:opacity-60"
                      />
                    </Td>
                  </Row>
                );
              })}
            </tbody>
          </TableWrap>
        </Card>
      )}
    </>
  );
}