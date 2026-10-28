import { useTranslation } from 'react-i18next';
import { Card, CardHeader } from '@/components/app/ui';

const bands = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'];

const barTone = (grade: string) => {
  if (grade === 'F') return 'bg-primary-500';
  if (grade.startsWith('A')) return 'bg-accent-500';
  if (grade.startsWith('B')) return 'bg-secondary-500';
  if (grade.startsWith('C')) return 'bg-primary-300';
  return 'bg-secondary-300';
};

export default function GradeDistribution({
  counts,
  total,
}: {
  counts: Record<string, number>;
  total: number;
}) {
  const { t } = useTranslation();
  const peak = Math.max(1, ...bands.map((band) => counts[band] ?? 0));

  return (
    <Card>
      <CardHeader title={t('app.reports.distribution')} />
      <div className="p-4 md:p-5">
        {total === 0 ? (
          <p className="text-xs text-foreground-500">{t('app.reports.distributionEmpty')}</p>
        ) : (
          <>
            <div className="flex items-end justify-between gap-1.5 sm:gap-2.5 h-32">
              {bands.map((band) => {
                const count = counts[band] ?? 0;
                const height = count === 0 ? 3 : Math.max(8, Math.round((count / peak) * 100));
                return (
                  <div key={band} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1">
                    <span className="text-[10px] font-semibold text-foreground-600 tabular-nums">{count}</span>
                    <div
                      className={`w-full rounded-t-md ${barTone(band)}`}
                      style={{ height: `${height}%` }}
                      aria-hidden="true"
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-1.5 sm:gap-2.5 mt-2">
              {bands.map((band) => (
                <span
                  key={band}
                  className="flex-1 min-w-0 text-center text-[10px] sm:text-[11px] font-semibold text-foreground-700"
                >
                  {band}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-foreground-500 mt-3">
              {t('app.reports.distributionNote', { total })}
            </p>
          </>
        )}
      </div>
    </Card>
  );
}