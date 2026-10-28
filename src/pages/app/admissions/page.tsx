import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { fetchAdmissions, updateAdmissionStatus } from '@/api/college';
import type { Admission } from '@/api/types';
import { formatDate } from '@/utils/date';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Row,
  SearchBox,
  StatusPill,
  TableWrap,
  Tabs,
  Td,
  Th,
} from '@/components/app/ui';
import NewAdmissionModal from './components/NewAdmissionModal';

const WRITE_ROLES = ['super_admin', 'admin', 'receptionist'];

const STATUSES = ['new', 'contacted', 'documents_pending', 'interview', 'accepted', 'rejected', 'enrolled'] as const;

const sourceKey = (source: string) =>
  source === 'website' ? 'app.adm.website' : source === 'walk_in' ? 'app.adm.walk_in' : source === 'phone' ? 'app.adm.phoneSrc' : 'app.adm.referral';

export default function AdmissionsPage() {
  const { t, i18n } = useTranslation();
  const { role } = useAuth();
  const canWrite = role ? WRITE_ROLES.includes(role) : false;
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const state = useAsync(fetchAdmissions, []);
  const list = state.data ?? [];

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return list.filter((item) => {
      const matchesTab = tab === 'all' || item.status === tab;
      const matchesQuery =
        !needle ||
        item.applicant_name.toLowerCase().includes(needle) ||
        (item.reference_no ?? '').toLowerCase().includes(needle) ||
        (item.phone ?? '').includes(needle);
      return matchesTab && matchesQuery;
    });
  }, [list, tab, query]);

  const handleStatus = async (admission: Admission, next: string) => {
    setActionError(null);
    setSavingId(admission.id);
    try {
      await updateAdmissionStatus(admission.id, next);
      state.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setSavingId(null);
    }
  };

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  return (
    <>
      <PageHeader
        title={t('app.adm.title')}
        subtitle={`${list.length} ${t('app.adm.count')} · ${t('app.adm.subtitle')}`}
        action={
          canWrite ? (
            <button
              type="button"
              onClick={() => {
                setNotice(null);
                setAddOpen(true);
              }}
              className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-file-add-line" />
              {t('app.adm.newAdmission')}
            </button>
          ) : null
        }
      />

      {notice && (
        <div className="mb-3 rounded-md border border-secondary-200 bg-secondary-100 px-3 py-2 text-xs text-secondary-900">
          {notice}
        </div>
      )}

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { key: 'all', label: t('app.common.all'), count: list.length },
              ...STATUSES.map((status) => ({
                key: status,
                label: t(`app.status.${status}`),
                count: list.filter((item) => item.status === status).length,
              })),
            ]}
          />
          <SearchBox value={query} onChange={setQuery} />
        </div>
        {actionError && (
          <p className="mt-3 text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">
            {actionError}
          </p>
        )}
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon="ri-file-list-3-line" />
        ) : (
          <TableWrap>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th>{t('app.adm.applicant')}</Th>
                <Th>{t('app.adm.program')}</Th>
                <Th>{t('app.adm.schedule')}</Th>
                <Th>{t('app.adm.source')}</Th>
                <Th>{t('app.adm.created')}</Th>
                <Th>{t('app.adm.statusCol')}</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <Row key={item.id}>
                  <Td>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground-950 truncate">{item.applicant_name}</p>
                      <p className="text-[11px] text-foreground-500">
                        {item.reference_no ?? '—'}
                        {item.phone ? ` · ${item.phone}` : ''}
                      </p>
                    </div>
                  </Td>
                  <Td className="text-xs">
                    <span className="block truncate max-w-[170px]">{item.program ?? '—'}</span>
                    <span className="block text-[11px] text-foreground-500">{item.education_level ?? '—'}</span>
                  </Td>
                  <Td className="text-xs">{item.preferred_schedule ?? '—'}</Td>
                  <Td>
                    <Badge tone="neutral">{t(sourceKey(item.source))}</Badge>
                  </Td>
                  <Td className="text-xs whitespace-nowrap">{formatDate(item.created_at, i18n.language)}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <StatusPill value={item.status} />
                      <select
                        value={item.status}
                        disabled={savingId === item.id}
                        onChange={(e) => void handleStatus(item, e.target.value)}
                        className="text-[11px] border border-background-300 rounded-md px-1.5 py-1 bg-background-50 text-foreground-800 cursor-pointer disabled:opacity-50"
                        aria-label={t('app.adm.statusCol')}
                      >
                        {STATUSES.map((status) => (
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

      {addOpen && (
        <NewAdmissionModal
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            setNotice(t('app.adm.created'));
            state.reload();
          }}
        />
      )}
    </>
  );
}