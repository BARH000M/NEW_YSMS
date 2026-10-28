import { useTranslation } from 'react-i18next';
import { Card, EmptyState } from '@/components/app/ui';

export interface ClassAttendanceRow {
  classId: string;
  className: string;
  students: number;
  records: number;
  rate: number;
}

export default function AttendanceByClass({ rows }: { rows: ClassAttendanceRow[] }) {
  const { t } = useTranslation();

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-sm font-semibold text-foreground-900">{t('app.reports.attendanceTitle')}</h2>
        <span className="text-[11px] text-foreground-500">{t('app.reports.attendanceHint')}</span>
      </div>
      {rows.length === 0 ? (
        <EmptyState label={t('app.reports.attendanceEmpty')} icon="ri-calendar-check-line" />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => {
            const tone =
              row.rate >= 90 ? 'bg-secondary-500' : row.rate >= 80 ? 'bg-accent-500' : 'bg-primary-500';
            return (
              <div key={row.classId} className="min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-medium text-foreground-800 truncate">{row.className}</span>
                  <span className="text-xs font-bold text-foreground-900 tabular-nums shrink-0">{row.rate}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-background-200 overflow-hidden">
                  <div className={`h-full rounded-full ${tone}`} style={{ width: `${row.rate}%` }} />
                </div>
                <p className="text-[10px] text-foreground-500 mt-1 tabular-nums">
                  {row.students} {t('app.reports.studentsShort')} · {row.records} {t('app.reports.recordsShort')}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}