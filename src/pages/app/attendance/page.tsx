import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchAttendanceForDay,
  fetchAttendanceSince,
  fetchClassSubjects,
  fetchClasses,
  fetchSections,
  fetchStaff,
  fetchStudents,
  saveAttendance,
} from '@/api/college';
import type { AttendanceInput, AttendanceStatus } from '@/api/college';
import {
  ATTENDANCE_STATUSES,
  buildTrend,
  recentSchoolDays,
  summarizeByStudent,
} from '@/utils/attendance';
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
import AttendanceTrend from './components/AttendanceTrend';
import FollowUpList from './components/FollowUpList';
import type { FollowUpRow } from './components/FollowUpList';

const WRITE_ROLES = ['super_admin', 'admin', 'teacher'];
const THRESHOLD = 80;

const statusStyle: Record<AttendanceStatus, { on: string; label: string }> = {
  present: { on: 'bg-secondary-500 text-background-50 border-secondary-500', label: 'app.attendance.present' },
  absent: { on: 'bg-primary-500 text-background-50 border-primary-500', label: 'app.attendance.absent' },
  late: { on: 'bg-accent-500 text-foreground-950 border-accent-500', label: 'app.attendance.late' },
  excused: { on: 'bg-foreground-700 text-background-50 border-foreground-700', label: 'app.attendance.excused' },
};

interface DraftRow {
  status: AttendanceStatus;
  remarks: string;
}

