import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import {
  countRows,
  fetchAdmissions,
  fetchComplaints,
  fetchEvents,
  fetchVisitors,
} from '@/api/college';
import { formatDate } from '@/utils/date';
import type { AppRole } from '@/api/types';
import {
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  StatCard,
  StatusPill,
} from '@/components/app/ui';
import QuickLinks from './QuickLinks';

const STATUS_ORDER = ['new', 'contacted', 'documents_pending', 'interview', 'accepted', 'rejected', 'enrolled'];

const statusBarTone: Record<string, string> = {
  new: 'bg-accent-500',
  contacted: 'bg-primary-400',
  documents_pending: 'bg-primary-500',
  interview: 'bg-primary-600',
  accepted: 'bg-secondary-500',
  rejected: 'bg-primary-800',
  enrolled: 'bg-secondary-700',
};

export default function StaffDashboard({ role }: { role: AppRole | null }) {
  const { t, i18n } = useTranslation();

  const state = useAsync(async () => {
    const [studentCount, staffCount, subjectCount, sectionCount, admissions, complaints, visitors, events] =
      await Promise.all([
        countRows('students'),
        countRows('staff'),
        countRows('subjects'),
        countRows('sections'),
        fetchAdmissions(),
        fetchComplaints(),
        fetchVisitors(),
        fetchEvents(),
      ]);
    return { studentCount, staffCount, subjectCount, sectionCount, admissions, complaints, visitors, events };
  }, []);

  if (state.loading) return <LoadingBlock />;
  if (state.error || !state.data) return <ErrorState message={state.error ?? 'No data'} onRetry={state.reload} />;

  const { studentCount, staffCount, subjectCount, sectionCount, admissions, complaints, visitors, events } = state.data;

  const openComplaints = complaints.filter((c) => c.status === 'new' || c.status === 'investigating').length;
  const todayKey = new Date().toISOString().slice(0, 10);
  const visitorsToday = visitors.filter((v) => (v.in_at ?? '').slice(0, 10) === todayKey).length;

  const byStatus = STATUS_ORDER.map((status) => ({
    status,
    count: admissions.filter((a) => a.status === status).length,
  }));
  const maxStatus = Math.max(1, ...byStatus.map((b) => b.count));

  const upcoming = events
    .filter((e) => new Date(e.starts_at).getTime() >= Date.now() - 86400000)
    .slice(0, 4);
  const latestComplaints = complaints.slice(0, 4);
  const latestVisitors = visitors.slice(0, 4);

  return (
    <>
      <PageHeader title={t('app.dash.title')} subtitle={t('app.dash.subtitle')} />

      <QuickLinks role={role} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard label={t('app.dash.students')} value={studentCount} icon="ri-user-3-line" tone="primary" />
        <StatCard label={t('app.dash.staff')} value={staffCount} icon="ri-team-line" tone="secondary" />
        <StatCard label={t('app.dash.admissions')} value={admissions.length} icon="ri-file-list-3-line" tone="accent" />
        <StatCard label={t('app.dash.openCases')} value={openComplaints} icon="ri-error-warning-line" tone="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 mt-3 md:mt-4">
        <Card className="lg:col-span-2">
          <CardHeader title={t('app.dash.admissionsByStatus')} />
          <div className="p-4 md:p-5 flex flex-col gap-2.5">
            {byStatus.map((row) => (
              <div key={row.status} className="flex items-center gap-3">
                <span className="w-28 md:w-36 shrink-0">
                  <StatusPill value={row.status} />
                </span>
                <div className="flex-1 h-2.5 rounded-full bg-background-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${statusBarTone[row.status] ?? 'bg-primary-500'}`}
                    style={{ width: `${Math.max(3, (row.count / maxStatus) * 100)}%` }}
                  />
                </div>
                <span className="w-7 text-end text-xs font-semibold text-foreground-800 tabular-nums">{row.count}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-background-200 pt-3 mt-1 text-xs text-foreground-600">
              <span>
                {t('app.dash.sections')}: <b className="text-foreground-900">{sectionCount}</b>
              </span>
              <span>
                {t('app.dash.subjects')}: <b className="text-foreground-900">{subjectCount}</b>
              </span>
              <span>
                {t('app.dash.visitorsToday')}: <b className="text-foreground-900">{visitorsToday}</b>
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={t('app.dash.upcomingEvents')} />
          <div className="p-4 flex flex-col gap-3">
            {upcoming.length === 0 && <EmptyState label={t('app.dash.noEvents')} icon="ri-calendar-line" />}
            {upcoming.map((event) => (
              <div key={event.id} className="flex gap-3">
                <div className="w-11 shrink-0 rounded-md bg-accent-100 border border-accent-300 py-1 text-center">
                  <p className="text-sm font-bold text-accent-950 leading-none">
                    {new Date(event.starts_at).getDate()}
                  </p>
                  <p className="text-[9px] text-accent-950/70 mt-0.5 uppercase">
                    {new Date(event.starts_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : i18n.language, {
                      month: 'short',
                    })}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground-900 truncate">{event.title}</p>
                  <p className="text-[11px] text-foreground-500 mt-0.5">
                    {t(`app.calendar.${event.type}`, { defaultValue: event.type })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mt-3 md:mt-4">
        <Card>
          <CardHeader
            title={t('app.dash.recentComplaints')}
            action={
              <Link to="/app/front-office" className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 cursor-pointer">
                {t('app.common.view')}
              </Link>
            }
          />
          <div className="p-2">
            {latestComplaints.length === 0 && <EmptyState />}
            {latestComplaints.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-2 py-2.5 border-b border-background-100 last:border-b-0">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground-900 truncate">{item.subject}</p>
                  <p className="text-[11px] text-foreground-500">
                    {item.reference_no ?? '—'} · {formatDate(item.created_at, i18n.language)}
                  </p>
                </div>
                <StatusPill value={item.status} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title={t('app.dash.recentVisitors')}
            action={
              <Link to="/app/front-office" className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 cursor-pointer">
                {t('app.common.view')}
              </Link>
            }
          />
          <div className="p-2">
            {latestVisitors.length === 0 && <EmptyState icon="ri-door-open-line" />}
            {latestVisitors.map((visitor) => (
              <div key={visitor.id} className="flex items-center justify-between gap-3 px-2 py-2.5 border-b border-background-100 last:border-b-0">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground-900 truncate">{visitor.name}</p>
                  <p className="text-[11px] text-foreground-500 truncate">{visitor.purpose ?? '—'}</p>
                </div>
                {visitor.out_at ? (
                  <span className="text-[11px] text-foreground-500">{formatDate(visitor.out_at, i18n.language)}</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-secondary-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary-500" />
                    {t('app.front.stillIn')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}