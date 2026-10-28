import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { fetchComplaints, fetchEnquiries, fetchVisitors, updateComplaintStatus } from '@/api/college';
import { formatDate } from '@/utils/date';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Row,
  StatCard,
  StatusPill,
  TableWrap,
  Tabs,
  Td,
  Th,
} from '@/components/app/ui';

const COMPLAINT_STATUSES = ['new', 'investigating', 'resolved', 'closed'] as const;

export default function FrontOfficePage({ initialTab = 'visitors' }: { initialTab?: string } = {}) {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState(initialTab);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const state = useAsync(async () => {
    const [visitors, enquiries, complaints] = await Promise.all([fetchVisitors(), fetchEnquiries(), fetchComplaints()]);
    return { visitors, enquiries, complaints };
  }, []);

  useEffect(() => {
    setActionError(null);
  }, [tab]);

  if (state.loading) return <LoadingBlock />;
  if (state.error || !state.data) return <ErrorState message={state.error ?? 'No data'} onRetry={state.reload} />;

  const { visitors, enquiries, complaints } = state.data;

  const handleComplaintStatus = async (id: string, next: string) => {
    setActionError(null);
    setSavingId(id);
    try {
      await updateComplaintStatus(id, next);
      state.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <>
      <PageHeader title={t('app.front.title')} subtitle={t('app.front.subtitle')} />

      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.front.visitors')} value={visitors.length} icon="ri-door-open-line" tone="primary" />
        <StatCard label={t('app.front.enquiries')} value={enquiries.length} icon="ri-question-answer-line" tone="accent" />
        <StatCard label={t('app.front.complaints')} value={complaints.length} icon="ri-error-warning-line" tone="secondary" />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { key: 'visitors', label: t('app.front.visitors'), count: visitors.length },
            { key: 'enquiries', label: t('app.front.enquiries'), count: enquiries.length },
            { key: 'complaints', label: t('app.front.complaints'), count: complaints.length },
          ]}
        />
        {actionError && (
          <p className="mt-3 text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">
            {actionError}
          </p>
        )}
      </Card>

      {tab === 'visitors' && (
        <Card>
          {visitors.length === 0 ? (
            <EmptyState icon="ri-door-open-line" />
          ) : (
            <TableWrap>
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.common.name')}</Th>
                  <Th>{t('app.front.badge')}</Th>
                  <Th>{t('app.front.purpose')}</Th>
                  <Th>{t('app.common.phone')}</Th>
                  <Th>{t('app.front.inAt')}</Th>
                  <Th>{t('app.front.outAt')}</Th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((visitor) => (
                  <Row key={visitor.id}>
                    <Td className="text-sm font-medium text-foreground-950">{visitor.name}</Td>
                    <Td className="text-xs tabular-nums">{visitor.badge_no ?? '—'}</Td>
                    <Td className="text-xs">{visitor.purpose ?? '—'}</Td>
                    <Td className="text-xs" dir="ltr">
                      {visitor.phone ?? '—'}
                    </Td>
                    <Td className="text-xs whitespace-nowrap">
                      {visitor.in_at ? formatDate(visitor.in_at, i18n.language) : '—'}
                    </Td>
                    <Td className="text-xs">
                      {visitor.out_at ? (
                        formatDate(visitor.out_at, i18n.language)
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-secondary-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary-500" />
                          {t('app.front.stillIn')}
                        </span>
                      )}
                    </Td>
                  </Row>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      )}

      {tab === 'enquiries' && (
        <Card>
          {enquiries.length === 0 ? (
            <EmptyState icon="ri-question-answer-line" />
          ) : (
            <TableWrap>
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.common.name')}</Th>
                  <Th>{t('app.front.subject')}</Th>
                  <Th>{t('app.front.message')}</Th>
                  <Th>{t('app.common.date')}</Th>
                  <Th>{t('app.common.status')}</Th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((enquiry) => (
                  <Row key={enquiry.id}>
                    <Td>
                      <p className="text-sm font-medium text-foreground-950">{enquiry.name}</p>
                      <p className="text-[11px] text-foreground-500" dir="ltr">
                        {enquiry.phone ?? '—'}
                      </p>
                    </Td>
                    <Td className="text-xs">{enquiry.subject ?? '—'}</Td>
                    <Td className="text-xs">
                      <span className="block max-w-[280px] truncate">{enquiry.message ?? '—'}</span>
                    </Td>
                    <Td className="text-xs whitespace-nowrap">{formatDate(enquiry.created_at, i18n.language)}</Td>
                    <Td>
                      <StatusPill value={enquiry.status} />
                    </Td>
                  </Row>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      )}

      {tab === 'complaints' && (
        <Card>
          {complaints.length === 0 ? (
            <EmptyState icon="ri-error-warning-line" />
          ) : (
            <TableWrap>
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.common.reference')}</Th>
                  <Th>{t('app.front.subject')}</Th>
                  <Th>{t('app.front.type')}</Th>
                  <Th>{t('app.common.date')}</Th>
                  <Th>{t('app.common.status')}</Th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((complaint) => (
                  <Row key={complaint.id}>
                    <Td className="text-xs tabular-nums">{complaint.reference_no ?? '—'}</Td>
                    <Td>
                      <p className="text-sm font-medium text-foreground-950">{complaint.subject}</p>
                      <p className="text-[11px] text-foreground-500 max-w-[260px] truncate">{complaint.details ?? '—'}</p>
                    </Td>
                    <Td>
                      <div className="flex flex-col items-start gap-1">
                        <Badge tone="neutral">{complaint.type ?? '—'}</Badge>
                        {complaint.is_anonymous && <Badge tone="accent">{t('app.front.anonymous')}</Badge>}
                      </div>
                    </Td>
                    <Td className="text-xs whitespace-nowrap">{formatDate(complaint.created_at, i18n.language)}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <StatusPill value={complaint.status} />
                        <select
                          value={complaint.status}
                          disabled={savingId === complaint.id}
                          onChange={(e) => void handleComplaintStatus(complaint.id, e.target.value)}
                          className="text-[11px] border border-background-300 rounded-md px-1.5 py-1 bg-background-50 text-foreground-800 cursor-pointer disabled:opacity-50"
                          aria-label={t('app.common.status')}
                        >
                          {COMPLAINT_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {t(`app.status.${status}`)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </Td>
                  </Row>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      )}
    </>
  );
}