export default function AttendancePage() {
  const { t } = useTranslation();
  const { role, user } = useAuth();
  const canWrite = role ? WRITE_ROLES.includes(role) : false;

  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Record<string, DraftRow>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const base = useAsync(async () => {
    const [students, sections, classes, staff, assignments, history] = await Promise.all([
      fetchStudents(),
      fetchSections(),
      fetchClasses(),
      fetchStaff(),
      fetchClassSubjects(),
      fetchAttendanceSince(recentSchoolDays(10)[0]),
    ]);
    return { students, sections, classes, staff, assignments, history };
  }, []);

  const students = base.data?.students ?? [];
  const sections = base.data?.sections ?? [];
  const classes = base.data?.classes ?? [];
  const staff = base.data?.staff ?? [];
  const assignments = base.data?.assignments ?? [];
  const history = base.data?.history ?? [];

  /** The staff record linked to the signed-in account, if any. */
  const myStaff = useMemo(
    () => (user ? staff.find((member) => member.profile_id === user.id) ?? null : null),
    [staff, user],
  );

  /** Sections a teacher owns (class teacher) or teaches a subject in. */
  const mySectionIds = useMemo(() => {
    if (role !== 'teacher' || !myStaff) return null;
    const ids = new Set<string>();
    sections.forEach((section) => {
      if (section.class_teacher_id === myStaff.id) ids.add(section.id);
    });
    assignments.forEach((assignment) => {
      if (assignment.teacher_id === myStaff.id) ids.add(assignment.section_id);
    });
    return ids;
  }, [role, myStaff, sections, assignments]);

  const scopedToTeacher = mySectionIds !== null && mySectionIds.size > 0;

  const sectionOptions = useMemo(() => {
    const classNameOf = (classId: string) => classes.find((klass) => klass.id === classId)?.name ?? '';
    return sections
      .filter((section) => !scopedToTeacher || mySectionIds?.has(section.id))
      .map((section) => ({
        id: section.id,
        label: `${classNameOf(section.class_id)} / ${section.name}`.replace(/^ \//, ''),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [sections, classes, scopedToTeacher, mySectionIds]);

  // Default the section to the first one the user can see.
  useEffect(() => {
    if (!base.data || sectionId) return;
    if (sectionOptions[0]) setSectionId(sectionOptions[0].id);
  }, [base.data, sectionId, sectionOptions]);

  const sectionStudents = useMemo(
    () => students.filter((student) => student.section_id === sectionId),
    [students, sectionId],
  );

  // Load the chosen day's saved marks straight from the backend (fresh each time).
  const dayState = useAsync(async () => {
    if (!sectionId || !date) return [];
    return fetchAttendanceForDay(sectionId, date);
  }, [sectionId, date]);

  // Seed the grid: saved status wins, otherwise default everyone to "present".
  useEffect(() => {
    if (!sectionId) return;
    const saved = dayState.data ?? [];
    const next: Record<string, DraftRow> = {};
    sectionStudents.forEach((student) => {
      const record = saved.find((row) => row.student_id === student.id);
      next[student.id] = {
        status: (record?.status as AttendanceStatus) ?? 'present',
        remarks: record?.remarks ?? '',
      };
    });
    setDraft(next);
    setNotice(null);
    setError(null);
  }, [sectionId, date, dayState.data, sectionStudents]);

  const visibleStudents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return sectionStudents;
    return sectionStudents.filter((student) => {
      const name = `${student.first_name} ${student.last_name ?? ''} ${student.first_name_ar ?? ''}`.toLowerCase();
      return name.includes(needle) || (student.student_no ?? '').toLowerCase().includes(needle);
    });
  }, [sectionStudents, query]);

  const counts = useMemo(() => {
    const tally = { present: 0, absent: 0, late: 0, excused: 0 };
    sectionStudents.forEach((student) => {
      const status = draft[student.id]?.status ?? 'present';
      tally[status] += 1;
    });
    return tally;
  }, [sectionStudents, draft]);

  const dayRate = sectionStudents.length
    ? Math.round(((counts.present + counts.late) / sectionStudents.length) * 100)
    : 0;

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setDraft((current) => ({
      ...current,
      [studentId]: { ...(current[studentId] ?? { status: 'present', remarks: '' }), status },
    }));
    setNotice(null);
  };

  const setRemarks = (studentId: string, remarks: string) => {
    setDraft((current) => ({
      ...current,
      [studentId]: { ...(current[studentId] ?? { status: 'present', remarks: '' }), remarks },
    }));
  };

  const markAll = (status: AttendanceStatus) => {
    setDraft((current) => {
      const next = { ...current };
      sectionStudents.forEach((student) => {
        next[student.id] = { ...(next[student.id] ?? { status, remarks: '' }), status };
      });
      return next;
    });
    setNotice(null);
  };

  const handleSave = async () => {
    if (!sectionId || sectionStudents.length === 0) return;
    setError(null);
    setNotice(null);
    const rows: AttendanceInput[] = sectionStudents.map((student) => ({
      studentId: student.id,
      sectionId,
      status: draft[student.id]?.status ?? 'present',
      remarks: draft[student.id]?.remarks ?? '',
    }));
    setBusy(true);
    try {
      await saveAttendance(date, rows);
      setNotice(t('app.attendance.saved'));
      dayState.reload();
      base.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  // 7-day trend for the selected section (falls back to all visible sections).
  const trend = useMemo(() => {
    const days = recentSchoolDays(7);
    const scoped = sectionId
      ? history.filter((record) => record.section_id === sectionId)
      : history;
    return buildTrend(scoped, days);
  }, [history, sectionId]);

  // Under-80% follow-up list across the sections the user can see.
  const followUp = useMemo<FollowUpRow[]>(() => {
    const allowed = scopedToTeacher
      ? history.filter((record) => record.section_id && mySectionIds?.has(record.section_id))
      : history;
    const summary = summarizeByStudent(allowed);
    const classNameOf = (student: (typeof students)[number]) =>
      `${student.sections?.classes?.name ?? '—'}${student.sections ? ` / ${student.sections.name}` : ''}`;

    return students
      .map((student) => ({ student, stat: summary.get(student.id) }))
      .filter((item) => item.stat && item.stat.total >= 3 && item.stat.rate < THRESHOLD)
      .map((item) => ({
        id: item.student.id,
        name: `${item.student.first_name} ${item.student.last_name ?? ''}`.trim(),
        studentNo: item.student.student_no ?? null,
        className: classNameOf(item.student),
        rate: item.stat!.rate,
        absent: item.stat!.absent,
        total: item.stat!.total,
      }))
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 12);
  }, [history, students, scopedToTeacher, mySectionIds]);

  if (base.loading) return <LoadingBlock />;
  if (base.error || !base.data) {
    return <ErrorState message={base.error ?? t('app.common.errorDesc')} onRetry={base.reload} />;
  }

  return (
    <>
      <PageHeader
        title={t('app.attendance.title')}
        subtitle={t('app.attendance.subtitle')}
        action={
          canWrite ? (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={busy || !sectionId || sectionStudents.length === 0}
              className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-save-3-line" />
              {busy ? t('app.common.saving') : t('app.attendance.saveDay')}
            </button>
          ) : null
        }
      />

      {scopedToTeacher && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-accent-300 bg-accent-100 px-3 py-2 text-xs text-accent-950">
          <span className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
            <i className="ri-user-star-line" />
          </span>
          <span>{t('app.attendance.teacherScope')}</span>
        </div>
      )}
      {!canWrite && (
        <div className="mb-3 rounded-md border border-secondary-200 bg-secondary-100 px-3 py-2 text-xs text-secondary-900">
          {t('app.attendance.readOnly')}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.attendance.present')} value={counts.present} icon="ri-user-follow-line" tone="secondary" />
        <StatCard label={t('app.attendance.absent')} value={counts.absent} icon="ri-user-unfollow-line" tone="danger" />
        <StatCard label={t('app.attendance.late')} value={counts.late} icon="ri-time-line" tone="accent" />
        <StatCard label={t('app.attendance.rate')} value={`${dayRate}%`} icon="ri-pie-chart-line" tone="primary" />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="att-section">
              {t('app.reports.section')}
            </label>
            <select
              id="att-section"
              value={sectionId}
              onChange={(event) => setSectionId(event.target.value)}
              className={inputClass}
            >
              {sectionOptions.length === 0 && <option value="">{t('app.common.noData')}</option>}
              {sectionOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="att-date">
              {t('app.attendance.date')}
            </label>
            <input
              id="att-date"
              type="date"
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setDate(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="att-search">
              {t('app.common.search')}
            </label>
            <div id="att-search">
              <SearchBox value={query} onChange={setQuery} />
            </div>
          </div>
        </div>

        {canWrite && sectionStudents.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-background-200">
            <span className="text-[11px] font-semibold text-foreground-600">{t('app.attendance.quickMark')}:</span>
            {ATTENDANCE_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => markAll(status)}
                className="inline-flex items-center gap-1 rounded-full border border-background-300 hover:border-primary-400 px-3 py-1 text-[11px] font-semibold text-foreground-700 cursor-pointer whitespace-nowrap"
              >
                {t('app.attendance.allAs', { status: t(statusStyle[status].label) })}
              </button>
            ))}
          </div>
        )}
      </Card>

      {error && (
        <p className="mb-3 text-xs text-primary-900 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">{error}</p>
      )}
      {notice && (
        <p className="mb-3 text-xs text-secondary-900 bg-secondary-100 border border-secondary-200 rounded-md px-3 py-2">
          {notice}
        </p>
      )}

      <Card className="mb-3 md:mb-4">
        {dayState.loading ? (
          <LoadingBlock />
        ) : visibleStudents.length === 0 ? (
          <EmptyState label={t('app.attendance.noStudents')} icon="ri-user-search-line" />
        ) : (
          <TableWrap>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th>{t('app.common.name')}</Th>
                <Th>{t('app.students.studentNo')}</Th>
                <Th>{t('app.common.status')}</Th>
                <Th>{t('app.marks.remarks')}</Th>
              </tr>
            </thead>
            <tbody>
              {visibleStudents.map((student) => {
                const entry = draft[student.id] ?? { status: 'present' as AttendanceStatus, remarks: '' };
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
                      <div className="flex flex-wrap items-center gap-1">
                        {ATTENDANCE_STATUSES.map((status) => {
                          const active = entry.status === status;
                          return (
                            <button
                              key={status}
                              type="button"
                              disabled={!canWrite}
                              onClick={() => setStatus(student.id, status)}
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition-colors ${
                                canWrite ? 'cursor-pointer' : 'cursor-default'
                              } ${
                                active
                                  ? statusStyle[status].on
                                  : 'bg-background-50 text-foreground-600 border-background-300 hover:border-primary-400'
                              }`}
                            >
                              {t(statusStyle[status].label)}
                            </button>
                          );
                        })}
                      </div>
                    </Td>
                    <Td>
                      <input
                        type="text"
                        value={entry.remarks}
                        disabled={!canWrite}
                        onChange={(event) => setRemarks(student.id, event.target.value)}
                        placeholder={t('app.marks.remarks')}
                        className="w-full sm:w-48 box-border bg-background-50 border border-background-300 rounded-md px-2 py-1.5 text-xs text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 disabled:opacity-60"
                      />
                    </Td>
                  </Row>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        <AttendanceTrend trend={trend} />
        <FollowUpList rows={followUp} />
      </div>
    </>
  );
}