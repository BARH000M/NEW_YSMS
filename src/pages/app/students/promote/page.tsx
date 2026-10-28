import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import {
  fetchAcademicYears,
  fetchClasses,
  fetchExamResults,
  fetchExamSubjects,
  fetchSections,
  fetchStudents,
} from '@/api/college';
import { buildCandidates, promoteStudents } from '@/api/promotion';
import type { PromotionDecision } from '@/api/promotion';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  SearchBox,
  TableWrap,
  Td,
  Th,
  Row,
} from '@/components/app/ui';

type Action = PromotionDecision['action'];

export default function PromoteStudentsPage() {
  const { t } = useTranslation();
  const [sourceClassId, setSourceClassId] = useState('');
  const [sourceSectionId, setSourceSectionId] = useState('');
  const [targetYearId, setTargetYearId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [targetSectionId, setTargetSectionId] = useState('');
  const [query, setQuery] = useState('');
  const [actions, setActions] = useState<Record<string, Action>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const state = useAsync(async () => {
    const [students, classes, sections, years, results, papers] = await Promise.all([
      fetchStudents(),
      fetchClasses(),
      fetchSections(),
      fetchAcademicYears(),
      fetchExamResults(),
      fetchExamSubjects(),
    ]);
    return { students, classes, sections, years, results, papers };
  }, []);

  const classes = state.data?.classes ?? [];
  const sections = state.data?.sections ?? [];
  const years = state.data?.years ?? [];

  const currentYear = years.find((year) => year.is_current) ?? years[0] ?? null;
  const nextYearOptions = years.filter((year) => year.id !== currentYear?.id);

  const sourceSections = sections.filter(
    (section) => !sourceClassId || section.class_id === sourceClassId,
  );
  const targetSections = sections.filter(
    (section) => !targetClassId || section.class_id === targetClassId,
  );

  const candidates = useMemo(() => {
    if (!state.data || !sourceSectionId) return [];
    const inSection = state.data.students.filter((student) => student.section_id === sourceSectionId);
    const built = buildCandidates(inSection, state.data.results, state.data.papers);
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? built.filter(
          (candidate) =>
            candidate.name.toLowerCase().includes(needle) ||
            (candidate.studentNo ?? '').toLowerCase().includes(needle),
        )
      : built;
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [state.data, sourceSectionId, query]);

  const actionFor = (studentId: string, passing: boolean): Action =>
    actions[studentId] ?? (passing ? 'continue' : 'repeat');

  const counts = useMemo(() => {
    const result = { continue: 0, repeat: 0, leave: 0 };
    candidates.forEach((candidate) => {
      result[actionFor(candidate.id, candidate.passing)] += 1;
    });
    return result;
  }, [candidates, actions]);

  const run = async () => {
    setError(null);
    setSummary(null);
    if (!targetYearId || !targetClassId || !targetSectionId) {
      setError(t('app.promote.needTarget'));
      return;
    }
    if (candidates.length === 0) {
      setError(t('app.promote.noCandidates'));
      return;
    }
    setBusy(true);
    try {
      const result = await promoteStudents({
        decisions: candidates.map((candidate) => ({
          studentId: candidate.id,
          action: actionFor(candidate.id, candidate.passing),
        })),
        sourceYearId: currentYear?.id ?? null,
        targetYearId,
        targetClassId,
        targetSectionId,
      });
      setSummary(
        t('app.promote.done', {
          promoted: result.promoted,
          repeated: result.repeated,
          withdrawn: result.withdrawn,
        }),
      );
      if (result.failures.length > 0) setError(result.failures.join(' · '));
      setActions({});
      state.reload();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  if (state.loading) return <LoadingBlock />;
  if (state.error || !state.data) return <ErrorState message={state.error ?? 'No data'} onRetry={state.reload} />;

  return (
    <>
      <PageHeader
        title={t('app.promote.title')}
        subtitle={t('app.promote.subtitle')}
        action={
          <button
            type="button"
            disabled={busy || candidates.length === 0}
            onClick={() => void run()}
            className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
          >
            <i className="ri-arrow-up-circle-line" />
            {busy ? t('app.common.saving') : t('app.promote.run')}
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4">
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-foreground-900 mb-3">{t('app.promote.from')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className={labelClass} htmlFor="src-class">
                {t('app.reports.class')}
              </label>
              <select
                id="src-class"
                value={sourceClassId}
                onChange={(event) => {
                  setSourceClassId(event.target.value);
                  setSourceSectionId('');
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
              <label className={labelClass} htmlFor="src-section">
                {t('app.reports.section')}
              </label>
              <select
                id="src-section"
                value={sourceSectionId}
                onChange={(event) => setSourceSectionId(event.target.value)}
                className={inputClass}
              >
                <option value="">—</option>
                {sourceSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-[11px] text-foreground-600 mt-3">
            {t('app.promote.currentYear', { name: currentYear?.name ?? '—' })}
          </p>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-foreground-900 mb-3">{t('app.promote.to')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className={labelClass} htmlFor="tgt-year">
                {t('app.enroll.year')}
              </label>
              <select
                id="tgt-year"
                value={targetYearId}
                onChange={(event) => setTargetYearId(event.target.value)}
                className={inputClass}
              >
                <option value="">—</option>
                {(nextYearOptions.length > 0 ? nextYearOptions : years).map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className={labelClass} htmlFor="tgt-class">
                {t('app.reports.class')}
              </label>
              <select
                id="tgt-class"
                value={targetClassId}
                onChange={(event) => {
                  setTargetClassId(event.target.value);
                  setTargetSectionId('');
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
              <label className={labelClass} htmlFor="tgt-section">
                {t('app.reports.section')}
              </label>
              <select
                id="tgt-section"
                value={targetSectionId}
                onChange={(event) => setTargetSectionId(event.target.value)}
                className={inputClass}
              >
                <option value="">—</option>
                {targetSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-[11px] text-foreground-600 mt-3">{t('app.promote.repeatHint')}</p>
        </Card>
      </div>

      {error && (
        <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2 mb-3 break-words">
          {error}
        </p>
      )}
      {summary && (
        <p className="text-xs text-secondary-900 bg-secondary-100 border border-secondary-200 rounded-md px-3 py-2 mb-3">
          {summary}
        </p>
      )}

      <Card>
        <CardHeader
          title={t('app.promote.sheet', { count: candidates.length })}
          action={<SearchBox value={query} onChange={setQuery} />}
        />
        {!sourceSectionId ? (
          <EmptyState icon="ri-filter-3-line" label={t('app.promote.pickSection')} />
        ) : candidates.length === 0 ? (
          <EmptyState icon="ri-user-3-line" label={t('app.promote.empty')} />
        ) : (
          <TableWrap>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th>{t('app.students.studentNo')}</Th>
                <Th>{t('app.common.name')}</Th>
                <Th>{t('app.promote.average')}</Th>
                <Th>{t('app.promote.currentResult')}</Th>
                <Th>{t('app.promote.nextStatus')}</Th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => {
                const action = actionFor(candidate.id, candidate.passing);
                return (
                  <Row key={candidate.id}>
                    <Td className="text-xs tabular-nums whitespace-nowrap">{candidate.studentNo ?? '—'}</Td>
                    <Td className="text-sm font-medium text-foreground-950 whitespace-nowrap">{candidate.name}</Td>
                    <Td className="text-xs tabular-nums whitespace-nowrap">
                      {candidate.average === null ? t('app.promote.noMarks') : `${candidate.average}%`}
                    </Td>
                    <Td>
                      <Badge tone={candidate.passing ? 'secondary' : 'danger'}>
                        {candidate.passing ? t('app.reports.pass') : t('app.reports.fail')}
                      </Badge>
                    </Td>
                    <Td>
                      <select
                        value={action}
                        onChange={(event) =>
                          setActions((prev) => ({ ...prev, [candidate.id]: event.target.value as Action }))
                        }
                        className="box-border bg-background-50 border border-background-300 rounded-md px-2 py-1.5 text-xs text-foreground-900 focus:outline-none focus:ring-2 focus:ring-primary-400"
                      >
                        <option value="continue">{t('app.promote.continue')}</option>
                        <option value="repeat">{t('app.promote.repeat')}</option>
                        <option value="leave">{t('app.promote.leave')}</option>
                      </select>
                    </Td>
                  </Row>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>

      {candidates.length > 0 && (
        <p className="text-[11px] text-foreground-600 mt-3">
          {t('app.promote.tally', { c: counts.continue, r: counts.repeat, l: counts.leave })}
        </p>
      )}
    </>
  );
}