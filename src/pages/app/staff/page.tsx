import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { fetchStaff } from '@/api/college';
import { formatDate } from '@/utils/date';
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
  Td,
  Th,
} from '@/components/app/ui';

export default function StaffPage() {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');

  const state = useAsync(fetchStaff, []);
  const list = state.data ?? [];

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(
      (member) =>
        member.full_name.toLowerCase().includes(needle) ||
        (member.staff_no ?? '').toLowerCase().includes(needle) ||
        (member.designation ?? '').toLowerCase().includes(needle),
    );
  }, [list, query]);

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  const activeCount = list.filter((member) => member.is_active).length;
  const payroll = list.filter((member) => member.is_active).reduce((sum, member) => sum + Number(member.base_salary ?? 0), 0);

  return (
    <>
      <PageHeader title={t('app.staff.title')} subtitle={`${list.length} ${t('app.staff.count')} · ${t('app.staff.subtitle')}`} />

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
        <SearchBox value={query} onChange={setQuery} />
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
                  <Td className="text-xs">{t(`app.status.${member.contract_type}`, { defaultValue: member.contract_type })}</Td>
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