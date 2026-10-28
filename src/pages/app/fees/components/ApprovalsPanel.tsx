import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reviewApproval } from '@/api/college';
import type { FeeApproval } from '@/api/college';
import { formatMoney } from '@/utils/money';
import { formatDate } from '@/utils/date';
import { Badge, Card, EmptyState } from '@/components/app/ui';

const statusTone: Record<string, 'accent' | 'secondary' | 'danger'> = {
  pending: 'accent',
  approved: 'secondary',
  rejected: 'danger',
};

export default function ApprovalsPanel({
  approvals,
  canReview,
  reviewerName,
  onChanged,
}: {
  approvals: FeeApproval[];
  canReview: boolean;
  reviewerName: string | null;
  onChanged: (message: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const act = async (approval: FeeApproval, decision: 'approved' | 'rejected') => {
    setBusyId(approval.id);
    setLocalError(null);
    try {
      const result = await reviewApproval(approval, decision, reviewerName);
      if (result.selfReview) {
        setLocalError(t('app.approvals.selfReview'));
        return;
      }
      onChanged(decision === 'approved' ? t('app.approvals.approvedNote') : t('app.approvals.rejectedNote'));
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t('app.common.errorDesc'));
    } finally {
      setBusyId(null);
    }
  };

  if (approvals.length === 0) {
    return (
      <Card>
        <EmptyState label={t('app.approvals.empty')} icon="ri-git-pull-request-line" />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {localError && (
        <p className="text-xs text-primary-900 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">
          {localError}
        </p>
      )}
      {approvals.map((approval) => (
        <Card key={approval.id} className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground-950">{approval.title}</span>
                <Badge tone={statusTone[approval.status] ?? 'neutral'}>
                  {t(`app.approvals.status.${approval.status}`)}
                </Badge>
                <Badge tone="neutral">{t(`app.approvals.types.${approval.request_type}`)}</Badge>
              </div>
              <p className="text-xs text-foreground-600 mt-1.5">
                {t('app.approvals.requestedBy')}: {approval.requested_by_name ?? '—'} ·{' '}
                {formatDate(approval.created_at, i18n.language)}
              </p>
              {approval.note && <p className="text-xs text-foreground-700 mt-1.5">{approval.note}</p>}
              {approval.status !== 'pending' && approval.reviewed_by_name && (
                <p className="text-[11px] text-foreground-500 mt-1.5">
                  {t('app.approvals.reviewedBy')}: {approval.reviewed_by_name}
                  {approval.reviewed_at ? ` · ${formatDate(approval.reviewed_at, i18n.language)}` : ''}
                </p>
              )}
            </div>
            <div className="flex sm:flex-col items-end gap-2 shrink-0">
              <span className="font-heading text-xl text-foreground-950 tabular-nums">
                {formatMoney(approval.amount)}
              </span>
              {canReview && approval.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void act(approval, 'approved')}
                    disabled={busyId === approval.id}
                    className="inline-flex items-center gap-1 bg-secondary-500 hover:bg-secondary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-3 py-1.5 rounded-md whitespace-nowrap cursor-pointer"
                  >
                    <i className="ri-check-line" />
                    {t('app.approvals.approve')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void act(approval, 'rejected')}
                    disabled={busyId === approval.id}
                    className="inline-flex items-center gap-1 border border-primary-300 text-primary-700 hover:bg-primary-100 disabled:opacity-60 text-xs font-semibold px-3 py-1.5 rounded-md whitespace-nowrap cursor-pointer"
                  >
                    <i className="ri-close-line" />
                    {t('app.approvals.reject')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}