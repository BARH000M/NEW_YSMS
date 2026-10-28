import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { HEALTH_ROLES, runDatabaseHealth } from '@/api/databaseHealth';
import type { HealthCategory, HealthCheck } from '@/api/databaseHealth';
import ExportBar from '@/components/app/ExportBar';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  StatCard,
  Tabs,
  TableWrap,
  Td,
  Th,
} from '@/components/app/ui';

type Filter = HealthCategory | 'all';

/** Small pill showing where the row lives and what it should have matched. */
function TableRoute({ check }: { check: HealthCheck }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-foreground-500">
      <code className="bg-background-100 border border-background-200 rounded px-1 py-0.5">{check.table}</code>
      {check.parent ? (
        <>
          <i className="ri-arrow-right-line text-[10px]" />
          <code className="bg-background-100 border border-background-200 rounded px-1 py-0.5">{check.parent}</code>
        </>
      ) : (
        <span className="text-foreground-400">/ group key</span>
      )}
    </span>
  );
}

function CheckCard({ check }: { check: HealthCheck }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const clean = check.count === 0;
  const isOrphan = check.category === 'orphan';

  return (
    <Card className={clean ? 'border-secondary-200' : 'border-accent-300'}>
      <div className="flex items-start justify-between gap-3 p-3 md:p-4">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              clean
                ? 'bg-secondary-100 text-secondary-800'
                : isOrphan
                  ? 'bg-accent-100 text-accent-900'
                  : 'bg-primary-100 text-primary-800'
            }`}
          >
            <i className={`${clean ? 'ri-checkbox-circle-line' : isOrphan ? 'ri-link-unlink' : 'ri-file-copy-2-line'} text-base`} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground-950 leading-snug">
              {t(`app.health.check.${check.key}`)}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <TableRoute check={check} />
              <Badge tone={isOrphan ? 'accent' : 'primary'}>
                {isOrphan ? t('app.health.orphanTag') : t('app.health.duplicateTag')}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`font-heading text-lg tabular-nums ${
              clean ? 'text-secondary-700' : 'text-foreground-950'
            }`}
          >
            {check.count}
          </span>
          {!clean ? (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              className="inline-flex items-center gap-1 border border-background-300 hover:border-primary-400 text-foreground-800 text-[11px] font-semibold px-2.5 py-1.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className={open ? 'ri-arrow-up-s-line' : 'ri-list-check-2'} />
              {open ? t('app.common.close') : t('app.health.inspect')}
            </button>
          ) : (
            <span className="text-[11px] font-semibold text-secondary-700 whitespace-nowrap">
              {t('app.health.clean')}
            </span>
          )}
        </div>
      </div>

      {open && !clean && (
        <div className="border-t border-background-200 bg-background-100/60">
          <ul className="divide-y divide-background-200">
            {check.rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 md:px-4 py-2">
                <span className="text-xs font-medium text-foreground-900 min-w-0 break-words">{row.label}</span>
                <span className="text-[11px] text-foreground-600 tabular-nums break-words">{row.detail}</span>
              </li>
            ))}
          </ul>
          <p className="px-3 md:px-4 py-2 text-[10px] text-foreground-500">
            {t('app.health.showing', {
              shown: Math.min(check.count, 25),
              total: check.count,
            })}
          </p>
        </div>
      )}
    </Card>
  );
}

export default function DatabaseHealthPage() {
  const { t } = useTranslation();
  const { role } = useAuth();
  const allowed = Boolean(role && HEALTH_ROLES.includes(role));
  const [filter, setFilter] = useState<Filter>('all');
  const state = useAsync(async () => (allowed ? runDatabaseHealth() : null), [allowed]);

  const report = state.data;

  const visible = useMemo(() => {
    if (!report) return [] as HealthCheck[];
    const list =
      filter === 'all' ? report.checks : report.checks.filter((check) => check.category === filter);
    // Problems first, biggest first, clean checks last.
    return [...list].sort((a, b) => {
      if (a.count === 0 && b.count > 0) return 1;
      if (b.count === 0 && a.count > 0) return -1;
      return b.count - a.count;
    });
  }, [report, filter]);

  if (!allowed) {
    return (
      <>
        <PageHeader title={t('app.health.title')} subtitle={t('app.health.subtitle')} />
        <Card className="p-6 text-center">
          <span className="w-10 h-10 mx-auto rounded-full bg-accent-100 text-accent-900 flex items-center justify-center">
            <i className="ri-shield-user-line text-lg" />
          </span>
          <h3 className="text-sm font-semibold text-foreground-950 mt-3">{t('app.health.forbiddenTitle')}</h3>
          <p className="text-xs text-foreground-600 mt-1">{t('app.health.forbiddenBody')}</p>
        </Card>
      </>
    );
  }

  if (state.loading) return <LoadingBlock />;
  if (state.error || !report) {
    return <ErrorState message={state.error ?? t('app.common.errorDesc')} onRetry={state.reload} />;
  }

  const flagged = report.checks.filter((check) => check.count > 0);
  const exportRows = flagged.flatMap((check) => [
    [
      t(`app.health.check.${check.key}`),
      check.category === 'orphan' ? t('app.health.orphanTag') : t('app.health.duplicateTag'),
      check.table,
      check.parent ?? '—',
      check.count,
    ],
  ]);

  return (
    <>
      <PageHeader
        title={t('app.health.title')}
        subtitle={t('app.health.subtitle')}
        action={
          <>
            <ExportBar
              title={t('app.health.title')}
              fileName="database-health"
              columns={[
                t('app.health.finding'),
                t('app.health.kind'),
                t('app.health.table'),
                t('app.health.expectedParent'),
                t('app.health.rows'),
              ]}
              rows={exportRows}
              hint={`${t('app.health.orphans')}: ${report.orphans} · ${t('app.health.duplicates')}: ${report.duplicates}`}
              summary={[
                { label: t('app.health.orphans'), value: String(report.orphans) },
                { label: t('app.health.duplicates'), value: String(report.duplicates) },
                { label: t('app.health.checksRun'), value: `${report.cleanChecks}/${report.totalChecks}` },
              ]}
            />
            <button
              type="button"
              onClick={state.reload}
              className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-refresh-line" />
              {t('app.health.runAgain')}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard
          label={t('app.health.totalIssues')}
          value={report.orphans + report.duplicates}
          icon="ri-heart-pulse-line"
          tone={report.orphans + report.duplicates > 0 ? 'danger' : 'secondary'}
        />
        <StatCard label={t('app.health.orphans')} value={report.orphans} icon="ri-link-unlink" tone="accent" />
        <StatCard
          label={t('app.health.duplicates')}
          value={report.duplicates}
          icon="ri-file-copy-2-line"
          tone="primary"
        />
        <StatCard
          label={t('app.health.checksRun')}
          value={`${report.cleanChecks}/${report.totalChecks}`}
          icon="ri-shield-check-line"
          tone="secondary"
          hint={t('app.health.tablesScanned', { count: report.tablesScanned })}
        />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <Tabs
            items={[
              { key: 'all', label: t('app.health.filterAll'), count: report.checks.length },
              {
                key: 'orphan',
                label: t('app.health.orphans'),
                count: report.checks.filter((check) => check.category === 'orphan').length,
              },
              {
                key: 'duplicate',
                label: t('app.health.duplicates'),
                count: report.checks.filter((check) => check.category === 'duplicate').length,
              },
            ]}
            value={filter}
            onChange={(key) => setFilter(key as Filter)}
          />
          <p className="text-[11px] text-foreground-500 leading-relaxed max-w-xl">
            {t('app.health.readOnlyNote')}
          </p>
        </div>
      </Card>

      {visible.length === 0 ? (
        <Card>
          <EmptyState label={t('app.health.empty')} icon="ri-shield-check-line" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {visible.map((check) => (
            <CheckCard key={check.key} check={check} />
          ))}
        </div>
      )}

      {flagged.length > 0 && (
        <Card className="mt-3 md:mt-4">
          <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-3 border-b border-background-200">
            <h2 className="text-sm font-semibold text-foreground-900">{t('app.health.summaryTitle')}</h2>
            <Badge tone="danger">{flagged.length}</Badge>
          </div>
          <TableWrap minWidth={720}>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th>{t('app.health.finding')}</Th>
                <Th>{t('app.health.kind')}</Th>
                <Th>{t('app.health.table')}</Th>
                <Th>{t('app.health.expectedParent')}</Th>
                <Th>{t('app.health.rows')}</Th>
              </tr>
            </thead>
            <tbody>
              {flagged.map((check) => (
                <tr
                  key={check.key}
                  className="border-b border-background-100 last:border-b-0 hover:bg-background-100/60"
                >
                  <Td className="text-xs">{t(`app.health.check.${check.key}`)}</Td>
                  <Td>
                    <Badge tone={check.category === 'orphan' ? 'accent' : 'primary'}>
                      {check.category === 'orphan' ? t('app.health.orphanTag') : t('app.health.duplicateTag')}
                    </Badge>
                  </Td>
                  <Td className="text-[11px]">
                    <code className="text-foreground-700">{check.table}</code>
                  </Td>
                  <Td className="text-[11px]">
                    <code className="text-foreground-700">{check.parent ?? '—'}</code>
                  </Td>
                  <Td className="text-xs font-semibold tabular-nums">{check.count}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
      )}
    </>
  );
}