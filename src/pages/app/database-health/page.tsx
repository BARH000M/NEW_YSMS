import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { HEALTH_ROLES, runDatabaseHealth } from '@/api/databaseHealth';
import type { HealthCategory, HealthCheck } from '@/api/databaseHealth';
import {
  DEFAULT_DIGEST,
  fetchDigestSettings,
  fetchHealthReviewState,
  reopenHealthReview,
  saveDigestSettings,
  saveHealthReview,
  sendDigestNow,
} from '@/api/healthReview';
import type {
  DigestSettings,
  HealthReviewEvent,
  HealthReviewMap,
} from '@/api/healthReview';
import ExportBar from '@/components/app/ExportBar';
import CopyFindingsButton from './components/CopyFindingsButton';
import DigestPanel from './components/DigestPanel';
import HealthReviewNote from './components/HealthReviewNote';
import ReviewHistoryCard from './components/ReviewHistoryCard';
import SignOffSummaryCard from './components/SignOffSummaryCard';
import type { Tone } from '@/components/app/ui';
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

/** One place for how each family of finding looks, so nothing drifts apart. */
const CATEGORY_META: Record<
  HealthCategory,
  { tone: Tone; icon: string; tag: string; bubble: string; border: string }
> = {
  orphan: {
    tone: 'accent',
    icon: 'ri-link-unlink',
    tag: 'app.health.orphanTag',
    bubble: 'bg-accent-100 text-accent-950',
    border: 'border-accent-300',
  },
  duplicate: {
    tone: 'primary',
    icon: 'ri-file-copy-2-line',
    tag: 'app.health.duplicateTag',
    bubble: 'bg-primary-100 text-primary-800',
    border: 'border-primary-300',
  },
  mismatch: {
    tone: 'danger',
    icon: 'ri-money-dollar-circle-line',
    tag: 'app.health.mismatchTag',
    bubble: 'bg-primary-100 text-primary-900',
    border: 'border-primary-300',
  },
};

/** "just now" / "4 min ago" — the sweep is fresh, so relative reads better. */
function relativeRun(iso: string, language: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  try {
    const format = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
    if (minutes < 60) return format.format(-minutes, 'minute');
    const hours = Math.round(minutes / 60);
    if (hours < 24) return format.format(-hours, 'hour');
    return format.format(-Math.round(hours / 24), 'day');
  } catch {
    return new Date(iso).toLocaleTimeString();
  }
}

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

