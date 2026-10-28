import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { fetchAttendanceSince, fetchClasses, fetchSections, fetchStudents } from '@/api/college';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import {
  Card,
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

export default function AttendanceByDatePage() {
  const { t } = useTranslation();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const base = useAsync(async () => {
    const [students, sections, classes] = await Promise.all([fetchStudents(), fetchSections(), fetchClasses()]);
    return { students, sections, classes };
  }, []);

  const dayState = useAsync(() => fetchAttendanceSince(date), [date]);

  const students = base.data?.students ?? [];
  const sections = base.data?.sections ?? [];
  const classes = base.data?.classes ?? [];
  const dayRows = useMemo(
    () => (dayState.data ?? []).filter((row) => row.attendance_date === date),
    [dayState.data, date],
  );

  const rows = useMemo(() => {
    const classNameOf = (classId: string) => classes.find((klass) => klass.id === classId)?.name ?? '—';
    return sections
      .map((section) => {
        const roster = students.filter((student) => student.section_id === section.id);
        const marks = dayRows.filter((row) => row.section_id === section.id);
        const present = marks.filter((row) => row.status === 'present').length;
        const late = marks.filter((row) => row.status === 'late').length;
        const absent = marks.filter((row) => row.status === 'absent').length;
        const excused = marks.filter((row) => row.status === 'excused').length;
        const rate = marks.length ? Math.round(((present + late) / marks.length) * 100) : 0;
        return {
          id: section.id,
          label: `${classNameOf(section.class_id)} / ${section.name}`.replace(/^ \//, ''),
          room: section.room,
          roster: roster.length,
          marked: marks.length,
          present,
          late,
          absent,
          excused,
          rate,
          unmarked: Math.max(0, roster.length - marks.length),
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [sections, students, dayRows, classes]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          roster: acc.roster + row.roster,
          marked: acc.marked + row.marked,
          present: acc.present + row.present,
          absent: acc.absent + row.absent,
          unmarked: acc.unmarked + row.unmarked,
        }),
        { roster: 0, marked: 0, present: 0, absent: 0, unmarked: 0 },
      ),
    [rows],
  );

  const overallRate = totals.marked ? Math.round((totals.present / totals.marked) * 100) : 0;

  if (base.loading) return <LoadingBlock />;
  if (base.error) return <ErrorState message={base.error} onRetry={base.reload} />;

  return (
    <>
      <PageHeader title={t('app.attByDate.title')} subtitle={t('app.attByDate.subtitle')} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.attByDate.registered')} value={totals.roster} icon="ri-group-line" tone="primary" />
        <StatCard label={t('app.attByDate.marked')} value={totals.marked} icon="ri-checkbox-multiple-line" tone="secondary" />
        <StatCard label={t('app.attByDate.unmarked')} value={totals.unmarked} icon="ri-question-line" tone="accent" />
        <StatCard label={t('app.attendance.rate')} value={`${overallRate}%`} icon="ri-pie-chart-line" tone="neutral" />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:max-w-lg">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="by-date">
              {t('app.attendance.date')}
            </label>
            <input
              id="by-date"
              type="date"
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setDate(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0 justify-end">
            <span className="text-[11px] text-foreground-500">{t('app.attByDate.hint')}</span>
          </div>
        </div>
      </Card>

      <Card className="mb-3 md:mb-4">
        {dayState.loading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState icon="ri-calendar-2-line" />
        ) : (
          <TableWrap>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th>{t('app.reports.section')}</Th>
                <Th>{t('app.attByDate.roster')}</Th>
                <Th>{t('app.attendance.present')}</Th>
                <Th>{t('app.attendance.absent')}</Th>
                <Th>{t('app.attendance.late')}</Th>
                <Th>{t('app.attendance.excused')}</Th>
                <Th>{t('app.attByDate.unmarked')}</Th>
                <Th>{t('app.attendance.rate')}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Row key={row.id}>
                  <Td>
                    <p className="text-sm font-medium text-foreground-950 truncate max-w-[180px]">{row.label}</p>
                    <p className="text-[11px] text-foreground-500">{row.room ?? '—'}</p>
                  </Td>
                  <Td className="text-xs tabular-nums">{row.roster}</Td>
                  <Td className="text-xs tabular-nums font-semibold text-foreground-900">{row.present}</Td>
                  <Td className="text-xs tabular-nums">{row.absent}</Td>
                  <Td className="text-xs tabular-nums">{row.late}</Td>
                  <Td className="text-xs tabular-nums">{row.excused}</Td>
                  <Td className="text-xs tabular-nums">{row.unmarked}</Td>
                  <Td className="w-40">
                    <ProgressRow value={row.rate} />
                  </Td>
                </Row>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </>
  );
}