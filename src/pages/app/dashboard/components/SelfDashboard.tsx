import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { attendanceRate, fetchSelfPortal, fullName } from '@/api/portal';
import type { SelfStudent } from '@/api/portal';
import { formatMoney } from '@/utils/money';
import { Badge, Card, CardHeader, EmptyState, ErrorState, LoadingBlock, PageHeader, ProgressRow } from '@/components/app/ui';
import type { AppRole } from '@/api/types';
import QuickLinks from './QuickLinks';

function ChildCard({ student }: { student: SelfStudent }) {
  const { t, i18n } = useTranslation();
  const rate = attendanceRate(student.attendance);
  const best = student.results.slice(0, 3);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground-950 truncate">{fullName(student, i18n.language === 'ar')}</p>
          <p className="text-[11px] text-foreground-500 truncate">
            {student.sections?.classes?.name ?? '—'} / {student.sections?.name ?? '—'}
          </p>
        </div>
        <Badge tone="accent">{student.student_no ?? '—'}</Badge>
      </div>

      <div className="flex flex-col gap-2.5 mt-3">
        <div className="flex items-center justify-between text-[11px] text-foreground-600">
          <span>{t('app.attendance.rate')}</span>
          <b className="text-foreground-900 tabular-nums">{rate}%</b>
        </div>
        <ProgressRow value={rate} />
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-md bg-background-100 border border-background-200 px-2.5 py-2">
            <p className="text-foreground-500">{t('app.portal.billed')}</p>
            <p className="text-xs font-semibold text-foreground-950 tabular-nums">{formatMoney(student.finance.billed)}</p>
          </div>
          <div className="rounded-md bg-background-100 border border-background-200 px-2.5 py-2">
            <p className="text-foreground-500">{t('app.portal.outstanding')}</p>
            <p className="text-xs font-semibold text-primary-800 tabular-nums">
              {formatMoney(student.finance.outstanding)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[11px] font-semibold text-foreground-600 mb-1.5">{t('app.portal.latestResults')}</p>
        {best.length === 0 ? (
          <p className="text-[11px] text-foreground-500">{t('app.portal.noResults')}</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {best.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-foreground-800 truncate">{row.subject || '—'}</span>
                <span className="tabular-nums text-foreground-600 shrink-0">
                  {row.marks}/{row.max} · {row.grade ?? '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link
        to="/app/portal/student"
        className="inline-flex items-center gap-1.5 mt-3 text-[11px] font-semibold text-primary-600 hover:text-primary-700 cursor-pointer"
      >
        <i className="ri-arrow-right-line" />
        {t('app.dash.openPortal')}
      </Link>
    </Card>
  );
}

/** Student / parent landing page — the staff dashboard never mounts for them. */
export default function SelfDashboard({ role }: { role: AppRole }) {
  const { t } = useTranslation();
  const state = useAsync(() => fetchSelfPortal(), []);
  const isParent = role === 'parent';

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  const students = state.data?.students ?? [];
  const linked = state.data?.linked && students.length > 0;

  return (
    <>
      <PageHeader
        title={isParent ? t('app.dash.parentTitle') : t('app.dash.studentTitle')}
        subtitle={isParent ? t('app.dash.parentSubtitle') : t('app.dash.studentSubtitle')}
      />

      <QuickLinks role={role} limit={4} />

      {!linked ? (
        <Card>
          <EmptyState icon="ri-link-m" label={t('app.portal.notLinkedTitle')} />
          <p className="px-6 pb-6 text-xs text-foreground-600 text-center max-w-lg mx-auto">
            {t('app.portal.notLinkedBody')}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
          {students.map((student) => (
            <ChildCard key={student.id} student={student} />
          ))}
        </div>
      )}
    </>
  );
}