import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { listAccess, revokeRole } from '@/api/roles';
import type { AccessUser } from '@/api/roles';
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
  StatCard,
  TableWrap,
  Tabs,
  Td,
  Th,
} from '@/components/app/ui';
import RoleModal from './components/RoleModal';

export default function RolesPage() {
  const { t, i18n } = useTranslation();
  const { user, refreshRole } = useAuth();
  const [tab, setTab] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<AccessUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const state = useAsync(() => listAccess(), []);

  const users = state.data?.users ?? [];
  const staff = state.data?.staff ?? [];
  const canGrantSuperAdmin = state.data?.callerRole === 'super_admin';
  const isSelfAdmin = state.data?.callerRole === 'admin';

  const staffById = useMemo(() => {
    const map = new Map<string, (typeof staff)[number]>();
    staff.forEach((member) => map.set(member.id, member));
    return map;
  }, [staff]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((entry) => {
      const matchesTab =
        tab === 'all' || (tab === 'assigned' ? Boolean(entry.role) : !entry.role);
      const matchesQuery =
        !needle ||
        entry.email.toLowerCase().includes(needle) ||
        (entry.fullName ?? '').toLowerCase().includes(needle);
      return matchesTab && matchesQuery;
    });
  }, [users, tab, query]);

  if (state.loading) return <LoadingBlock />;

  if (state.error) {
    const isForbidden = /administrator|access roles/i.test(state.error);
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

  const assigned = users.filter((entry) => entry.role).length;
  const unassigned = users.length - assigned;
  const teachingStaff = users.filter((entry) => entry.role === 'teacher' || entry.role === 'accountant').length;

  const handleSaved = (message: string) => {
    setEditing(null);
    setCreating(false);
    setError(null);
    setNotice(message);
    state.reload();
    void refreshRole();
  };

  const handleRevoke = async (userId: string) => {
    setBusyId(userId);
    setError(null);
    try {
      await revokeRole(userId);
      setConfirmRevoke(null);
      setNotice(t('app.roles.revoked'));
      state.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title={t('app.roles.title')}
        subtitle={t('app.roles.subtitle')}
        action={
          <div className="flex items-center gap-2">
            <Link
              to="/app/account-links"
              className="inline-flex items-center gap-1.5 border border-background-300 text-foreground-800 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-link-m" />
              {t('app.nav.accounts')}
            </Link>
            <button
              type="button"
              onClick={() => {
                setNotice(null);
                setCreating(true);
              }}
              className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-user-add-line" />
              {t('app.roles.assign')}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.roles.totalAccounts')} value={users.length} icon="ri-group-line" tone="primary" />
        <StatCard label={t('app.roles.assigned')} value={assigned} icon="ri-shield-check-line" tone="secondary" />
        <StatCard label={t('app.roles.unassigned')} value={unassigned} icon="ri-user-unfollow-line" tone="accent" />
        <StatCard label={t('app.roles.teaching')} value={teachingStaff} icon="ri-book-2-line" tone="neutral" />
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
            value={tab}
            onChange={(key) => setTab(key as 'all' | 'assigned' | 'unassigned')}
            items={[
              { key: 'all', label: t('app.common.all'), count: users.length },
              { key: 'assigned', label: t('app.roles.assigned'), count: assigned },
              { key: 'unassigned', label: t('app.roles.unassigned'), count: unassigned },
            ]}
          />
          <SearchBox value={query} onChange={setQuery} />
        </div>
      </Card>

      <Card>
        {rows.length === 0 ? (
          <EmptyState icon="ri-shield-user-line" label={t('app.roles.noUsers')} />
        ) : (
          <TableWrap>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th>{t('app.roles.account')}</Th>
                <Th>{t('app.roles.role')}</Th>
                <Th>{t('app.common.status')}</Th>
                <Th>{t('app.roles.lastSignIn')}</Th>
                <Th className="text-end">{t('app.common.actions')}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => {
                const isMe = entry.userId === user?.id;
                const isConfirming = confirmRevoke === entry.userId;
                return (
                  <Row key={entry.userId}>
                    <Td>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-full bg-accent-500 text-foreground-950 text-xs font-bold flex items-center justify-center shrink-0">
                          {(entry.fullName || entry.email || '?').trim().charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground-950 truncate max-w-[200px]">
                            {entry.fullName || t('app.roles.noName')}
                            {isMe ? <span className="ms-1.5 text-[10px] text-foreground-500">({t('app.roles.you')})</span> : null}
                          </p>
                          <p className="text-[11px] text-foreground-500 truncate max-w-[220px]" dir="ltr">
                            {entry.email}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      {entry.role ? (
                        <Badge tone={entry.role === 'admin' || entry.role === 'super_admin' ? 'primary' : 'secondary'}>
                          {t(`app.role.${entry.role}`, { defaultValue: entry.role })}
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-foreground-400">{t('app.roles.noRole')}</span>
                      )}
                      {entry.staffId && staffById.get(entry.staffId) ? (
                        <span className="flex items-center gap-1 text-[10px] text-foreground-500 mt-1 max-w-[150px]">
                          <i className="ri-team-line" />
                          <span className="truncate">{staffById.get(entry.staffId)?.fullName}</span>
                        </span>
                      ) : null}
                    </Td>
                    <Td>
                      {entry.role ? (
                        <Badge tone={entry.isActive ? 'secondary' : 'neutral'}>
                          {entry.isActive ? t('app.common.active') : t('app.common.inactive')}
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-foreground-400">—</span>
                      )}
                    </Td>
                    <Td className="text-[11px] whitespace-nowrap text-foreground-600">
                      {entry.lastSignInAt ? formatDate(entry.lastSignInAt, i18n.language) : t('app.roles.never')}
                    </Td>
                    <Td className="text-end">
                      {isMe || (isSelfAdmin && entry.role === 'super_admin') ? (
                        <span className="text-[11px] text-foreground-400">—</span>
                      ) : isConfirming ? (
                        <span className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled={busyId === entry.userId}
                            onClick={() => void handleRevoke(entry.userId)}
                            className="text-[11px] font-semibold text-background-50 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 px-2.5 py-1.5 rounded-md whitespace-nowrap cursor-pointer"
                          >
                            {busyId === entry.userId ? t('app.common.saving') : t('app.roles.confirmRevoke')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRevoke(null)}
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
                              setEditing(entry);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
                          >
                            <i className="ri-edit-line" />
                            {entry.role ? t('app.common.edit') : t('app.roles.assign')}
                          </button>
                          {entry.role ? (
                            <button
                              type="button"
                              onClick={() => setConfirmRevoke(entry.userId)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-foreground-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
                            >
                              <i className="ri-user-unfollow-line" />
                              {t('app.roles.revoke')}
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
        {t('app.roles.securityNote')}
      </div>

      {(creating || editing) && (
        <RoleModal
          user={editing}
          staff={staff}
          canGrantSuperAdmin={canGrantSuperAdmin}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}