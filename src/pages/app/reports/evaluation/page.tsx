import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { fetchClasses, fetchExamResults, fetchExamSubjects, fetchSections, fetchStudents } from '@/api/college';
import { toNumber } from '@/utils/money';
import ExportBar from '@/components/app/ExportBar';
import { Card, CardHeader, EmptyState, ErrorState, LoadingBlock, PageHeader, ProgressRow, Row, StatCard, TableWrap, Td, Th } from '@/components/app/ui';

const BANDS = [
  { key: 'A', min: 90 },
  { key: 'B', min: 80 },
  { key: 'C', min: 70 },
  { key: 'D', min: 60 },
  { key: 'F', min: 0 },
];

const bandOf = (percentage: number) => BANDS.find((band) => percentage >= band.min)?.key ?? 'F';

export default function AcademicEvaluationPage() {
  const { t } = useTranslation();
  const [sectionId, setSectionId] = useState('all');

  const state = useAsync(async () => {
    const [results, papers, students, sections, classes] = await Promise.all([
      fetchExamResults(),
      fetchExamSubjects(),
      fetchStudents(),
      fetchSections(),
      fetchClasses(),
    ]);
    return { results, papers, students, sections, classes };
  }, []);

  const results = state.data?.results ?? [];
  const papers = state.data?.papers ?? [];
  const students = state.data?.students ?? [];
  const sections = state.data?.sections ?? [];
  const classes = state.data?.classes ?? [];

  const paperMap = useMemo(() => new Map(papers.map((paper) => [paper.id, paper])), [papers]);
  const studentMap = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);

  /** Attach each mark to the section it belongs to, so nothing is lost. */
  const scored = useMemo(() => {
    return results
      .map((result) => {
        const paper = paperMap.get(result.exam_subject_id);
        if (!paper) return null;
        const student = studentMap.get(result.student_id);
        const max = toNumber(paper.max_marks) || 100;
        const marks = toNumber(result.marks_obtained);
        return {
          sectionId: paper.section_id ?? student?.section_id ?? null,
          studentId: result.student_id,
          marks,
          max,
          pass: toNumber(paper.pass_marks),
          percentage: (marks / max) * 100,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }, [results, paperMap, studentMap]);

  const scoped = useMemo(
    () => (sectionId === 'all' ? scored : scored.filter((row) => row.sectionId === sectionId)),
    [scored, sectionId],
  );

  const sectionRows = useMemo(() => {
    const classNameOf = (classId: string) => classes.find((klass) => klass.id === classId)?.name ?? '—';
    return sections
      .map((section) => {
        const rows = scored.filter((row) => row.sectionId === section.id);
        const average = rows.length ? rows.reduce((sum, row) => sum + row.percentage, 0) / rows.length : 0;
        const passed = rows.filter((row) => row.marks >= row.pass).length;
        return {
          id: section.id,
          label: `${classNameOf(section.class_id)} / ${section.name}`.replace(/^ \//, ''),
          marks: rows.length,
          students: new Set(rows.map((row) => row.studentId)).size,
          average: Math.round(average),
          passRate: rows.length ? Math.round((passed / rows.length) * 100) : 0,
        };
      })
      .filter((row) => row.marks > 0)
      .sort((a, b) => b.average - a.average);
  }, [sections, classes, scored]);

  const distribution = useMemo(() => {
    const counts = new Map<string, number>();
    BANDS.forEach((band) => counts.set(band.key, 0));
    scoped.forEach((row) => {
      const key = bandOf(row.percentage);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return BANDS.map((band) => ({ ...band, count: counts.get(band.key) ?? 0 }));
  }, [scoped]);

  const maxBand = Math.max(1, ...distribution.map((band) => band.count));

  const average = scoped.length ? Math.round(scoped.reduce((sum, row) => sum + row.percentage, 0) / scoped.length) : 0;
  const passRate = scoped.length
    ? Math.round((scoped.filter((row) => row.marks >= row.pass).length / scoped.length) * 100)
    : 0;

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  return (
    <>
      <PageHeader
        title={t('app.evaluation.title')}
        subtitle={t('app.evaluation.subtitle')}
        action={
          <ExportBar
            title={`${t('app.evaluation.title')} — ${t('app.nav.brand')}`}
            fileName="academic-evaluation"
            columns={[
              t('app.reports.section'),
              t('app.evaluation.students'),
              t('app.evaluation.marks'),
              t('app.evaluation.average'),
              t('app.evaluation.passRate'),
            ]}
            rows={sectionRows.map((row) => [row.label, row.students, row.marks, `${row.average}%`, `${row.passRate}%`])}
            hint={
              sectionId === 'all'
                ? t('app.common.all')
                : sectionRows.find((row) => row.id === sectionId)?.label ?? t('app.common.all')
            }
            summary={[
              { label: t('app.evaluation.average'), value: `${average}%` },
              { label: t('app.evaluation.passRate'), value: `${passRate}%` },
              { label: t('app.evaluation.marks'), value: String(scoped.length) },
            ]}
          />
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.evaluation.average')} value={`${average}%`} icon="ri-bar-chart-grouped-line" tone="primary" />
        <StatCard label={t('app.evaluation.passRate')} value={`${passRate}%`} icon="ri-checkbox-circle-line" tone="secondary" />
        <StatCard label={t('app.evaluation.marks')} value={scoped.length} icon="ri-file-list-2-line" tone="accent" />
        <StatCard label={t('app.evaluation.papers')} value={papers.length} icon="ri-draft-line" tone="neutral" />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSectionId('all')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
              sectionId === 'all' ? 'bg-secondary-500 text-background-50' : 'bg-background-100 text-foreground-700 hover:bg-background-200'
            }`}
          >
            {t('app.common.all')}
          </button>
          {sections.map((section) => {
            const className = classes.find((klass) => klass.id === section.class_id)?.name ?? '';
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setSectionId(section.id)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                  sectionId === section.id
                    ? 'bg-secondary-500 text-background-50'
                    : 'bg-background-100 text-foreground-700 hover:bg-background-200'
                }`}
              >
                {`${className} / ${section.name}`.replace(/^ \//, '')}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title={t('app.evaluation.bySection')} />
          {sectionRows.length === 0 ? (
            <EmptyState icon="ri-bar-chart-grouped-line" />
          ) : (
            <TableWrap>
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.reports.section')}</Th>
                  <Th>{t('app.evaluation.students')}</Th>
                  <Th>{t('app.evaluation.marks')}</Th>
                  <Th>{t('app.evaluation.average')}</Th>
                  <Th>{t('app.evaluation.passRate')}</Th>
                </tr>
              </thead>
              <tbody>
                {sectionRows.map((row) => (
                  <Row key={row.id}>
                    <Td className="text-sm font-medium text-foreground-950 truncate max-w-[180px]">{row.label}</Td>
                    <Td className="text-xs tabular-nums">{row.students}</Td>
                    <Td className="text-xs tabular-nums">{row.marks}</Td>
                    <Td className="w-40">
                      <ProgressRow value={row.average} />
                    </Td>
                    <Td className="text-xs tabular-nums font-semibold">{row.passRate}%</Td>
                  </Row>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>

        <Card>
          <CardHeader title={t('app.evaluation.distribution')} />
          <div className="p-4 flex flex-col gap-3">
            {distribution.map((band) => (
              <div key={band.key} className="flex items-center gap-3">
                <span className="w-6 shrink-0 text-xs font-bold text-foreground-800">{band.key}</span>
                <div className="flex-1 h-2.5 rounded-full bg-background-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-500"
                    style={{ width: `${Math.max(3, (band.count / maxBand) * 100)}%` }}
                  />
                </div>
                <span className="w-7 text-end text-xs font-semibold tabular-nums text-foreground-800">{band.count}</span>
              </div>
            ))}
            <p className="text-[11px] text-foreground-500 border-t border-background-200 pt-3">
              {t('app.evaluation.totalScored', { count: scoped.length })}
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}