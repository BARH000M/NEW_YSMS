import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { fetchStudents } from '@/api/college';
import { fetchSiblings, fetchStudentExtras } from '@/api/campusOps';
import type { StudentExtras } from '@/api/campusOps';
import ExportBar from '@/components/app/ExportBar';
import {
  Badge,
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
import StudentExtrasModal from './components/StudentExtrasModal';

const CRITERIA = ['category', 'caste', 'religion', 'rte', 'skill', 'gender'] as const;
type Criterion = (typeof CRITERIA)[number];

const emptyExtras: StudentExtras = {
  student_id: '',
  caste: null,
  religion: null,
  rte: false,
  skill_ability: null,
  mother_tongue: null,
  national_id: null,
  father_name: null,
  mother_name: null,
  guardian_occupation: null,
  city: null,
  state: null,
  postal_code: null,
  prev_school_name: null,
  prev_school_class: null,
  prev_school_tc_no: null,
};

export default function StudentCategoriesPage() {
  const { t } = useTranslation();
  const [criterion, setCriterion] = useState<Criterion>('category');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);

  const state = useAsync(async () => {
    const [students, extras, siblings] = await Promise.all([fetchStudents(), fetchStudentExtras(), fetchSiblings()]);
    return { students, extras, siblings };
  }, []);

  if (state.loading) return <LoadingBlock />;
  if (state.error || !state.data) return <ErrorState message={state.error ?? 'No data'} onRetry={state.reload} />;

  const { students, extras, siblings } = state.data;
  const extrasById = new Map(extras.map((row) => [row.student_id, row]));

  const classNames = Array.from(
    new Set(students.map((row) => row.sections?.classes?.name).filter((name): name is string => Boolean(name))),
  ).sort();

  const sectionNames = Array.from(
    new Set(
      students
        .filter((row) => !classFilter || row.sections?.classes?.name === classFilter)
        .map((row) => row.sections?.name)
        .filter((name): name is string => Boolean(name)),
    ),
  ).sort();

  const valueOf = (student: (typeof students)[number], key: Criterion): string => {
    const extra = extrasById.get(student.id);
    if (key === 'caste') return extra?.caste ?? t('app.categories.notSet');
    if (key === 'religion') return extra?.religion ?? t('app.categories.notSet');
    if (key === 'rte') return extra?.rte ? t('app.categories.rteYes') : t('app.categories.rteNo');
    if (key === 'skill') return extra?.skill_ability ?? t('app.categories.notSet');
    if (key === 'gender') return student.gender ?? t('app.categories.notSet');
    return student.category ?? t('app.categories.notSet');
  };

  const inScope = students.filter((row) => {
    if (classFilter && row.sections?.classes?.name !== classFilter) return false;
    if (sectionFilter && row.sections?.name !== sectionFilter) return false;
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return (
      `${row.first_name} ${row.last_name ?? ''}`.toLowerCase().includes(term) ||
      (row.student_no ?? '').toLowerCase().includes(term)
    );
  });

  const groups = (() => {
    const map = new Map<string, number>();
    inScope.forEach((row) => {
      const key = valueOf(row, criterion);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  })();

  const maxGroup = Math.max(1, ...groups.map((row) => row.count));
  const rteCount = inScope.filter((row) => extrasById.get(row.id)?.rte).length;
  const withPrevSchool = inScope.filter((row) => extrasById.get(row.id)?.prev_school_name).length;

  const filteredRows = inScope.filter((row) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return (
      `${row.first_name} ${row.last_name ?? ''}`.toLowerCase().includes(term) ||
      (row.student_no ?? '').toLowerCase().includes(term)
    );
  });

  return (
    <>
      <PageHeader title={t('app.categories.title')} subtitle={t('app.categories.subtitle')} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.categories.inScope')} value={inScope.length} icon="ri-group-line" tone="primary" />
        <StatCard label={t('app.categories.groups')} value={groups.length} icon="ri-pie-chart-line" tone="accent" />
        <StatCard label={t('app.categories.rteCount')} value={rteCount} icon="ri-government-line" tone="secondary" />
        <StatCard
          label={t('app.categories.prevSchool')}
          value={withPrevSchool}
          icon="ri-history-line"
          tone="neutral"
          hint={t('app.categories.prevSchoolHint')}
        />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-foreground-600 me-1">{t('app.categories.groupBy')}</span>
            <div className="inline-flex items-center gap-1 p-1 bg-background-100 border border-background-200 rounded-full flex-wrap">
              {CRITERIA.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCriterion(key)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                    criterion === key ? 'bg-primary-500 text-background-50' : 'text-foreground-700 hover:bg-background-200'
                  }`}
                >
                  {t(`app.categories.crit.${key}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setSectionFilter('');
              }}
              className="box-border bg-background-50 border border-background-300 rounded-md px-3 py-2 text-xs text-foreground-900 cursor-pointer"
            >
              <option value="">{t('app.categories.allClasses')}</option>
              {classNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="box-border bg-background-50 border border-background-300 rounded-md px-3 py-2 text-xs text-foreground-900 cursor-pointer"
            >
              <option value="">{t('app.categories.allSections')}</option>
              {sectionNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <SearchBox value={query} onChange={setQuery} />
            <ExportBar
              title={t('app.categories.title')}
              fileName="student-categories"
              hint={`${t('app.categories.groupBy')}: ${t(`app.categories.crit.${criterion}`)}`}
              columns={[
                t('app.categories.student'),
                t('app.common.reference'),
                t('app.categories.classSection'),
                t(`app.categories.crit.${criterion}`),
              ]}
              rows={filteredRows.map((row) => [
                `${row.first_name} ${row.last_name ?? ''}`.trim(),
                row.student_no ?? '',
                `${row.sections?.classes?.name ?? ''} / ${row.sections?.name ?? ''}`,
                valueOf(row, criterion),
              ])}
              summary={groups.map((group) => ({ label: group.label, value: String(group.count) }))}
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4">
        <Card className="lg:col-span-1">
          <div className="px-4 py-3 border-b border-background-200">
            <h2 className="text-sm font-semibold text-foreground-900">
              {t('app.categories.breakdown')} · {t(`app.categories.crit.${criterion}`)}
            </h2>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {groups.length === 0 && <EmptyState icon="ri-pie-chart-line" />}
            {groups.map((group) => (
              <div key={group.label} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-[11px] font-medium text-foreground-800 truncate">{group.label}</span>
                <div className="flex-1 h-2.5 rounded-full bg-background-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-500"
                    style={{ width: `${Math.max(5, (group.count / maxGroup) * 100)}%` }}
                  />
                </div>
                <span className="w-8 text-end text-[11px] font-semibold tabular-nums text-foreground-900">{group.count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          {filteredRows.length === 0 ? (
            <EmptyState icon="ri-group-line" />
          ) : (
            <TableWrap>
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.categories.student')}</Th>
                  <Th>{t('app.categories.classSection')}</Th>
                  <Th>{t('app.categories.caste')}</Th>
                  <Th>{t('app.categories.rte')}</Th>
                  <Th>{t('app.categories.skill')}</Th>
                  <Th>{t('app.common.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, 60).map((row) => {
                  const extra = extrasById.get(row.id);
                  return (
                    <Row key={row.id}>
                      <Td>
                        <p className="text-sm font-medium text-foreground-950 whitespace-nowrap">
                          {row.first_name} {row.last_name ?? ''}
                        </p>
                        <p className="text-[11px] text-foreground-500 tabular-nums">{row.student_no ?? '—'}</p>
                      </Td>
                      <Td className="text-xs whitespace-nowrap">
                        {row.sections?.classes?.name ?? '—'} / {row.sections?.name ?? '—'}
                      </Td>
                      <Td className="text-xs">
                        <Badge tone="neutral">{extra?.caste ?? '—'}</Badge>
                      </Td>
                      <Td>
                        <Badge tone={extra?.rte ? 'accent' : 'neutral'}>
                          {extra?.rte ? t('app.categories.rteYes') : t('app.categories.rteNo')}
                        </Badge>
                      </Td>
                      <Td className="text-xs">
                        <span className="block max-w-[130px] truncate">{extra?.skill_ability ?? '—'}</span>
                      </Td>
                      <Td>
                        <button
                          type="button"
                          onClick={() => setEditing(row.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-background-300 px-2.5 py-1.5 text-[11px] font-semibold text-foreground-700 hover:border-primary-400 whitespace-nowrap cursor-pointer"
                        >
                          <i className="ri-edit-2-line" />
                          {t('app.categories.editProfile')}
                        </button>
                      </Td>
                    </Row>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </Card>
      </div>

      {editing && (
        <StudentExtrasModal
          studentId={editing}
          studentName={`${students.find((row) => row.id === editing)?.first_name ?? ''} ${
            students.find((row) => row.id === editing)?.last_name ?? ''
          }`.trim()}
          extras={extrasById.get(editing) ?? { ...emptyExtras, student_id: editing }}
          siblings={siblings}
          onClose={() => setEditing(null)}
          onSaved={state.reload}
        />
      )}
    </>
  );
}