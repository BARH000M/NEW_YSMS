import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { fetchStaff } from '@/api/college';
import { formatDate } from '@/utils/date';
import { formatMoney, toNumber } from '@/utils/money';
import ExportBar from '@/components/app/ExportBar';
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Row,
  SearchBox,
  StatCard,
  StatusPill,
  TableWrap,
  Tabs,
  Td,
  Th,
} from '@/components/app/ui';

export default function StaffPage() {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('all');

  const state = useAsync(fetchStaff, []);
  const list = state.data ?? [];

  const activeCount = list.filter((member) => member.is_active).length;
  const inactiveCount = list.length - activeCount;
  const payroll = list
    .filter((member) => member.is_active)
    .reduce((sum, member) => sum + toNumber(member.base_salary), 0);

  const tabbed = useMemo(() => {
    if (tab === 'active') return list.filter((member) => member.is_active);
    if (tab === 'inactive') return list.filter((member) => !member.is_active);
    return list;
  }, [list, tab]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tabbed;
    return tabbed.filter(
      (member) =>
        member.full_name.toLowerCase().includes(needle) ||
        (member.full_name_ar ?? '').toLowerCase().includes(needle) ||
        (member.staff_no ?? '').toLowerCase().includes(needle) ||
        (member.designation ?? '').toLowerCase().includes(needle) ||
        (member.department ?? '').toLowerCase().includes(needle),
    );
  }, [tabbed, query]);

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  const contractLabel = (value: string | null) =>
    t(`app.status.${value}`, { defaultValue: value ?? '—' });

  const exportRows = filtered.map((member) => [
    member.full_name,
    member.full_name_ar ?? '',
    member.staff_no ?? '',
    member.designation ?? '',
    member.department ?? '',
    member.join_date ? formatDate(member.join_date, i18n.language) : '',
    contractLabel(member.contract_type),
    toNumber(member.base_salary),
    member.is_active ? t('app.common.active') : t('app.common.inactive'),
  ]);

  const exportColumns = [
    t('app.common.name'),
    `${t('app.common.name')} (AR)`,
    t('app.staff.staffNo'),
    t('app.staff.designation'),
    t('app.staff.department'),
    t('app.staff.joinDate'),
    t('app.staff.contract'),
    t('app.staff.salary'),
    t('app.common.status'),
  ];

  return (
    <>
      <PageHeader
        title={t('app.staff.title')}
        subtitle={`${list.length} ${t('app.staff.count')} · ${t('app.staff.subtitle')}`}
        action={
          <ExportBar
            title={`${t('app.staff.title')} — ${t('app.nav.brand')}`}
            fileName="staff-register"
            columns={exportColumns}
            rows={exportRows}
            hint={tab === 'all' ? t('app.common.all') : t(`app.common.${tab}`)}
            summary={[
              { label: t('app.staff.count'), value: String(filtered.length) },
              { label: t('app.staff.payroll'), value: formatMoney(payroll) },
            ]}
          />
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.staff.title')} value={list.length} icon="ri-team-line" tone="primary" />
        <StatCard label={t('app.common.active')} value={activeCount} icon="ri-user-follow-line" tone="secondary" />
        <StatCard
          label={t('app.staff.payroll')}
          value={`${payroll.toLocaleString('en-US')} YER`}
          icon="ri-money-dollar-circle-line"
          tone="accent"
        />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { key: 'all', label: t('app.common.all'), count: list.length },
              { key: 'active', label: t('app.common.active'), count: activeCount },
              { key: 'inactive', label: t('app.common.inactive'), count: inactiveCount },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <SearchBox value={query} onChange={setQuery} />
          </div>
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon="ri-team-line" />
        ) : (
          <TableWrap>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th>{t('app.common.name')}</Th>
                <Th>{t('app.staff.staffNo')}</Th>
                <Th>{t('app.staff.designation')}</Th>
                <Th>{t('app.staff.department')}</Th>
                <Th>{t('app.staff.joinDate')}</Th>
                <Th>{t('app.staff.contract')}</Th>
                <Th>{t('app.staff.salary')}</Th>
                <Th>{t('app.common.status')}</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <Row key={member.id}>
                  <Td>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={member.full_name} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground-950 truncate">{member.full_name}</p>
                        <p className="text-[11px] text-foreground-500 truncate">{member.full_name_ar ?? ''}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-xs tabular-nums">{member.staff_no ?? '—'}</Td>
                  <Td className="text-xs">{member.designation ?? '—'}</Td>
                  <Td className="text-xs">
                    <Badge tone="neutral">{member.department ?? '—'}</Badge>
                  </Td>
                  <Td className="text-xs whitespace-nowrap">
                    {member.join_date ? formatDate(member.join_date, i18n.language) : '—'}
                  </Td>
                  <Td className="text-xs">{contractLabel(member.contract_type)}</Td>
                  <Td className="text-xs font-semibold tabular-nums whitespace-nowrap">
                    {member.base_salary === null ? '—' : formatMoney(member.base_salary)}
                  </Td>
                  <Td>
                    <StatusPill value={member.is_active ? 'active' : 'suspended'} />
                  </Td>
                </Row>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </>
  );
}