import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { fetchClassSubjects, fetchClasses, fetchSections, fetchStaff, fetchSubjects } from '@/api/college';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Row,
  StatCard,
  TableWrap,
  Tabs,
  Td,
  Th,
} from '@/components/app/ui';

export default function AcademicsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('classes');

  const state = useAsync(async () => {
    const [classes, sections, subjects, assignments, staff] = await Promise.all([
      fetchClasses(),
      fetchSections(),
      fetchSubjects(),
      fetchClassSubjects(),
      fetchStaff(),
    ]);
    return { classes, sections, subjects, assignments, staff };
  }, []);

  const staffName = useMemo(() => {
    const map = new Map<string, string>();
    (state.data?.staff ?? []).forEach((member) => map.set(member.id, member.full_name));
    return map;
  }, [state.data]);

  const sectionName = useMemo(() => {
    const map = new Map<string, string>();
    (state.data?.sections ?? []).forEach((section) => map.set(section.id, section.name));
    return map;
  }, [state.data]);

  const classOfSection = useMemo(() => {
    const map = new Map<string, string>();
    const classById = new Map<string, string>();
    (state.data?.classes ?? []).forEach((klass) => classById.set(klass.id, klass.name));
    (state.data?.sections ?? []).forEach((section) => map.set(section.id, classById.get(section.class_id) ?? '—'));
    return map;
  }, [state.data]);

  const subjectName = useMemo(() => {
    const map = new Map<string, string>();
    (state.data?.subjects ?? []).forEach((subject) => map.set(subject.id, subject.name));
    return map;
  }, [state.data]);

  if (state.loading) return <LoadingBlock />;
  if (state.error || !state.data) return <ErrorState message={state.error ?? 'No data'} onRetry={state.reload} />;

  const { classes, sections, subjects, assignments } = state.data;

  return (
    <>
      <PageHeader title={t('app.acad.title')} subtitle={t('app.acad.subtitle')} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.acad.classes')} value={classes.length} icon="ri-building-4-line" tone="primary" />
        <StatCard label={t('app.acad.sections')} value={sections.length} icon="ri-layout-grid-line" tone="secondary" />
        <StatCard label={t('app.acad.subjects')} value={subjects.length} icon="ri-book-open-line" tone="accent" />
        <StatCard label={t('app.acad.assignments')} value={assignments.length} icon="ri-user-star-line" tone="neutral" />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { key: 'classes', label: t('app.acad.classes'), count: classes.length },
            { key: 'sections', label: t('app.acad.sections'), count: sections.length },
            { key: 'subjects', label: t('app.acad.subjects'), count: subjects.length },
            { key: 'assignments', label: t('app.acad.assignments'), count: assignments.length },
          ]}
        />
      </Card>

      {tab === 'classes' && (
        <Card>
          {classes.length === 0 ? (
            <EmptyState />
          ) : (
            <TableWrap>
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.acad.className')}</Th>
                  <Th>{t('app.acad.level')}</Th>
                  <Th>{t('app.acad.capacity')}</Th>
                  <Th>{t('app.acad.sections')}</Th>
                </tr>
              </thead>
              <tbody>
                {classes.map((klass) => (
                  <Row key={klass.id}>
                    <Td className="text-sm font-medium text-foreground-950">{klass.name}</Td>
                    <Td className="text-xs tabular-nums">{klass.level ?? '—'}</Td>
                    <Td className="text-xs tabular-nums">{klass.capacity ?? '—'}</Td>
                    <Td>
                      <Badge tone="secondary">
                        {sections.filter((section) => section.class_id === klass.id).length}
                      </Badge>
                    </Td>
                  </Row>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      )}

      {tab === 'sections' && (
        <Card>
          {sections.length === 0 ? (
            <EmptyState />
          ) : (
            <TableWrap>
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.acad.className')}</Th>
                  <Th>{t('app.acad.sections')}</Th>
                  <Th>{t('app.acad.room')}</Th>
                  <Th>{t('app.acad.teacher')}</Th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section) => (
                  <Row key={section.id}>
                    <Td className="text-sm font-medium text-foreground-950">{classOfSection.get(section.id) ?? '—'}</Td>
                    <Td className="text-xs">{section.name}</Td>
                    <Td className="text-xs tabular-nums">{section.room ?? '—'}</Td>
                    <Td className="text-xs text-foreground-500">
                      {staffName.get(section.class_teacher_id ?? '') ?? t('app.acad.noTeacher')}
                    </Td>
                  </Row>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      )}

      {tab === 'subjects' && (
        <Card>
          {subjects.length === 0 ? (
            <EmptyState />
          ) : (
            <TableWrap>
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.acad.code')}</Th>
                  <Th>{t('app.acad.subjects')}</Th>
                  <Th>{t('app.acad.creditHours')}</Th>
                  <Th>{t('app.common.status')}</Th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject) => (
                  <Row key={subject.id}>
                    <Td>
                      <Badge tone="neutral">{subject.code ?? '—'}</Badge>
                    </Td>
                    <Td>
                      <p className="text-sm font-medium text-foreground-950">{subject.name}</p>
                      <p className="text-[11px] text-foreground-500">
                        {subject.name_ar ?? ''} {subject.name_zh ? `· ${subject.name_zh}` : ''}
                      </p>
                    </Td>
                    <Td className="text-xs tabular-nums">{subject.credit_hours}</Td>
                    <Td>
                      <Badge tone={subject.is_active ? 'secondary' : 'neutral'}>
                        {subject.is_active ? t('app.common.activeF') : t('app.common.inactive')}
                      </Badge>
                    </Td>
                  </Row>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      )}

      {tab === 'assignments' && (
        <Card>
          {assignments.length === 0 ? (
            <EmptyState />
          ) : (
            <TableWrap>
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.acad.className')}</Th>
                  <Th>{t('app.acad.sections')}</Th>
                  <Th>{t('app.acad.subjects')}</Th>
                  <Th>{t('app.acad.teacher')}</Th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <Row key={assignment.id}>
                    <Td className="text-sm text-foreground-950">{classOfSection.get(assignment.section_id) ?? '—'}</Td>
                    <Td className="text-xs">{sectionName.get(assignment.section_id) ?? '—'}</Td>
                    <Td className="text-xs">{subjectName.get(assignment.subject_id) ?? '—'}</Td>
                    <Td className="text-xs">
                      {assignment.teacher_id ? (
                        staffName.get(assignment.teacher_id) ?? '—'
                      ) : (
                        <span className="text-foreground-400">{t('app.acad.noTeacher')}</span>
                      )}
                    </Td>
                  </Row>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      )}
    </>
  );
}