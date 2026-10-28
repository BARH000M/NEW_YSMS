import { useTranslation } from 'react-i18next';
import type { DayTrend } from '@/utils/attendance';
import { Card } from '@/components/app/ui';

const weekday = (iso: string, lang: string) => {
  const locale = lang === 'ar' ? 'ar-YE' : lang === 'zh' ? 'zh-CN' : 'en-GB';
  try {
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(iso));
  } catch {
    return iso.slice(5);
  }
};

export default function AttendanceTrend({ trend }: { trend: DayTrend[] }) {
  const { t, i18n } = useTranslation();
  const maxRate = Math.max(100, ...trend.map((day) => day.rate));

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-sm font-semibold text-foreground-900">{t('app.attendance.trendTitle')}</h2>
        <span className="text-[11px] text-foreground-500">{t('app.attendance.trendHint')}</span>
      </div>
      <div className="flex items-end justify-between gap-2 h-40">
        {trend.map((day) => {
          const height = day.total === 0 ? 4 : Math.max(8, Math.round((day.rate / maxRate) * 140));
          const tone =
            day.total === 0
              ? 'bg-background-200'
              : day.rate >= 90
                ? 'bg-secondary-500'
                : day.rate >= 80
                  ? 'bg-accent-500'
                  : 'bg-primary-500';
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
              <span className="text-[11px] font-semibold text-foreground-700 tabular-nums">
                {day.total === 0 ? '—' : `${day.rate}%`}
              </span>
              <div className="w-full flex items-end justify-center" style={{ height: 140 }}>
                <div
                  className={`w-7 md:w-9 rounded-t-md ${tone}`}
                  style={{ height }}
                  title={`${day.present}/${day.total}`}
                />
              </div>
              <span className="text-[10px] text-foreground-500 truncate max-w-full">
                {weekday(day.date, i18n.language)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}