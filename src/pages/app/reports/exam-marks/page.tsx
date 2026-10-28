import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import {
  fetchClasses,
  fetchExamResults,
  fetchExamSubjects,
  fetchExams,
  fetchInstitution,
  fetchSections,
  fetchStudents,
} from '@/api/college';
import { gradeFor, isPassing, percentageOf } from '@/utils/grades';
import { toNumber } from '@/utils/money';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import ExportBar from '@/components/app/ExportBar';
import PrintSheet from '@/components/app/PrintSheet';
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  SearchBox,
  StatCard,
  TableWrap,
  Td,
  Th,
} from '@/components/app/ui';
import ReportDocument from '../components/ReportDocument';

interface SubjectColumn {
  subjectId: string;
  name: string;
  max: number;
  paperIds: string[];
}

export default function ExamMarksReportPage() {
  const { t } = useTranslation();

  const [examId, setExamId] = useState('');
  const [classId, setClassId] = useState('all');
  const [sectionId, setSectionId] = useState('all');
  const [query, setQuery] = useState('');
  const [printing, setPrinting] = useState(false);

  const state = useAsync(async () => {
    const [exams, papers, results, students, classes, sections, institution] = await Promise.all([
      fetchExams(),
      fetchExamSubjects(),
      fetchExamResults(),
      fetchStudents(),
      fetchClasses(),
      fetchSections(),
      fetchInstitution(),
    ]);
    return { exams, papers, results, students, classes, sections, institution };
  }, []);

  const exams = state.data?.exams ?? [];
  const classes = state.data?.classes ?? [];
  const sections = state.data?.sections ?? [];

  useEffect(() => {
    if (examId || exams.length === 0) return;
    setExamId(exams[0].id);
  }, [exams, examId]);

  useEffect(() => {
    setSectionId('all');
  }, [classId]);

  const sectionOptions = useMemo(
    () => sections.filter((section) => classId === 'all' || section.class_id === classId),
    [sections, classId],
  );

  /** Papers for this exam, narrowed to the chosen section (class-wide papers kept). */
  const papers = useMemo(() => {
    const all = state.data?.papers ?? [];
    return all.filter((paper) => {
      if (paper.exam_id !== examId) return false;
      if (sectionId === 'all') return true;
      return !paper.section_id || paper.section_id === sectionId;
    });
  }, [state.data, examId, sectionId]);

  /** One column per subject, with the maximum marks added up across its papers. */
  const subjectColumns = useMemo<SubjectColumn[]>(() => {
    const map = new Map<string, SubjectColumn>();
    papers.forEach((paper) => {
      const current =
        map.get(paper.subject_id) ?? {
          subjectId: paper.subject_id,
          name: paper.subjects?.name ?? '—',
          max: 0,
          paperIds: [] as string[],
        };
      current.max += toNumber(paper.max_marks);
      current.paperIds.push(paper.id);
      map.set(paper.subject_id, current);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [papers]);

  const resultMap = useMemo(() => {
    const map = new Map<string, number>();
    (state.data?.results ?? []).forEach((result) => {
      map.set(`${result.exam_subject_id}:${result.student_id}`, toNumber(result.marks_obtained));
    });
    return map;
  }, [state.data]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (state.data?.students ?? [])
      .filter((student) => {
        if (classId !== 'all' && student.sections?.classes?.id !== classId) return false;
        if (sectionId !== 'all' && student.section_id !== sectionId) return false;
        if (!needle) return true;
        const name = `${student.first_name} ${student.last_name ?? ''}`.toLowerCase();
        return name.includes(needle) || (student.student_no ?? '').toLowerCase().includes(needle);
      })
      .map((student) => {
        const cells = subjectColumns.map((column) => {
          const values = column.paperIds
            .map((paperId) => resultMap.get(`${paperId}:${student.id}`))
            .filter((value): value is number => value !== undefined);
          return {
            subjectId: column.subjectId,
            obtained: values.length > 0 ? values.reduce((sum, value) => sum + value, 0) : null,
          };
        });

        const attempted = cells.filter((cell) => cell.obtained !== null);
        const obtained = attempted.reduce((sum, cell) => sum + (cell.obtained ?? 0), 0);
        const max = subjectColumns
          .filter((column) => cells.find((cell) => cell.subjectId === column.subjectId && cell.obtained !== null))
          .reduce((sum, column) => sum + column.max, 0);
        const percentage = percentageOf(obtained, max);

        return {
          id: student.id,
          name: `${student.first_name} ${student.last_name ?? ''}`.trim(),
          studentNo: student.student_no ?? '',
          classSection: `${student.sections?.classes?.name ?? '—'} / ${student.sections?.name ?? '—'}`,
          cells,
          obtained,
          max,
          percentage,
          grade: percentageOf(obtained, max) > 0 ? gradeFor(percentage) : '—',
          passed: max > 0 && isPassing(percentage),
          hasMarks: attempted.length > 0,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }, [state.data, classId, sectionId, query, subjectColumns, resultMap]);

  const withMarks = rows.filter((row) => row.hasMarks);
  const average = withMarks.length
    ? Math.round((withMarks.reduce((sum, row) => sum + row.percentage, 0) / withMarks.length) * 10) / 10
    : 0;
  const passRate = withMarks.length
    ? Math.round((withMarks.filter((row) => row.passed).length / withMarks.length) * 100)
    : 0;

  const subjectTotals = subjectColumns.map((column) => ({
    subjectId: column.subjectId,
    total: rows.reduce(
      (sum, row) => sum + (row.cells.find((cell) => cell.subjectId === column.subjectId)?.obtained ?? 0),
      0,
    ),
  }));

  const columns = [
    t('app.fees.student'),
    t('app.students.studentNo'),
    ...subjectColumns.map((column) => `${column.name} (${column.max})`),
    t('app.reports.total'),
    t('app.reports.percentage'),
    t('app.reports.result'),
  ];

  const exportRows = rows.map((row) => [
    row.name,
    row.studentNo,
    ...subjectColumns.map(
      (column) => row.cells.find((cell) => cell.subjectId === column.subjectId)?.obtained ?? '',
    ),
    `${row.obtained} / ${row.max}`,
    row.hasMarks ? `${row.percentage}%` : '',
    row.hasMarks ? (row.passed ? t('app.reports.pass') : t('app.reports.fail')) : t('app.reports.noMarks'),
  ]);

  const selectedExam = exams.find((exam) => exam.id === examId);
  const examLabel = selectedExam?.name ?? '—';
  const classLabel = classes.find((item) => item.id === classId)?.name ?? t('app.common.all');
  const sectionLabel =
    sectionId === 'all' ? t('app.common.all') : sections.find((item) => item.id === sectionId)?.name ?? '';

  if (state.loading) return <LoadingBlock />;
  if (state.error || !state.data) {
    return <ErrorState message={state.error ?? t('app.common.errorDesc')} onRetry={state.reload} />;
  }

  return (
    <>
      <PageHeader
        title={t('app.examReport.title')}
        subtitle={t('app.examReport.subtitle')}
        action={
          <>
            <ExportBar
              title={`${t('app.examReport.title')} — ${examLabel}`}
              fileName={`exam-marks-${examLabel}-${classLabel}`}
              columns={columns}
              rows={exportRows}
              hint={`${examLabel} · ${classLabel} · ${sectionLabel}`}
              summary={[
                { label: t('app.reports.average'), value: `${average}%` },
                { label: t('app.reports.passRate'), value: `${passRate}%` },
              ]}
            />
            <button
              type="button"
              onClick={() => setPrinting(true)}
              disabled={withMarks.length === 0}
              className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-printer-line" />
              {t('app.print.printRecord')}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.examReport.students')} value={rows.length} icon="ri-group-line" tone="primary" />
        <StatCard label={t('app.reports.average')} value={`${average}%`} icon="ri-bar-chart-line" tone="secondary" />
        <StatCard label={t('app.reports.passRate')} value={`${passRate}%`} icon="ri-checkbox-circle-line" tone="accent" />
        <StatCard label={t('app.examReport.subjects')} value={subjectColumns.length} icon="ri-book-open-line" tone="neutral" />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="exm-exam">
              {t('app.marks.exam')}
            </label>
            <select
              id="exm-exam"
              value={examId}
              onChange={(event) => setExamId(event.target.value)}
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
            <label className={labelClass} htmlFor="exm-class">
              {t('app.reports.class')}
            </label>
            <select
              id="exm-class"
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              className={inputClass}
            >
              <option value="all">{t('app.common.all')}</option>
              {classes.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="exm-section">
              {t('app.reports.section')}
            </label>
            <select
              id="exm-section"
              value={sectionId}
              onChange={(event) => setSectionId(event.target.value)}
              className={inputClass}
            >
              <option value="all">{t('app.common.all')}</option>
              {sectionOptions.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="exm-search">
              {t('app.common.search')}
            </label>
            <div id="exm-search">
              <SearchBox value={query} onChange={setQuery} />
            </div>
          </div>
        </div>
      </Card>

      <p className="text-[11px] text-foreground-500 mb-2">{t('app.reports.gradeScale')}</p>

      <Card>
        {rows.length === 0 ? (
          <EmptyState label={t('app.reports.noStudents')} icon="ri-file-chart-line" />
        ) : (
          <TableWrap>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th>{t('app.fees.student')}</Th>
                <Th>{t('app.students.studentNo')}</Th>
                {subjectColumns.map((column) => (
                  <Th key={column.subjectId} className="text-center">
                    {column.name}
                    <span className="block text-[9px] font-normal normal-case text-foreground-500">
                      {t('app.examReport.outOf', { max: column.max })}
                    </span>
                  </Th>
                ))}
                <Th className="text-center">{t('app.reports.total')}</Th>
                <Th className="text-center">{t('app.reports.percentage')}</Th>
                <Th className="text-center">{t('app.reports.result')}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-background-100 last:border-b-0 hover:bg-background-100/60">
                  <Td className="whitespace-nowrap">
                    <p className="text-xs font-medium text-foreground-950 truncate max-w-[170px]">{row.name}</p>
                    <p className="text-[10px] text-foreground-500">{row.classSection}</p>
                  </Td>
                  <Td className="text-[11px] tabular-nums whitespace-nowrap">{row.studentNo || '—'}</Td>
                  {subjectColumns.map((column) => {
                    const cell = row.cells.find((item) => item.subjectId === column.subjectId);
                    return (
                      <td key={column.subjectId} className="px-2 py-2 text-center text-xs tabular-nums">
                        {cell?.obtained === null || cell?.obtained === undefined ? (
                          <span className="text-foreground-400">—</span>
                        ) : (
                          cell.obtained
                        )}
                      </td>
                    );
                  })}
                  <Td className="text-center text-xs tabular-nums whitespace-nowrap font-semibold">
                    {row.hasMarks ? `${row.obtained} / ${row.max}` : '—'}
                  </Td>
                  <Td className="text-center text-xs tabular-nums whitespace-nowrap">{row.hasMarks ? `${row.percentage}%` : '—'}</Td>
                  <Td className="text-center">
                    {!row.hasMarks ? (
                      <span className="text-[11px] text-foreground-400">{t('app.reports.noMarks')}</span>
                    ) : (
                      <span
                        className={`inline-flex items-center justify-center min-w-[2.5rem] rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          row.passed
                            ? 'bg-secondary-100 text-secondary-900'
                            : 'bg-primary-100 text-primary-900'
                        }`}
                      >
                        {row.grade}
                      </span>
                    )}
                  </Td>
                </tr>
              ))}
              <tr className="bg-background-100 border-t-2 border-background-300">
                <Td className="text-xs font-bold" />
                <Td className="text-xs font-bold" />
                {subjectTotals.map((item) => (
                  <Td key={item.subjectId} className="text-center text-xs font-bold tabular-nums">
                    {item.total}
                  </Td>
                ))}
                <Td className="text-center text-xs font-bold" />
                <Td className="text-center text-xs font-bold" />
                <Td className="text-center text-xs font-bold" />
              </tr>
            </tbody>
          </TableWrap>
        )}
      </Card>

      {printing && (
        <PrintSheet title={t('app.examReport.title')} hint={`${examLabel} · ${classLabel} · ${sectionLabel}`} onClose={() => setPrinting(false)}>
          <ReportDocument
            institution={state.data.institution}
            title={t('app.examReport.docTitle')}
            subtitle={examLabel}
            meta={[
              { label: t('app.marks.exam'), value: examLabel },
              { label: t('app.reports.class'), value: classLabel },
              { label: t('app.reports.section'), value: sectionLabel },
              { label: t('app.reports.average'), value: `${average}%` },
              { label: t('app.reports.passRate'), value: `${passRate}%` },
            ]}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-background-100">
                  <th className="text-start text-[8px] font-bold uppercase text-foreground-700 px-1 py-1 border-b border-background-300">
                    {t('app.fees.student')}
                  </th>
                  <th className="text-start text-[8px] font-bold uppercase text-foreground-700 px-1 py-1 border-b border-background-300">
                    {t('app.students.studentNo')}
                  </th>
                  {subjectColumns.map((column) => (
                    <th
                      key={column.subjectId}
                      className="text-center text-[8px] font-bold text-foreground-700 px-1 py-1 border-b border-background-300"
                    >
                      {column.name}
                      <span className="block font-normal">/{column.max}</span>
                    </th>
                  ))}
                  <th className="text-center text-[8px] font-bold uppercase text-foreground-700 px-1 py-1 border-b border-background-300">
                    {t('app.reports.total')}
                  </th>
                  <th className="text-center text-[8px] font-bold uppercase text-foreground-700 px-1 py-1 border-b border-background-300">
                    %
                  </th>
                  <th className="text-center text-[8px] font-bold uppercase text-foreground-700 px-1 py-1 border-b border-background-300">
                    {t('app.reports.result')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-1 py-0.5 text-[8px] border-b border-background-200 whitespace-nowrap">{row.name}</td>
                    <td className="px-1 py-0.5 text-[8px] border-b border-background-200 whitespace-nowrap">{row.studentNo}</td>
                    {subjectColumns.map((column) => {
                      const cell = row.cells.find((item) => item.subjectId === column.subjectId);
                      return (
                        <td
                          key={column.subjectId}
                          className="px-1 py-0.5 text-center text-[8px] border-b border-background-200 tabular-nums"
                        >
                          {cell?.obtained ?? '—'}
                        </td>
                      );
                    })}
                    <td className="px-1 py-0.5 text-center text-[8px] border-b border-background-200 tabular-nums">
                      {row.hasMarks ? `${row.obtained}/${row.max}` : '—'}
                    </td>
                    <td className="px-1 py-0.5 text-center text-[8px] border-b border-background-200 tabular-nums">
                      {row.hasMarks ? `${row.percentage}%` : '—'}
                    </td>
                    <td className="px-1 py-0.5 text-center text-[8px] border-b border-background-200">
                      {row.hasMarks ? (row.passed ? t('app.reports.pass') : t('app.reports.fail')) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ReportDocument>
        </PrintSheet>
      )}
    </>
  );
}