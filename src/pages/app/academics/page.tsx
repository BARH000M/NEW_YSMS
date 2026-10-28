import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { fetchClassSubjects, fetchClasses, fetchSections, fetchStaff, fetchSubjects } from '@/api/college';
import { fetchTimetable, removeClassSubject } from '@/api/campus';
import { formatDate } from '@/utils/date';
import ExportBar from '@/components/app/ExportBar';
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
import { AssignSubjectModal, ClassModal, SectionModal, SubjectModal } from './components/AcademicModals';
import TimetablePanel from './components/TimetablePanel';

type ModalKind = 'class' | 'section' | 'subject' | 'assign' | null;

export default function AcademicsPage() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState('classes');
  const [modal, setModal] = useState<ModalKind>(null);

  const state = useAsync(async () => {
    const [classes, sections, subjects, assignments, staff, slots] = await Promise.all([
      fetchClasses(),
      fetchSections(),
      fetchSubjects(),
      fetchClassSubjects(),
      fetchStaff(),
      fetchTimetable(),
    ]);
    return { classes, sections, subjects, assignments, staff, slots };
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

  const { classes, sections, subjects, assignments, staff, slots } = state.data;

  const addButton = (label: string, kind: Exclude<ModalKind, null>) => (
    <button
      type="button"
      onClick={() => setModal(kind)}
      className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
    >
      <i className="ri-add-line" />
      {label}
    </button>
  );

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { key: 'classes', label: t('app.acad.classes'), count: classes.length },
              { key: 'sections', label: t('app.acad.sections'), count: sections.length },
              { key: 'subjects', label: t('app.acad.subjects'), count: subjects.length },
              { key: 'assignments', label: t('app.acad.assignments'), count: assignments.length },
              { key: 'timetable', label: t('app.acad.timetable') },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            {tab === 'classes' && (
              <>
                <ExportBar
                  title={t('app.acad.classList')}
                  fileName="class-list"
                  columns={[t('app.acad.className'), t('app.acad.level'), t('app.acad.capacity'), t('app.acad.sections')]}
                  rows={classes.map((klass) => [
                    klass.name,
                    klass.level ?? '—',
                    klass.capacity,
                    sections.filter((section) => section.class_id === klass.id).length,
                  ])}
                />
                {addButton(t('app.acad.addClass'), 'class')}
              </>
            )}
            {tab === 'sections' && (
              <>
                <ExportBar
                  title={t('app.acad.sectionList')}
                  fileName="section-list"
                  columns={[t('app.acad.className'), t('app.acad.sections'), t('app.acad.room'), t('app.acad.teacher')]}
                  rows={sections.map((section) => [
                    classOfSection.get(section.id) ?? '—',
                    section.name,
                    section.room ?? '—',
                    staffName.get(section.class_teacher_id ?? '') ?? t('app.acad.noTeacher'),
                  ])}
                />
                {addButton(t('app.acad.addSection'), 'section')}
              </>
            )}
            {tab === 'subjects' && (
              <>
                <ExportBar
                  title={t('app.acad.subjectList')}
                  fileName="subject-list"
                  columns={[t('app.acad.code'), t('app.acad.subjects'), t('app.acad.subjectType'), t('app.acad.creditHours')]}
                  rows={subjects.map((subject) => [
                    subject.code ?? '—',
                    subject.name,
                    subject.subject_type === 'practical' ? t('app.acad.practical') : t('app.acad.theory'),
                    subject.credit_hours,
                  ])}
                />
                {addButton(t('app.acad.addSubject'), 'subject')}
              </>
            )}
            {tab === 'assignments' && (
              <>
                <ExportBar
                  title={t('app.acad.assignList')}
                  fileName="subject-assignments"
                  columns={[t('app.acad.className'), t('app.acad.sections'), t('app.acad.subjects'), t('app.acad.teacher')]}
                  rows={assignments.map((assignment) => [
                    classOfSection.get(assignment.section_id) ?? '—',
                    sectionName.get(assignment.section_id) ?? '—',
                    subjectName.get(assignment.subject_id) ?? '—',
                    staffName.get(assignment.teacher_id ?? '') ?? t('app.acad.noTeacher'),
                  ])}
                />
                {addButton(t('app.acad.assignSubject'), 'assign')}
              </>
            )}
          </div>
        </div>
      </Card>

      {tab === 'classes' && (
        <Card>
          {classes.length === 0 ? (
            <EmptyState icon="ri-building-4-line" label={t('app.acad.noClasses')} />
          ) : (
            <TableWrap>
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.acad.className')}</Th>
                  <Th>{t('app.acad.level')}</Th>
                  <Th>{t('app.acad.capacity')}</Th>
                  <Th>{t('app.acad.sections')}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {classes.map((klass) => (
                  <Row key={klass.id}>
                    <Td className="text-sm font-medium text-foreground-950">{klass.name}</Td>
                    <Td className="text-xs tabular-nums">{klass.level ?? '—'}</Td>
                    <Td className="text-xs tabular-nums">{klass.capacity ?? '—'}</Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-1">
                        {sections.filter((section) => section.class_id === klass.id).length === 0 ? (
                          <span className="text-xs text-foreground-400">—</span>
                        ) : (
                          sections
                            .filter((section) => section.class_id === klass.id)
                            .map((section) => (
                              <Badge key={section.id} tone="secondary">
                                {section.name}
                              </Badge>
                            ))
                        )}
                      </div>
                    </Td>
                    <Td>
                      <button
                        type="button"
                        onClick={() => setModal('section')}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:text-primary-700 whitespace-nowrap cursor-pointer"
                      >
                        <i className="ri-add-line" />
                        {t('app.acad.addSection')}
                      </button>
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
            <EmptyState icon="ri-layout-grid-line" label={t('app.acad.noSectionsYet')} />
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
                    <Td className="text-xs text-foreground-600">
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
            <EmptyState icon="ri-book-open-line" label={t('app.acad.noSubjects')} />
          ) : (
            <TableWrap>
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.acad.code')}</Th>
                  <Th>{t('app.acad.subjects')}</Th>
                  <Th>{t('app.acad.subjectType')}</Th>
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
                    <Td>
                      <Badge tone={subject.subject_type === 'practical' ? 'accent' : 'secondary'}>
                        {subject.subject_type === 'practical' ? t('app.acad.practical') : t('app.acad.theory')}
                      </Badge>
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
            <EmptyState icon="ri-user-star-line" label={t('app.acad.noAssignments')} />
          ) : (
            <TableWrap>
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.acad.className')}</Th>
                  <Th>{t('app.acad.sections')}</Th>
                  <Th>{t('app.acad.subjects')}</Th>
                  <Th>{t('app.acad.teacher')}</Th>
                  <Th>{t('app.common.actions')}</Th>
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
                    <Td>
                      <button
                        type="button"
                        onClick={async () => {
                          await removeClassSubject(assignment.id);
                          state.reload();
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-md border border-background-300 text-foreground-600 hover:border-primary-400 cursor-pointer"
                        aria-label={t('app.common.delete')}
                      >
                        <i className="ri-delete-bin-line text-sm" />
                      </button>
                    </Td>
                  </Row>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      )}

      {tab === 'timetable' && (
        <TimetablePanel
          classes={classes}
          sections={sections}
          subjects={subjects}
          staff={staff}
          slots={slots}
          onChanged={state.reload}
        />
      )}

      {tab === 'classes' && classes.length > 0 ? (
        <p className="text-[11px] text-foreground-500 mt-3">
          {t('app.acad.yearNote', { date: formatDate(new Date().toISOString(), i18n.language) })}
        </p>
      ) : null}

      {modal === 'class' && (
        <ClassModal
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            state.reload();
          }}
        />
      )}
      {modal === 'section' && (
        <SectionModal
          classes={classes}
          staff={staff}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            state.reload();
          }}
        />
      )}
      {modal === 'subject' && (
        <SubjectModal
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            state.reload();
          }}
        />
      )}
      {modal === 'assign' && (
        <AssignSubjectModal
          classes={classes}
          sections={sections}
          subjects={subjects}
          staff={staff}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            state.reload();
          }}
        />
      )}
    </>
  );
}