function CheckCard({
  check,
  review,
  events,
  saving,
  onSave,
  onReopen,
}: {
  check: HealthCheck;
  review?: HealthReviewMap[string];
  events: HealthReviewEvent[];
  saving: boolean;
  onSave: (note: string) => Promise<void>;
  onReopen: (reason: string) => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const clean = check.count === 0;
  const meta = CATEGORY_META[check.category];

  return (
    <Card className={clean ? 'border-secondary-200' : meta.border}>
      <div className="flex items-start justify-between gap-3 p-3 md:p-4">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              clean ? 'bg-secondary-100 text-secondary-800' : meta.bubble
            }`}
          >
            <i className={`${clean ? 'ri-checkbox-circle-line' : meta.icon} text-base`} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground-950 leading-snug">
              {t(`app.health.check.${check.key}`)}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <TableRoute check={check} />
              <Badge tone={meta.tone}>{t(meta.tag)}</Badge>
              {review ? (
                <Badge tone="secondary">
                  <i className="ri-verified-badge-line" />
                  {t('app.health.reviewedBadge')}
                </Badge>
              ) : null}
            </div>
            <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-foreground-500">
              <i className="ri-time-line text-[11px]" />
              {t('app.health.lastRun', { time: relativeRun(check.ranAt, i18n.language) })}
            </p>
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

      {!clean && (
        <div className="flex items-start gap-2 border-t border-background-200 bg-background-100/50 px-3 md:px-4 py-2">
          <i className="ri-lightbulb-line text-[13px] text-accent-500 mt-px shrink-0" />
          <p className="text-[11px] leading-relaxed text-foreground-700 min-w-0">
            <span className="font-semibold text-foreground-900">{t('app.health.nextStepHint')}: </span>
            {t(`app.health.hint.${check.key}`)}
          </p>
        </div>
      )}

      <HealthReviewNote
        review={review}
        events={events}
        hasFindings={!clean}
        saving={saving}
        onSave={onSave}
        onReopen={onReopen}
      />

      {open && !clean && (
        <div className="border-t border-background-200 bg-background-50">
          <ul className="divide-y divide-background-200">
            {check.rows.slice(0, 25).map((row) => (
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
  const { t, i18n } = useTranslation();
  const { role, profile } = useAuth();
  const allowed = Boolean(role && HEALTH_ROLES.includes(role));
  const [filter, setFilter] = useState<Filter>('all');
  /** Sign-off view: any · not signed off · signed off · signed off by one person. */
  const [signOff, setSignOff] = useState('any');
  const state = useAsync(async () => (allowed ? runDatabaseHealth() : null), [allowed]);

  const [reviews, setReviews] = useState<HealthReviewMap>({});
  /** Every sign-off ever recorded for this page, newest first. */
  const [history, setHistory] = useState<HealthReviewEvent[]>([]);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const [digest, setDigest] = useState<DigestSettings>(DEFAULT_DIGEST);
  const [digestSaving, setDigestSaving] = useState(false);
  const [digestSending, setDigestSending] = useState(false);

  const institutionId = profile?.institution_id ?? null;
  const reviewerName = profile?.full_name ?? null;

  const loadSignOff = useCallback(async () => {
    if (!allowed) return;
    try {
      const [state, nextDigest] = await Promise.all([
        fetchHealthReviewState(),
        fetchDigestSettings(),
      ]);
      setReviews(state.reviews);
      setHistory(state.log);
      setDigest(nextDigest);
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : String(error));
    }
  }, [allowed]);

  useEffect(() => {
    void loadSignOff();
  }, [loadSignOff]);

  const report = state.data;

  const handleSaveReview = async (check: HealthCheck, note: string) => {
    setReviewError(null);
    setSavingKey(check.key);
    try {
      const next = await saveHealthReview({
        checkKey: check.key,
        note,
        findingCount: check.count,
        reviewerName,
        institutionId,
      });
      setReviews(next.reviews);
      setHistory(next.log);
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingKey(null);
    }
  };

  const handleReopenReview = async (check: HealthCheck, reason: string) => {
    setReviewError(null);
    setSavingKey(check.key);
    try {
      const next = await reopenHealthReview({
        checkKey: check.key,
        reason,
        institutionId,
        reviewerName,
      });
      setReviews(next.reviews);
      setHistory(next.log);
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingKey(null);
    }
  };

  const handleSaveDigest = async (next: DigestSettings) => {
    setDigestSaving(true);
    try {
      const saved = await saveDigestSettings(next, institutionId);
      setDigest(saved);
    } finally {
      setDigestSaving(false);
    }
  };

  const handleSendDigest = async (recipients: string[]): Promise<string> => {
    setDigestSending(true);
    try {
      const result = await sendDigestNow(recipients);
      if (!result.sent) return t('app.health.digestEmpty');
      const refreshed = await fetchDigestSettings().catch(() => digest);
      setDigest(refreshed);
      return t('app.health.digestSent', {
        count: result.recipients.length,
        findings: result.findings,
      });
    } finally {
      setDigestSending(false);
    }
  };

  /** Everyone who has signed at least one check off, so admins can filter by person. */
  const reviewers = useMemo(() => {
    const names = new Set<string>();
    Object.values(reviews).forEach((review) => {
      if (review.reviewedByName) names.add(review.reviewedByName);
    });
    // People who signed off earlier still belong in the list, even if the
    // check was cleared afterwards.
    history.forEach((event) => {
      if (event.byName) names.add(event.byName);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [reviews, history]);

  /** History grouped per check, so each card only renders its own timeline. */
  const historyByCheck = useMemo(() => {
    const map = new Map<string, HealthReviewEvent[]>();
    history.forEach((event) => {
      const bucket = map.get(event.checkKey) ?? [];
      bucket.push(event);
      map.set(event.checkKey, bucket);
    });
    return map;
  }, [history]);

  const visible = useMemo(() => {
    if (!report) return [] as HealthCheck[];
    const list =
      filter === 'all' ? report.checks : report.checks.filter((check) => check.category === filter);

    const reviewer = signOff.startsWith('by:') ? signOff.slice(3) : null;
    const bySignOff = list.filter((check) => {
      const review = reviews[check.key];
      if (signOff === 'outstanding') return !review;
      if (signOff === 'cleared') return Boolean(review);
      if (reviewer) {
        return (
          review?.reviewedByName === reviewer ||
          (historyByCheck.get(check.key) ?? []).some((event) => event.byName === reviewer)
        );
      }
      return true;
    });

    // Problems first, biggest first, clean checks last.
    return [...bySignOff].sort((a, b) => {
      if (a.count === 0 && b.count > 0) return 1;
      if (b.count === 0 && a.count > 0) return -1;
      return b.count - a.count;
    });
  }, [report, filter, signOff, reviews, historyByCheck]);

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
  const totalFindings = report.orphans + report.duplicates + report.mismatches;
  const signedOff = report.checks.filter((check) => Boolean(reviews[check.key])).length;

  const signOffText = (key: string): string => {
    const review = reviews[key];
    if (!review) return t('app.health.notReviewed');
    return review.note
      ? `${t('app.health.reviewedBadge')} — ${review.note}`
      : t('app.health.reviewedBadge');
  };

  /** Who cleared it and when — the bit a hand-off actually needs. */
  const signOffByText = (key: string): string => {
    const review = reviews[key];
    if (!review) return t('app.health.notReviewed');
    let date = review.reviewedAt;
    try {
      date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(
        new Date(review.reviewedAt),
      );
    } catch {
      // Keep the ISO stamp when the runtime has no locale data.
    }
    return `${review.reviewedByName ?? t('app.health.unknownReviewer')} · ${date}`;
  };

  const exportRows = flagged.map((check) => [
    t(`app.health.check.${check.key}`),
    t(CATEGORY_META[check.category].tag),
    check.table,
    check.parent ?? '—',
    check.count,
    t(`app.health.hint.${check.key}`),
    signOffByText(check.key),
    signOffText(check.key),
  ]);

  return (
    <>
      <PageHeader
        title={t('app.health.title')}
        subtitle={t('app.health.subtitle')}
        action={
          <>
            <CopyFindingsButton report={report} />
            <ExportBar
              title={t('app.health.title')}
              fileName="database-health"
              columns={[
                t('app.health.finding'),
                t('app.health.kind'),
                t('app.health.table'),
                t('app.health.expectedParent'),
                t('app.health.rows'),
                t('app.health.nextStepHint'),
                t('app.health.signedOffByCol'),
                t('app.health.reviewCol'),
              ]}
              rows={exportRows}
              hint={`${t('app.health.orphans')}: ${report.orphans} · ${t('app.health.duplicates')}: ${
                report.duplicates
              } · ${t('app.health.mismatches')}: ${report.mismatches}`}
              summary={[
                { label: t('app.health.orphans'), value: String(report.orphans) },
                { label: t('app.health.duplicates'), value: String(report.duplicates) },
                { label: t('app.health.mismatches'), value: String(report.mismatches) },
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

      {reviewError ? (
        <Card className="mb-3 md:mb-4 border-primary-300 bg-primary-100/40 px-4 py-2.5">
          <p className="text-[11px] text-primary-800">
            <i className="ri-error-warning-line me-1" />
            {t('app.health.reviewFailed')} — {reviewError}
          </p>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard
          label={t('app.health.totalIssues')}
          value={totalFindings}
          icon="ri-heart-pulse-line"
          tone={totalFindings > 0 ? 'danger' : 'secondary'}
        />
        <StatCard label={t('app.health.orphans')} value={report.orphans} icon="ri-link-unlink" tone="accent" />
        <StatCard
          label={t('app.health.duplicates')}
          value={report.duplicates}
          icon="ri-file-copy-2-line"
          tone="primary"
        />
        <StatCard
          label={t('app.health.mismatches')}
          value={report.mismatches}
          icon="ri-money-dollar-circle-line"
          tone={report.mismatches > 0 ? 'danger' : 'secondary'}
        />
        <StatCard
          label={t('app.health.checksRun')}
          value={`${report.cleanChecks}/${report.totalChecks}`}
          icon="ri-shield-check-line"
          tone="secondary"
          hint={`${t('app.health.tablesScanned', { count: report.tablesScanned })} · ${relativeRun(
            report.ranAt,
            i18n.language,
          )}`}
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
              {
                key: 'mismatch',
                label: t('app.health.mismatches'),
                count: report.checks.filter((check) => check.category === 'mismatch').length,
              },
            ]}
            value={filter}
            onChange={(key) => setFilter(key as Filter)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground-500 whitespace-nowrap">
                {t('app.health.signOffFilter')}
              </span>
              <select
                value={signOff}
                onChange={(event) => setSignOff(event.target.value)}
                className="bg-background-50 border border-background-300 rounded-md px-2 py-1.5 text-[11px] font-semibold text-foreground-800 focus:outline-none focus:ring-2 focus:ring-primary-400 cursor-pointer"
              >
                <option value="any">{t('app.health.signOffAny')}</option>
                <option value="outstanding">{t('app.health.signOffNotYet')}</option>
                <option value="cleared">{t('app.health.signOffCleared')}</option>
                {reviewers.map((name) => (
                  <option key={name} value={`by:${name}`}>
                    {t('app.health.signOffBy', { name })}
                  </option>
                ))}
              </select>
            </label>
            <Badge tone="secondary">
              <i className="ri-verified-badge-line" />
              {t('app.health.signedOffCount', { count: signedOff })}
            </Badge>
            <p className="text-[11px] text-foreground-500 leading-relaxed max-w-xl">
              {t('app.health.readOnlyNote')}
            </p>
          </div>
        </div>
      </Card>

      <DigestPanel
        settings={digest}
        saving={digestSaving}
        sending={digestSending}
        onSave={handleSaveDigest}
        onSendNow={handleSendDigest}
      />

      {visible.length === 0 ? (
        <Card>
          <EmptyState label={t('app.health.empty')} icon="ri-shield-check-line" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {visible.map((check) => (
            <CheckCard
              key={check.key}
              check={check}
              review={reviews[check.key]}
              events={historyByCheck.get(check.key) ?? []}
              saving={savingKey === check.key}
              onSave={(note) => handleSaveReview(check, note)}
              onReopen={(reason) => handleReopenReview(check, reason)}
            />
          ))}
        </div>
      )}

      <SignOffSummaryCard events={history} />

      <ReviewHistoryCard events={history} />

      {flagged.length > 0 && (
        <Card className="mt-3 md:mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 md:px-5 py-3 border-b border-background-200">
            <h2 className="text-sm font-semibold text-foreground-900">{t('app.health.summaryTitle')}</h2>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-foreground-500">
                {t('app.health.lastRun', { time: relativeRun(report.ranAt, i18n.language) })}
              </span>
              <Badge tone="danger">{flagged.length}</Badge>
            </div>
          </div>
          <TableWrap minWidth={1080}>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th>{t('app.health.finding')}</Th>
                <Th>{t('app.health.kind')}</Th>
                <Th>{t('app.health.table')}</Th>
                <Th>{t('app.health.expectedParent')}</Th>
                <Th>{t('app.health.rows')}</Th>
                <Th>{t('app.health.nextStepHint')}</Th>
                <Th>{t('app.health.reviewCol')}</Th>
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
                    <Badge tone={CATEGORY_META[check.category].tone}>{t(CATEGORY_META[check.category].tag)}</Badge>
                  </Td>
                  <Td className="text-[11px]">
                    <code className="text-foreground-700">{check.table}</code>
                  </Td>
                  <Td className="text-[11px]">
                    <code className="text-foreground-700">{check.parent ?? '—'}</code>
                  </Td>
                  <Td className="text-xs font-semibold tabular-nums">{check.count}</Td>
                  <Td className="text-[11px] text-foreground-600 max-w-[20rem]">
                    {t(`app.health.hint.${check.key}`)}
                  </Td>
                  <Td>
                    {reviews[check.key] ? (
                      <Badge tone="secondary">
                        <i className="ri-verified-badge-line" />
                        {t('app.health.reviewedBadge')}
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-foreground-500">{t('app.health.notReviewed')}</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
      )}
    </>
  );
}