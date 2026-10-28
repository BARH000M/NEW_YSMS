import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { fetchAttendanceSince, fetchClasses, fetchInstitution, fetchSections, fetchStudents } from '@/api/college';
import type { AttendanceStatus } from '@/api/college';
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

const currentMonth = () => new Date().toISOString().slice(0, 7);

const daysInMonth = (month: string): number => {
  const [year, index] = month.split('-').map(Number);
  if (!year || !index) return 30;
  return new Date(year, index, 0).getDate();
};

/** P = present, L = late, A = absent, E = excused — the reference legend. */
const LETTER: Record<AttendanceStatus, string> = {
  present: 'P',
  absent: 'A',
  late: 'L',
  excused: 'E',
};

const LETTER_TONE: Record<AttendanceStatus, string> = {
  present: 'text-secondary-700',
  absent: 'text-primary-700',
  late: 'text-accent-800',
  excused: 'text-foreground-500',
};

export default function MonthlyAttendanceReportPage() {
  const { t } = useTranslation();

  const [month, setMonth] = useState(currentMonth());
  const [classId, setClassId] = useState('all');
  const [sectionId, setSectionId] = useState('all');
  const [query, setQuery] = useState('');
  const [printing, setPrinting] = useState(false);

  const state = useAsync(async () => {
    const [students, classes, sections, institution, attendance] = await Promise.all([
      fetchStudents(),
      fetchClasses(),
      fetchSections(),
      fetchInstitution(),
      fetchAttendanceSince(`${month}-01`),
    ]);
    return { students, classes, sections, institution, attendance };
  }, [month]);

  const students = state.data?.students ?? [];
  const classes = state.data?.classes ?? [];
  const sections = state.data?.sections ?? [];
  const totalDays = daysInMonth(month);
  const days = useMemo(() => Array.from({ length: totalDays }, (_, index) => index + 1), [totalDays]);

  useEffect(() => {
    setSectionId('all');
  }, [classId]);

  const sectionOptions = useMemo(
    () => sections.filter((section) => classId === 'all' || section.class_id === classId),
    [sections, classId],
  );

  /** studentId → day number → status, limited to the chosen month. */
  const marks = useMemo(() => {
    const map = new Map<string, Map<number, AttendanceStatus>>();
    (state.data?.attendance ?? []).forEach((record) => {
      if (!record.attendance_date.startsWith(month)) return;
      const day = Number(record.attendance_date.slice(8, 10));
      const inner = map.get(record.student_id) ?? new Map<number, AttendanceStatus>();
      inner.set(day, record.status);
      map.set(record.student_id, inner);
    });
    return map;
  }, [state.data, month]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return students
      .filter((student) => {
        if (classId !== 'all' && student.sections?.classes?.id !== classId) return false;
        if (sectionId !== 'all' && student.section_id !== sectionId) return false;
        if (!needle) return true;
        const name = `${student.first_name} ${student.last_name ?? ''}`.toLowerCase();
        return name.includes(needle) || (student.student_no ?? '').toLowerCase().includes(needle);
      })
      .map((student) => {
        const record = marks.get(student.id) ?? new Map<number, AttendanceStatus>();
        let present = 0;
        let absent = 0;
        let late = 0;
        let excused = 0;
        days.forEach((day) => {
          const status = record.get(day);
          if (status === 'present') present += 1;
          else if (status === 'late') late += 1;
          else if (status === 'absent') absent += 1;
          else if (status === 'excused') excused += 1;
        });
        const marked = present + absent + late + excused;
        return {
          id: student.id,
          name: `${student.first_name} ${student.last_name ?? ''}`.trim(),
          studentNo: student.student_no ?? '',
          classSection: `${student.sections?.classes?.name ?? '—'} / ${student.sections?.name ?? '—'}`,
          record,
          present,
          absent,
          late,
          excused,
          marked,
          rate: marked === 0 ? 0 : Math.round(((present + late) / marked) * 100),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, classId, sectionId, query, marks, month, totalDays]);

  const totals = rows.reduce(
    (acc, row) => ({
      present: acc.present + row.present + row.late,
      absent: acc.absent + row.absent,
      marked: acc.marked + row.marked,
    }),
    { present: 0, absent: 0, marked: 0 },
  );
  const overallRate = totals.marked === 0 ? 0 : Math.round((totals.present / totals.marked) * 100);

  const columns = [
    t('app.fees.student'),
    t('app.students.studentNo'),
    ...days.map((day) => String(day)),
    t('app.attStu.present'),
    t('app.attStu.absent'),
    t('app.attendance.rate'),
  ];

  const exportRows = rows.map((row) => [
    row.name,
    row.studentNo,
    ...days.map((day) => {
      const status = row.record.get(day);
      return status ? LETTER[status] : '';
    }),
    row.present + row.late,
    row.absent,
    `${row.rate}%`,
  ]);

  const classLabel = classes.find((item) => item.id === classId)?.name ?? t('app.common.all');
  const sectionLabel =
    sectionId === 'all' ? t('app.common.all') : sections.find((item) => item.id === sectionId)?.name ?? '';

  if (state.loading) return <LoadingBlock />;
  if (state.error || !state.data) {
    return <ErrorState message={state.error ?? t('app.common.errorDesc')} onRetry={state.reload} />;
  }

  const legend = (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-foreground-700">
      {(['present', 'late', 'absent', 'excused'] as AttendanceStatus[]).map((status) => (
        <span key={status} className="inline-flex items-center gap-1">
          <span className={`w-4 h-4 flex items-center justify-center font-bold ${LETTER_TONE[status]}`}>
            {LETTER[status]}
          </span>
          {t(`app.attendance.${status}`)}
        </span>
      ))}
    </div>
  );

  return (
    <>
      <PageHeader
        title={t('app.attStu.title')}
        subtitle={t('app.attStu.subtitle')}
        action={
          <>
            <ExportBar
              title={`${t('app.attStu.title')} — ${month}`}
              fileName={`attendance-${classLabel}-${month}`}
              columns={columns}
              rows={exportRows}
              hint={`${month} · ${classLabel} · ${sectionLabel}`}
              summary={[
                { label: t('app.attStu.present'), value: String(totals.present) },
                { label: t('app.attStu.absent'), value: String(totals.absent) },
                { label: t('app.attendance.rate'), value: `${overallRate}%` },
              ]}
            />
            <button
              type="button"
              onClick={() => setPrinting(true)}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-printer-line" />
              {t('app.print.printRecord')}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.attStu.students')} value={rows.length} icon="ri-group-line" tone="primary" />
        <StatCard label={t('app.attStu.present')} value={totals.present} icon="ri-checkbox-circle-line" tone="secondary" />
        <StatCard label={t('app.attStu.absent')} value={totals.absent} icon="ri-close-circle-line" tone="danger" />
        <StatCard label={t('app.attendance.rate')} value={`${overallRate}%`} icon="ri-pie-chart-line" tone="accent" />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="att-month">
              {t('app.attStu.month')}
            </label>
            <input
              id="att-month"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value || currentMonth())}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="att-class">
              {t('app.reports.class')}
            </label>
            <select
              id="att-class"
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
            <label className={labelClass} htmlFor="att-section">
              {t('app.reports.section')}
            </label>
            <select
              id="att-section"
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
            <label className={labelClass} htmlFor="att-search">
              {t('app.common.search')}
            </label>
            <div id="att-search">
              <SearchBox value={query} onChange={setQuery} />
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-background-200">{legend}</div>
      </Card>

      <Card>
        {rows.length === 0 ? (
          <EmptyState label={t('app.attStu.empty')} icon="ri-calendar-check-line" />
        ) : (
          <TableWrap>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th className="sticky start-0 bg-background-100 z-10">{t('app.fees.student')}</Th>
                <Th>{t('app.students.studentNo')}</Th>
                {days.map((day) => (
                  <Th key={day} className="!px-1 text-center">
                    {day}
                  </Th>
                ))}
                <Th>{t('app.attStu.present')}</Th>
                <Th>{t('app.attStu.absent')}</Th>
                <Th>{t('app.attendance.rate')}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-background-100 last:border-b-0 hover:bg-background-100/60">
                  <Td className="sticky start-0 bg-background-50 whitespace-nowrap">
                    <p className="text-xs font-medium text-foreground-950 truncate max-w-[160px]">{row.name}</p>
                    <p className="text-[10px] text-foreground-500">{row.classSection}</p>
                  </Td>
                  <Td className="text-[11px] tabular-nums whitespace-nowrap">{row.studentNo || '—'}</Td>
                  {days.map((day) => {
                    const status = row.record.get(day);
                    return (
                      <td key={day} className="px-1 py-2 text-center text-[11px] font-semibold">
                        {status ? (
                          <span className={LETTER_TONE[status]}>{LETTER[status]}</span>
                        ) : (
                          <span className="text-background-400">·</span>
                        )}
                      </td>
                    );
                  })}
                  <Td className="text-xs tabular-nums whitespace-nowrap font-semibold text-secondary-700">
                    {row.present + row.late}
                  </Td>
                  <Td className="text-xs tabular-nums whitespace-nowrap text-primary-700">{row.absent}</Td>
                  <Td className="text-xs tabular-nums whitespace-nowrap font-semibold">{row.rate}%</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>

      {printing && (
        <PrintSheet title={t('app.attStu.title')} hint={`${month} · ${classLabel} · ${sectionLabel}`} onClose={() => setPrinting(false)}>
          <ReportDocument
            institution={state.data.institution}
            title={t('app.attStu.docTitle')}
            subtitle={t('app.attStu.subtitle')}
            meta={[
              { label: t('app.attStu.month'), value: month },
              { label: t('app.reports.class'), value: classLabel },
              { label: t('app.reports.section'), value: sectionLabel },
              { label: t('app.attStu.students'), value: String(rows.length) },
              { label: t('app.attStu.present'), value: String(totals.present) },
              { label: t('app.attStu.absent'), value: String(totals.absent) },
              { label: t('app.attendance.rate'), value: `${overallRate}%` },
            ]}
          >
            <p className="text-[9px] text-foreground-600 mb-1">
              P = {t('app.attendance.present')} · L = {t('app.attendance.late')} · A = {t('app.attendance.absent')} · E ={' '}
              {t('app.attendance.excused')}
            </p>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-background-100">
                  <th className="text-start text-[8px] font-bold uppercase text-foreground-700 px-1 py-1 border-b border-background-300">
                    {t('app.fees.student')}
                  </th>
                  {days.map((day) => (
                    <th
                      key={day}
                      className="text-center text-[8px] font-bold text-foreground-700 px-0.5 py-1 border-b border-background-300"
                    >
                      {day}
                    </th>
                  ))}
                  <th className="text-end text-[8px] font-bold uppercase text-foreground-700 px-1 py-1 border-b border-background-300">
                    P
                  </th>
                  <th className="text-end text-[8px] font-bold uppercase text-foreground-700 px-1 py-1 border-b border-background-300">
                    A
                  </th>
                  <th className="text-end text-[8px] font-bold uppercase text-foreground-700 px-1 py-1 border-b border-background-300">
                    %
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-1 py-0.5 text-[8px] border-b border-background-200 whitespace-nowrap max-w-[110px] truncate">
                      {row.name}
                    </td>
                    {days.map((day) => {
                      const status = row.record.get(day);
                      return (
                        <td key={day} className="px-0.5 py-0.5 text-center text-[8px] border-b border-background-200">
                          {status ? LETTER[status] : ''}
                        </td>
                      );
                    })}
                    <td className="px-1 py-0.5 text-[8px] text-end border-b border-background-200 tabular-nums">
                      {row.present + row.late}
                    </td>
                    <td className="px-1 py-0.5 text-[8px] text-end border-b border-background-200 tabular-nums">
                      {row.absent}
                    </td>
                    <td className="px-1 py-0.5 text-[8px] text-end border-b border-background-200 tabular-nums">
                      {row.rate}%
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="px-1 py-1 text-[9px] font-bold border-t border-foreground-900">
                    {t('app.common.total')}
                  </td>
                  <td colSpan={days.length} className="border-t border-foreground-900" />
                  <td className="px-1 py-1 text-[9px] text-end font-bold border-t border-foreground-900 tabular-nums">
                    {totals.present}
                  </td>
                  <td className="px-1 py-1 text-[9px] text-end font-bold border-t border-foreground-900 tabular-nums">
                    {totals.absent}
                  </td>
                  <td className="px-1 py-1 text-[9px] text-end font-bold border-t border-foreground-900 tabular-nums">
                    {overallRate}%
                  </td>
                </tr>
              </tbody>
            </table>
          </ReportDocument>
        </PrintSheet>
      )}
    </>
  );
}