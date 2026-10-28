import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchAttendanceSince,
  fetchClassSubjects,
  fetchClasses,
  fetchExamSubjects,
  fetchSections,
  fetchStaff,
  fetchStudents,
} from '@/api/college';
import { fetchAssignments } from '@/api/operations';
import { recentSchoolDays } from '@/utils/attendance';
import { formatDate } from '@/utils/date';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import ExportBar from '@/components/app/ExportBar';
import {
  Avatar,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  ProgressRow,
  Row,
  StatCard,
  TableWrap,
  Td,
  Th,
} from '@/components/app/ui';

export default function TeacherPortalPage() {
  const { t, i18n } = useTranslation();
  const { user, role } = useAuth();
  const [teacherId, setTeacherId] = useState('');

  const state = useAsync(async () => {
    const [staff, sections, classes, students, assignments, examPapers, attendance, assignmentsOwned] =
      await Promise.all([
        fetchStaff(),
        fetchSections(),
        fetchClasses(),
        fetchStudents(),
        fetchClassSubjects(),
        fetchExamSubjects(),
        fetchAttendanceSince(recentSchoolDays(21)[0]),
        fetchAssignments(),
      ]);
    return { staff, sections, classes, students, assignments, examPapers, attendance, assignmentsOwned };
  }, []);

  const staff = state.data?.staff ?? [];
  const myStaff = useMemo(
    () => (user ? staff.find((member) => member.profile_id === user.id) ?? null : null),
    [staff, user],
  );

  // A teacher lands straight on their own register; admins can inspect anyone.
  useEffect(() => {
    if (teacherId || !state.data) return;
    if (myStaff) setTeacherId(myStaff.id);
    else if (staff[0]) setTeacherId(staff[0].id);
  }, [state.data, myStaff, staff, teacherId]);

  const teacher = staff.find((member) => member.id === teacherId) ?? null;

  const mySectionIds = useMemo(() => {
    if (!teacher || !state.data) return new Set<string>();
    const ids = new Set<string>();
    state.data.sections.forEach((section) => {
      if (section.class_teacher_id === teacher.id) ids.add(section.id);
    });
    state.data.assignments.forEach((assignment) => {
      if (assignment.teacher_id === teacher.id) ids.add(assignment.section_id);
    });
    return ids;
  }, [teacher, state.data]);

  const classes = state.data?.classes ?? [];
  const sections = state.data?.sections ?? [];
  const students = state.data?.students ?? [];
  const attendance = state.data?.attendance ?? [];
  const examPapers = state.data?.examPapers ?? [];
  const assignmentsOwned = state.data?.assignmentsOwned ?? [];

  const mySections = useMemo(
    () => sections.filter((section) => mySectionIds.has(section.id)),
    [sections, mySectionIds],
  );

  const myStudents = useMemo(
    () => students.filter((student) => student.section_id && mySectionIds.has(student.section_id)),
    [students, mySectionIds],
  );

  const myAttendance = useMemo(
    () => attendance.filter((record) => record.section_id && mySectionIds.has(record.section_id)),
    [attendance, mySectionIds],
  );

  const attendanceRate = myAttendance.length
    ? Math.round(
        (myAttendance.filter((record) => record.status === 'present' || record.status === 'late').length /
          myAttendance.length) *
          100,
      )
    : 0;

  const today = new Date().toISOString().slice(0, 10);
  const myExams = useMemo(
    () =>
      examPapers
        .filter((paper) => paper.section_id && mySectionIds.has(paper.section_id) && paper.exam_date && paper.exam_date >= today)
        .sort((a, b) => String(a.exam_date).localeCompare(String(b.exam_date)))
        .slice(0, 6),
    [examPapers, mySectionIds, today],
  );

  const myAssignments = useMemo(
    () =>
      assignmentsOwned
        .filter((item) => item.section_id && mySectionIds.has(item.section_id))
        .slice(0, 5),
    [assignmentsOwned, mySectionIds],
  );

  const classNameOf = (classId: string) => classes.find((klass) => klass.id === classId)?.name ?? '—';

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  return (
    <>
      <PageHeader
        title={t('app.portal.teacherTitle')}
        subtitle={t('app.portal.teacherSubtitle')}
        action={
          <>
            <ExportBar
              title={`${t('app.portal.teacherTitle')} — ${teacher?.full_name ?? ''}`}
              fileName={`teacher-portal-${teacher?.staff_no ?? 'sections'}`}
              columns={[
                t('app.reports.section'),
                t('app.portal.students'),
                t('app.attendance.rate'),
              ]}
              rows={mySections.map((section) => {
                const roster = students.filter((student) => student.section_id === section.id).length;
                const marks = myAttendance.filter((record) => record.section_id === section.id);
                const rate = marks.length
                  ? Math.round(
                      (marks.filter((record) => record.status === 'present' || record.status === 'late').length /
                        marks.length) *
                        100,
                    )
                  : 0;
                return [`${classNameOf(section.class_id)} / ${section.name}`, roster, `${rate}%`];
              })}
              summary={[
                { label: t('app.portal.myStudents'), value: String(myStudents.length) },
                { label: t('app.portal.mySections'), value: String(mySections.length) },
                { label: t('app.attendance.rate'), value: `${attendanceRate}%` },
              ]}
            />
            {role === 'teacher' && myStaff ? null : (
              <div className="flex flex-col gap-1 min-w-[200px]">
                <label className={labelClass} htmlFor="teacher-pick">
                  {t('app.portal.viewAs')}
                </label>
                <select
                  id="teacher-pick"
                  value={teacherId}
                  onChange={(event) => setTeacherId(event.target.value)}
                  className={inputClass}
                >
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        }
      />

      {!teacher ? (
        <Card>
          <EmptyState icon="ri-presentation-line" label={t('app.portal.noTeacher')} />
        </Card>
      ) : (
        <>
          <Card className="p-4 mb-3 md:mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <Avatar name={teacher.full_name} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground-950">{teacher.full_name}</p>
                <p className="text-[11px] text-foreground-500">
                  {teacher.designation ?? '—'} · {teacher.department ?? '—'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 ms-auto">
                <Badge tone="primary">{t('app.portal.sectionsCount', { count: mySections.length })}</Badge>
                <Badge tone="accent">{t('app.portal.studentsCount', { count: myStudents.length })}</Badge>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
            <StatCard label={t('app.portal.myStudents')} value={myStudents.length} icon="ri-group-line" tone="primary" />
            <StatCard label={t('app.portal.mySections')} value={mySections.length} icon="ri-layout-grid-line" tone="secondary" />
            <StatCard label={t('app.attendance.rate')} value={`${attendanceRate}%`} icon="ri-calendar-check-line" tone="accent" />
            <StatCard label={t('app.portal.upcomingExams')} value={myExams.length} icon="ri-draft-line" tone="neutral" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
            <Card className="lg:col-span-2">
              <CardHeader
                title={t('app.portal.mySections')}
                action={
                  <Link
                    to="/app/attendance"
                    className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 cursor-pointer"
                  >
                    {t('app.portal.openRegister')}
                  </Link>
                }
              />
              {mySections.length === 0 ? (
                <EmptyState icon="ri-layout-grid-line" label={t('app.portal.noSections')} />
              ) : (
                <TableWrap>
                  <thead className="bg-background-100 border-b border-background-200">
                    <tr>
                      <Th>{t('app.reports.section')}</Th>
                      <Th>{t('app.portal.students')}</Th>
                      <Th>{t('app.attendance.rate')}</Th>
                      <Th>{t('app.common.actions')}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {mySections.map((section) => {
                      const roster = students.filter((student) => student.section_id === section.id).length;
                      const marks = myAttendance.filter((record) => record.section_id === section.id);
                      const rate = marks.length
                        ? Math.round(
                            (marks.filter((record) => record.status === 'present' || record.status === 'late').length /
                              marks.length) *
                              100,
                          )
                        : 0;
                      return (
                        <Row key={section.id}>
                          <Td className="text-sm font-medium text-foreground-950 whitespace-nowrap">
                            {classNameOf(section.class_id)} / {section.name}
                          </Td>
                          <Td className="text-xs tabular-nums">{roster}</Td>
                          <Td className="w-40">
                            <ProgressRow value={rate} />
                          </Td>
                          <Td>
                            <div className="flex items-center gap-1">
                              <Link
                                to="/app/attendance"
                                className="w-8 h-8 flex items-center justify-center rounded-md border border-background-300 text-foreground-700 hover:border-primary-400 cursor-pointer"
                                aria-label={t('app.nav.attendance')}
                              >
                                <i className="ri-calendar-check-line text-sm" />
                              </Link>
                              <Link
                                to="/app/exams/marks"
                                className="w-8 h-8 flex items-center justify-center rounded-md border border-background-300 text-foreground-700 hover:border-primary-400 cursor-pointer"
                                aria-label={t('app.nav.marks')}
                              >
                                <i className="ri-edit-2-line text-sm" />
                              </Link>
                            </div>
                          </Td>
                        </Row>
                      );
                    })}
                  </tbody>
                </TableWrap>
              )}
            </Card>

            <div className="flex flex-col gap-3 md:gap-4">
              <Card>
                <CardHeader title={t('app.portal.upcomingExams')} />
                <div className="p-2">
                  {myExams.length === 0 && <EmptyState icon="ri-draft-line" />}
                  {myExams.map((paper) => (
                    <div
                      key={paper.id}
                      className="flex items-start justify-between gap-2 px-2 py-2.5 border-b border-background-100 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground-900 truncate">
                          {paper.subjects?.name ?? t('app.nav.exams')}
                        </p>
                        <p className="text-[11px] text-foreground-500 truncate">
                          {paper.sections?.name ?? '—'} · {paper.start_time ?? '—'}
                        </p>
                      </div>
                      <span className="text-[11px] text-foreground-600 whitespace-nowrap">
                        {paper.exam_date ? formatDate(paper.exam_date, i18n.language) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <CardHeader
                  title={t('app.lms.assignmentsTitle')}
                  action={
                    <Link
                      to="/app/lms/assignments"
                      className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 cursor-pointer"
                    >
                      {t('app.common.view')}
                    </Link>
                  }
                />
                <div className="p-2">
                  {myAssignments.length === 0 && <EmptyState icon="ri-task-line" />}
                  {myAssignments.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-2 px-2 py-2.5 border-b border-background-100 last:border-b-0"
                    >
                      <p className="text-xs font-medium text-foreground-900 truncate min-w-0">{item.title}</p>
                      <span className="text-[11px] text-foreground-500 whitespace-nowrap">
                        {item.due_date ? formatDate(item.due_date, i18n.language) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  );
}