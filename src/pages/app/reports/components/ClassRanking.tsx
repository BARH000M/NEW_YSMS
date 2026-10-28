import { useTranslation } from 'react-i18next';
import { Card, CardHeader } from '@/components/app/ui';

export interface RankedStudent {
  id: string;
  rank: number;
  name: string;
  studentNo: string | null;
  className: string;
  percentage: number;
  grade: string;
  passed: boolean;
}

const rankTone = (rank: number) => {
  if (rank === 1) return 'bg-accent-500 text-foreground-950';
  if (rank === 2) return 'bg-secondary-500 text-background-50';
  if (rank === 3) return 'bg-primary-300 text-foreground-950';
  return 'bg-background-200 text-foreground-700';
};

export default function ClassRanking({
  rows,
  onSelect,
  onExport,
}: {
  rows: RankedStudent[];
  onSelect?: (studentId: string) => void;
  onExport?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader
        title={t('app.reports.ranking')}
        action={
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-foreground-500">{t('app.reports.rankingNote')}</span>
            {onExport ? (
              <button
                type="button"
                onClick={onExport}
                disabled={rows.length === 0}
                title={t('app.reports.exportRanking')}
                aria-label={t('app.reports.exportRanking')}
                className="w-7 h-7 flex items-center justify-center rounded-md border border-background-300 text-foreground-600 hover:text-primary-700 hover:border-primary-400 disabled:opacity-50 cursor-pointer"
              >
                <i className="ri-download-2-line text-xs" />
              </button>
            ) : null}
          </div>
        }
      />
      <div className="p-4 md:p-5">
        {rows.length === 0 ? (
          <p className="text-xs text-foreground-500">{t('app.reports.rankingEmpty')}</p>
        ) : (
          <ol className="flex flex-col">
            {rows.map((student) => (
              <li
                key={student.id}
                className="flex items-center gap-3 py-2 border-b border-background-100 last:border-b-0"
              >
                <span
                  className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold tabular-nums ${rankTone(
                    student.rank,
                  )}`}
                >
                  {student.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground-950 truncate">{student.name}</p>
                  <p className="text-[10px] text-foreground-500 truncate">
                    {student.className}
                    {student.studentNo ? ` · ${student.studentNo}` : ''}
                  </p>
                </div>
                <div className="text-end shrink-0">
                  <p className="text-xs font-bold text-foreground-950 tabular-nums">{student.percentage}%</p>
                  <p
                    className={`text-[10px] font-semibold ${
                      student.passed ? 'text-secondary-700' : 'text-primary-700'
                    }`}
                  >
                    {student.grade}
                  </p>
                </div>
                {onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(student.id)}
                    aria-label={t('app.reports.print')}
                    title={t('app.reports.print')}
                    className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md border border-background-300 text-foreground-600 hover:text-primary-700 hover:border-primary-400 cursor-pointer"
                  >
                    <i className="ri-printer-line text-xs" />
                  </button>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  );
}