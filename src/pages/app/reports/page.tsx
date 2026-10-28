import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import {
  fetchAttendanceSince,
  fetchClasses,
  fetchExamResults,
  fetchExamSubjects,
  fetchExams,
  fetchInstitution,
  fetchSections,
  fetchStudents,
  fetchTerms,
} from '@/api/college';
import { cohortRate, recentSchoolDays } from '@/utils/attendance';
import type { StudentRow } from '@/api/college';
import { buildReport } from '@/utils/report';
import type { ReportSummary } from '@/utils/report';
import { GRADE_BANDS } from '@/utils/grades';
import { downloadCsv, fileSlug, todayStamp } from '@/utils/csv';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import PrintSheet from '@/components/app/PrintSheet';
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
import ReportCard from './components/ReportCard';
import GradeDistribution from './components/GradeDistribution';
import ClassRanking from './components/ClassRanking';
import type { RankedStudent } from './components/ClassRanking';
import AttendanceByClass from './components/AttendanceByClass';
import type { ClassAttendanceRow } from './components/AttendanceByClass';

export default function ReportsPage() {
  const { t } = useTranslation();

  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('all');
  const [sectionId, setSectionId] = useState('all');
  const [query, setQuery] = useState('');
  const [printTargets, setPrintTargets] = useState<StudentRow[] | null>(null);
  const [printHint, setPrintHint] = useState('');

  const state = useAsync(async () => {
    const [terms, exams, papers, results, students, classes, sections, institution, attendance] =
      await Promise.all([
        fetchTerms(),
        fetchExams(),
        fetchExamSubjects(),
        fetchExamResults(),
        fetchStudents(),
        fetchClasses(),
        fetchSections(),
        fetchInstitution(),
        fetchAttendanceSince(recentSchoolDays(20)[0]),
      ]);
    return { terms, exams, papers, results, students, classes, sections, institution, attendance };
  }, []);

  // Default to the current term once terms arrive.
  useEffect(() => {
    if (!state.data || termId) return;
    const current = state.data.terms.find((term) => term.is_current) ?? state.data.terms[0];
    if (current) setTermId(current.id);
  }, [state.data, termId]);

  const terms = state.data?.terms ?? [];
  const exams = state.data?.exams ?? [];
  const papers = state.data?.papers ?? [];
  const results = state.data?.results ?? [];
  const students = state.data?.students ?? [];
  const classes = state.data?.classes ?? [];
  const sections = state.data?.sections ?? [];
  const attendance = state.data?.attendance ?? [];

  /** Present-rate per class over the recent period, honouring the class filter. */
  const attendanceByClass = useMemo<ClassAttendanceRow[]>(() => {
    const sectionToClass = new Map<string, string>();
    sections.forEach((section) => sectionToClass.set(section.id, section.class_id));

    const visibleClasses = classId === 'all' ? classes : classes.filter((klass) => klass.id === classId);

    return visibleClasses
      .map((klass) => {
        const classSectionIds = new Set(
          sections.filter((section) => section.class_id === klass.id).map((section) => section.id),
        );
        const records = attendance.filter(
          (record) => record.section_id && classSectionIds.has(record.section_id),
        );
        const studentCount = students.filter(
          (student) => student.sections?.classes?.id === klass.id,
        ).length;
        return {
          classId: klass.id,
          className: klass.name,
          students: studentCount,
          records: records.length,
          rate: cohortRate(records),
        };
      })
      .filter((row) => row.records > 0)
      .sort((a, b) => b.rate - a.rate);
  }, [attendance, sections, classes, students, classId]);

  const termPapers = useMemo(() => {
    if (!termId) return [];
    const examIds = new Set(exams.filter((exam) => exam.term_id === termId).map((exam) => exam.id));
    return papers.filter((paper) => examIds.has(paper.exam_id));
  }, [exams, papers, termId]);

  const reportByStudent = useMemo(() => {
    const map = new Map<string, ReportSummary>();
    students.forEach((student) => {
      map.set(student.id, buildReport(student.id, termPapers, results));
    });
    return map;
  }, [students, termPapers, results]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return students.filter((student) => {
      const matchesClass = classId === 'all' || student.sections?.classes?.id === classId;
      const matchesSection = sectionId === 'all' || student.section_id === sectionId;
      const name = `${student.first_name} ${student.last_name ?? ''} ${student.first_name_ar ?? ''}`.toLowerCase();
      const matchesQuery = !needle || name.includes(needle) || (student.student_no ?? '').toLowerCase().includes(needle);
      return matchesClass && matchesSection && matchesQuery;
    });
  }, [students, classId, sectionId, query]);

  const withMarks = useMemo(
    () => rows.filter((student) => (reportByStudent.get(student.id)?.rows.length ?? 0) > 0),
    [rows, reportByStudent],
  );

  const average = withMarks.length
    ? Math.round(
        (withMarks.reduce((sum, student) => sum + (reportByStudent.get(student.id)?.percentage ?? 0), 0) /
          withMarks.length) *
          10,
      ) / 10
    : 0;
  const passRate = withMarks.length
    ? Math.round(
        (withMarks.filter((student) => reportByStudent.get(student.id)?.passed).length / withMarks.length) * 100,
      )
    : 0;
  const topScore = withMarks.length
    ? Math.max(...withMarks.map((student) => reportByStudent.get(student.id)?.percentage ?? 0))
    : 0;

  /** How the filtered cohort's letter grades are spread. */
  const distribution = useMemo(() => {
    const counts: Record<string, number> = {};
    GRADE_BANDS.forEach((band) => {
      counts[band] = 0;
    });
    withMarks.forEach((student) => {
      const grade = reportByStudent.get(student.id)?.grade;
      if (grade && grade in counts) counts[grade] += 1;
    });
    return counts;
  }, [withMarks, reportByStudent]);

  /** Top of the filtered class, ranked by overall percentage. */
  const ranked = useMemo<RankedStudent[]>(() => {
    const entries = withMarks
      .map((student) => ({ student, report: reportByStudent.get(student.id) }))
      .filter(
        (item): item is { student: StudentRow; report: ReportSummary } =>
          Boolean(item.report && item.report.rows.length > 0),
      );

    return entries
      .sort((a, b) => b.report.percentage - a.report.percentage)
      .slice(0, 8)
      .map((item, index) => ({
        id: item.student.id,
        rank: index + 1,
        name: `${item.student.first_name} ${item.student.last_name ?? ''}`.trim(),
        studentNo: item.student.student_no ?? null,
        className: item.student.sections?.classes?.name ?? '—',
        percentage: item.report.percentage,
        grade: item.report.grade,
        passed: item.report.passed,
      }));
  }, [withMarks, reportByStudent]);

  const selectedTerm = terms.find((term) => term.id === termId);
  const termLabel = selectedTerm ? selectedTerm.name : '—';

  /** Offline copy of the ranking panel exactly as it is filtered on screen. */
  const exportRanking = () => {
    if (ranked.length === 0) return;
    const rows: (string | number | null)[][] = [
      [
        t('app.reports.rank'),
        t('app.common.name'),
        t('app.students.studentNo'),
        t('app.reports.class'),
        t('app.reports.percentage'),
        t('app.reports.grade'),
        t('app.reports.result'),
      ],
      ...ranked.map((row) => [
        row.rank,
        row.name,
        row.studentNo ?? '',
        row.className,
        `${row.percentage}%`,
        row.grade,
        row.passed ? t('app.reports.pass') : t('app.reports.fail'),
      ]),
    ];

    const classLabel =
      classId === 'all'
        ? t('app.common.all')
        : classes.find((klass) => klass.id === classId)?.name ?? t('app.reports.class');
    downloadCsv(
      `${fileSlug(`${termLabel}-${classLabel}-ranking`)}-${todayStamp()}.csv`,
      rows,
    );
  };

  const openPrint = (targets: StudentRow[], hint: string) => {
    if (targets.length === 0) return;
    setPrintHint(hint);
    setPrintTargets(targets);
  };

  const sectionOptions = sections.filter((section) => classId === 'all' || section.class_id === classId);

  if (state.loading) return <LoadingBlock />;
  if (state.error || !state.data) {
    return <ErrorState message={state.error ?? t('app.common.errorDesc')} onRetry={state.reload} />;
  }

  return (
    <>
      <PageHeader
        title={t('app.reports.title')}
        subtitle={t('app.reports.subtitle')}
        action={
          <button
            type="button"
            onClick={() => openPrint(withMarks, t('app.reports.hint'))}
            disabled={withMarks.length === 0}
            className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
          >
            <i className="ri-printer-line" />
            {t('app.reports.printAll')}
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.reports.withMarks')} value={withMarks.length} icon="ri-file-chart-line" tone="primary" />
        <StatCard label={t('app.reports.average')} value={`${average}%`} icon="ri-bar-chart-line" tone="secondary" />
        <StatCard label={t('app.reports.passRate')} value={`${passRate}%`} icon="ri-checkbox-circle-line" tone="accent" />
        <StatCard label={t('app.reports.top')} value={`${topScore}%`} icon="ri-trophy-line" tone="neutral" />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="report-term">
              {t('app.reports.term')}
            </label>
            <select
              id="report-term"
              value={termId}
              onChange={(event) => setTermId(event.target.value)}
              className={inputClass}
            >
              {terms.length === 0 && <option value="">{t('app.common.noData')}</option>}
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="report-class">
              {t('app.reports.class')}
            </label>
            <select
              id="report-class"
              value={classId}
              onChange={(event) => {
                setClassId(event.target.value);
                setSectionId('all');
              }}
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
            <label className={labelClass} htmlFor="report-section">
              {t('app.reports.section')}
            </label>
            <select
              id="report-section"
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
            <label className={labelClass} htmlFor="report-search">
              {t('app.common.search')}
            </label>
            <div id="report-search">
              <SearchBox value={query} onChange={setQuery} />
            </div>
          </div>
        </div>
      </Card>

      <div className="mb-3 md:mb-4">
        <AttendanceByClass rows={attendanceByClass} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4">
        <GradeDistribution counts={distribution} total={withMarks.length} />
        <ClassRanking
          rows={ranked}
          onExport={exportRanking}
          onSelect={(studentId) => {
            const target = rows.find((student) => student.id === studentId);
            if (target) openPrint([target], t('app.reports.hint'));
          }}
        />
      </div>

      <p className="text-[11px] text-foreground-500 mb-2">{t('app.reports.gradeScale')}</p>

      <Card>
        {rows.length === 0 ? (
          <EmptyState label={t('app.reports.noStudents')} icon="ri-user-search-line" />
        ) : (
          <TableWrap>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th>{t('app.common.name')}</Th>
                <Th>{t('app.reports.class')}</Th>
                <Th>{t('app.reports.subjects')}</Th>
                <Th>{t('app.reports.total')}</Th>
                <Th>{t('app.reports.percentage')}</Th>
                <Th>{t('app.reports.grade')}</Th>
                <Th>{t('app.reports.result')}</Th>
                <Th className="text-end">{t('app.common.actions')}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((student) => {
                const report = reportByStudent.get(student.id);
                const hasMarks = (report?.rows.length ?? 0) > 0;
                const fullName = `${student.first_name} ${student.last_name ?? ''}`.trim();

                return (
                  <Row key={student.id}>
                    <Td>
                      <p className="text-sm font-medium text-foreground-950 truncate max-w-[180px]">{fullName}</p>
                      <p className="text-[11px] text-foreground-500 tabular-nums">{student.student_no ?? '—'}</p>
                    </Td>
                    <Td className="text-xs">
                      {student.sections?.classes?.name ?? '—'}
                      {student.sections ? ` / ${student.sections.name}` : ''}
                    </Td>
                    <Td className="text-xs tabular-nums">{hasMarks ? report?.rows.length : '—'}</Td>
                    <Td className="text-xs tabular-nums whitespace-nowrap">
                      {hasMarks ? `${report?.obtained} / ${report?.max}` : '—'}
                    </Td>
                    <Td className="text-xs font-semibold tabular-nums">
                      {hasMarks ? `${report?.percentage}%` : '—'}
                    </Td>
                    <Td>
                      <span
                        className={`inline-flex items-center justify-center min-w-[2.5rem] rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          !hasMarks
                            ? 'bg-background-200 text-foreground-500'
                            : report?.passed
                              ? 'bg-secondary-100 text-secondary-900'
                              : 'bg-primary-100 text-primary-900'
                        }`}
                      >
                        {hasMarks ? report?.grade : '—'}
                      </span>
                    </Td>
                    <Td className="text-xs">
                      {!hasMarks ? (
                        <span className="text-foreground-400">{t('app.reports.noMarks')}</span>
                      ) : report?.passed ? (
                        <span className="font-semibold text-secondary-700">{t('app.reports.pass')}</span>
                      ) : (
                        <span className="font-semibold text-primary-700">{t('app.reports.fail')}</span>
                      )}
                    </Td>
                    <Td className="text-end">
                      {hasMarks ? (
                        <button
                          type="button"
                          onClick={() => openPrint([student], t('app.reports.hint'))}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
                        >
                          <i className="ri-printer-line" />
                          {t('app.reports.print')}
                        </button>
                      ) : (
                        <span className="text-xs text-foreground-400">—</span>
                      )}
                    </Td>
                  </Row>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>

      {printTargets && (
        <PrintSheet
          title={printTargets.length > 1 ? t('app.reports.printAll') : t('app.reports.print')}
          hint={printHint}
          onClose={() => setPrintTargets(null)}
        >
          <div>
            {printTargets.map((student, index) => {
              const report = reportByStudent.get(student.id);
              if (!report) return null;
              return (
                <div
                  key={student.id}
                  className={index < printTargets.length - 1 ? 'print-page-break' : ''}
                >
                  <ReportCard
                    student={student}
                    report={report}
                    institution={state.data?.institution ?? null}
                    termLabel={termLabel}
                  />
                </div>
              );
            })}
          </div>
        </PrintSheet>
      )}
    </>
  );
}