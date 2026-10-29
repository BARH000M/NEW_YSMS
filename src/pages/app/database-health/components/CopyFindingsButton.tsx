import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { HealthCategory, HealthReport } from '@/api/databaseHealth';
import { copyRows } from '@/utils/csv';

const KIND_KEY: Record<HealthCategory, string> = {
  orphan: 'app.health.orphanTag',
  duplicate: 'app.health.duplicateTag',
  mismatch: 'app.health.mismatchTag',
};

/**
 * Turns the sweep into plain text a person can act on: one block per finding,
 * with the fix hint and every affected row (and its id) listed underneath.
 * This is the hand-off format — paste it into a ticket and whoever owns the
 * data knows exactly which rows to touch.
 */
function buildFindingList(report: HealthReport, t: TFunction, language: string): string {
  const stamp = new Intl.DateTimeFormat(language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(report.ranAt));

  const flagged = report.checks.filter((check) => check.count > 0);
  if (flagged.length === 0) return t('app.health.copyEmpty');

  const lines: string[] = [];
  lines.push(`${t('app.health.copyHeading')} — ${stamp}`);
  lines.push('');

  flagged.forEach((check, index) => {
    lines.push(`${index + 1}) ${t(`app.health.check.${check.key}`)} [${t(KIND_KEY[check.category])}]`);
    lines.push(
      `   ${t('app.health.table')}: ${check.table}${check.parent ? ` → ${check.parent}` : ''} · ${t(
        'app.health.rows',
      )}: ${check.count}`,
    );
    lines.push(`   ${t('app.health.copyFix')}: ${t(`app.health.hint.${check.key}`)}`);

    check.rows.forEach((row) => {
      lines.push(`   - ${row.label} | ${row.detail} | id ${row.id}`);
    });

    if (check.rows.length < check.count) {
      lines.push(
        `   ${t('app.health.copyTruncated', { shown: check.rows.length, total: check.count })}`,
      );
    }
    lines.push('');
  });

  lines.push(t('app.health.copyFooter', { time: stamp }));
  return lines.join('\n');
}

export default function CopyFindingsButton({ report }: { report: HealthReport }) {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');
  const empty = report.checks.every((check) => check.count === 0);

  const handleCopy = async () => {
    if (empty) return;
    try {
      const text = buildFindingList(report, t, i18n.language);
      await copyRows(text.split('\n').map((line) => [line]));
      setState('done');
    } catch {
      setState('failed');
    }
    window.setTimeout(() => setState('idle'), 2600);
  };

  const label =
    state === 'done'
      ? t('app.health.copyDone')
      : state === 'failed'
        ? t('app.health.copyFailed')
        : t('app.health.copyList');

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      disabled={empty}
      title={label}
      aria-label={label}
      className="inline-flex items-center justify-center gap-1.5 border border-background-300 hover:border-primary-400 disabled:opacity-50 text-foreground-800 text-xs font-semibold px-2.5 sm:px-3 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
    >
      <i
        className={
          state === 'done'
            ? 'ri-checkbox-circle-line text-secondary-700'
            : state === 'failed'
              ? 'ri-error-warning-line text-primary-700'
              : 'ri-clipboard-line'
        }
      />
      <span className="hidden sm:inline max-w-[13rem] truncate">{label}</span>
    </button>
  );
}