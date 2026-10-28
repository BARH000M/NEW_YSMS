import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { listLinkDirectory, unlinkRecord } from '@/api/accountLinks';
import type { LinkDirectory, LinkEntity, LinkRecord } from '@/api/accountLinks';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Row,
  SearchBox,
  StatCard,
  TableWrap,
  Tabs,
  Td,
  Th,
} from '@/components/app/ui';
import LinkAccountModal from './components/LinkAccountModal';

const ENTITIES: { key: LinkEntity; tKey: string; icon: string }[] = [
  { key: 'staff', tKey: 'app.links.staffTab', icon: 'ri-team-line' },
  { key: 'student', tKey: 'app.links.studentTab', icon: 'ri-user-3-line' },
  { key: 'guardian', tKey: 'app.links.guardianTab', icon: 'ri-parent-line' },
];

export default function AccountLinksPage() {
  const { t } = useTranslation();
  const [entity, setEntity] = useState<LinkEntity>('student');
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<LinkRecord | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const state = useAsync(() => listLinkDirectory(), []);
  const data: LinkDirectory | null = state.data;

  const accountByProfile = useMemo(() => {
    const map = new Map<string, { email: string; role: string | null }>();
    (data?.accounts ?? []).forEach((account) => {
      map.set(account.userId, { email: account.email, role: account.role });
    });
    return map;
  }, [data]);

  const records = useMemo(() => {
    if (!data) return [];
    const list = entity === 'staff' ? data.staff : entity === 'student' ? data.students : data.guardians;
    const needle = query.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((record) => {
      const linked = record.profileId ? accountByProfile.get(record.profileId)?.email ?? '' : '';
      return (
        record.name.toLowerCase().includes(needle) ||
        (record.code ?? '').toLowerCase().includes(needle) ||
        linked.toLowerCase().includes(needle)
      );
    });
  }, [data, entity, query, accountByProfile]);

  if (state.loading) return <LoadingBlock />;

  if (state.error) {
    const isForbidden = /administrator|access/i.test(state.error);
    return (
      <Card className="p-6 text-center">
        <span className="w-10 h-10 mx-auto rounded-full bg-primary-100 text-primary-700 flex items-center justify-center">
          <i className="ri-shield-keyhole-line text-lg" />
        </span>
        <h3 className="text-sm font-semibold text-foreground-950 mt-3">
          {isForbidden ? t('app.roles.forbiddenTitle') : t('app.common.errorTitle')}
        </h3>
        <p className="text-xs text-foreground-600 mt-1 break-words">{state.error}</p>
        <button
          type="button"
          onClick={state.reload}
          className="mt-4 inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-4 py-2 rounded-md cursor-pointer whitespace-nowrap"
        >
          <i className="ri-refresh-line" />
          {t('app.common.retry')}
        </button>
      </Card>
    );
  }

  const staff = data?.staff ?? [];
  const students = data?.students ?? [];
  const guardians = data?.guardians ?? [];
  const linkedCount = (list: LinkRecord[]) => list.filter((record) => record.profileId).length;

  const handleUnlink = async (record: LinkRecord) => {
    setBusyId(record.id);
    setError(null);
    try {
      await unlinkRecord({ entity, recordId: record.id });
      setConfirmId(null);
      setNotice(t('app.links.unlinked'));
      state.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader title={t('app.links.title')} subtitle={t('app.links.subtitle')} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard
          label={t('app.links.staffTab')}
          value={`${linkedCount(staff)} / ${staff.length}`}
          icon="ri-team-line"
          tone="primary"
        />
        <StatCard
          label={t('app.links.studentTab')}
          value={`${linkedCount(students)} / ${students.length}`}
          icon="ri-user-3-line"
          tone="secondary"
        />
        <StatCard
          label={t('app.links.guardianTab')}
          value={`${linkedCount(guardians)} / ${guardians.length}`}
          icon="ri-parent-line"
          tone="accent"
        />
      </div>

      {notice && (
        <div className="mb-3 rounded-md border border-secondary-200 bg-secondary-100 px-3 py-2 text-xs text-secondary-900">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-md border border-primary-200 bg-primary-100 px-3 py-2 text-xs text-primary-900 break-words">
          {error}
        </div>
      )}

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <Tabs
            value={entity}
            onChange={(key) => {
              setEntity(key as LinkEntity);
              setConfirmId(null);
            }}
            items={ENTITIES.map((item) => ({
              key: item.key,
              label: t(item.tKey),
              count: item.key === 'staff' ? staff.length : item.key === 'student' ? students.length : guardians.length,
            }))}
          />
          <SearchBox value={query} onChange={setQuery} />
        </div>
      </Card>

      <Card>
        {records.length === 0 ? (
          <EmptyState icon="ri-links-line" />
        ) : (
          <TableWrap>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th>{t('app.common.name')}</Th>
                <Th>{t('app.links.record')}</Th>
                <Th>{t('app.links.account')}</Th>
                <Th className="text-end">{t('app.common.actions')}</Th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const linked = record.profileId ? accountByProfile.get(record.profileId) : undefined;
                const isConfirming = confirmId === record.id;
                return (
                  <Row key={record.id}>
                    <Td>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-full bg-background-200 text-foreground-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {record.name.trim().charAt(0) || '?'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground-950 truncate max-w-[220px]">
                            {record.name}
                          </p>
                          <p className="text-[11px] text-foreground-500 truncate max-w-[220px]">
                            {record.meta ?? '—'}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-xs tabular-nums whitespace-nowrap">{record.code ?? '—'}</Td>
                    <Td>
                      {linked ? (
                        <span className="block min-w-0">
                          <span className="block text-xs text-foreground-900 truncate max-w-[200px]" dir="ltr">
                            {linked.email}
                          </span>
                          {linked.role ? (
                            <Badge tone="secondary">{t(`app.role.${linked.role}`, { defaultValue: linked.role })}</Badge>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-[11px] text-foreground-400">{t('app.links.notLinked')}</span>
                      )}
                    </Td>
                    <Td className="text-end">
                      {isConfirming ? (
                        <span className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled={busyId === record.id}
                            onClick={() => void handleUnlink(record)}
                            className="text-[11px] font-semibold text-background-50 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 px-2.5 py-1.5 rounded-md whitespace-nowrap cursor-pointer"
                          >
                            {busyId === record.id ? t('app.common.saving') : t('app.links.confirmUnlink')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmId(null)}
                            className="text-[11px] font-semibold text-foreground-700 border border-background-300 px-2.5 py-1.5 rounded-md whitespace-nowrap cursor-pointer"
                          >
                            {t('app.common.cancel')}
                          </button>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setNotice(null);
                              setError(null);
                              setTarget(record);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
                          >
                            <i className={record.profileId ? 'ri-edit-line' : 'ri-link'} />
                            {record.profileId ? t('app.links.relink') : t('app.links.link')}
                          </button>
                          {record.profileId ? (
                            <button
                              type="button"
                              onClick={() => setConfirmId(record.id)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-foreground-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
                            >
                              <i className="ri-link-unlink" />
                              {t('app.links.unlink')}
                            </button>
                          ) : null}
                        </span>
                      )}
                    </Td>
                  </Row>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>

      <div className="mt-3 rounded-md border border-background-300 bg-background-100 px-3 py-2.5 text-[11px] text-foreground-600 leading-relaxed">
        <i className="ri-lock-line me-1.5" />
        {t('app.links.securityNote')}
      </div>

      {target && data ? (
        <LinkAccountModal
          entity={entity}
          record={target}
          accounts={data.accounts}
          onClose={() => setTarget(null)}
          onSaved={(message) => {
            setTarget(null);
            setNotice(message);
            state.reload();
          }}
        />
      ) : null}
    </>
  );
}