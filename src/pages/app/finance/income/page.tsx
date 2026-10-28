import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import {
  deleteOtherIncome,
  fetchIncomeHeads,
  fetchOtherIncomes,
  receiptUrl,
  setIncomeHeadActive,
} from '@/api/campusOps';
import { formatDate } from '@/utils/date';
import { formatMoney, toNumber } from '@/utils/money';
import ExportBar from '@/components/app/ExportBar';
import RecordPrintButton from '@/components/app/RecordPrintButton';
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
import { HeadModal, IncomeModal } from './components/IncomeModals';

export default function IncomePage() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState('register');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<'head' | 'income' | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const state = useAsync(async () => {
    const [heads, incomes] = await Promise.all([fetchIncomeHeads(), fetchOtherIncomes()]);
    return { heads, incomes };
  }, []);

  const heads = state.data?.heads ?? [];
  const incomes = state.data?.incomes ?? [];

  const byHead = useMemo(() => {
    const map = new Map<string, number>();
    incomes.forEach((row) => {
      const key = row.income_heads?.name ?? '—';
      map.set(key, (map.get(key) ?? 0) + toNumber(row.amount));
    });
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [incomes]);

  const total = incomes.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const withReceipt = incomes.filter((row) => row.receipt_url).length;
  const thisMonth = incomes
    .filter((row) => (row.received_on ?? '').slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((sum, row) => sum + toNumber(row.amount), 0);

  const term = query.trim().toLowerCase();
  const visibleIncomes = incomes.filter(
    (row) =>
      !term ||
      row.title.toLowerCase().includes(term) ||
      (row.income_heads?.name ?? '').toLowerCase().includes(term) ||
      (row.reference ?? '').toLowerCase().includes(term),
  );

  const openReceipt = async (path: string) => {
    setActionError(null);
    try {
      const url = await receiptUrl(path);
      window.open(url, '_blank', 'noopener');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not open the receipt');
    }
  };

  const remove = async (id: string) => {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    setConfirmId(null);
    await deleteOtherIncome(id);
    state.reload();
  };

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  return (
    <>
      <PageHeader title={t('app.income.title')} subtitle={t('app.income.subtitle')} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.income.total')} value={formatMoney(total)} icon="ri-arrow-down-circle-line" tone="secondary" />
        <StatCard label={t('app.income.thisMonth')} value={formatMoney(thisMonth)} icon="ri-calendar-line" tone="primary" />
        <StatCard label={t('app.income.heads')} value={heads.length} icon="ri-list-settings-line" tone="accent" />
        <StatCard
          label={t('app.income.receipts')}
          value={withReceipt}
          icon="ri-attachment-2"
          tone="neutral"
          hint={t('app.income.entries', { count: incomes.length })}
        />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { key: 'register', label: t('app.income.tabRegister'), count: incomes.length },
              { key: 'heads', label: t('app.income.tabHeads'), count: heads.length },
              { key: 'summary', label: t('app.income.tabSummary'), count: byHead.length },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <SearchBox value={query} onChange={setQuery} />
            {tab === 'register' && (
              <>
                <ExportBar
                  title={t('app.income.register')}
                  fileName="other-income"
                  columns={[
                    t('app.income.incomeTitle'),
                    t('app.income.head'),
                    t('app.income.amount'),
                    t('app.common.date'),
                    t('app.income.method'),
                    t('app.income.reference'),
                    t('app.income.receipt'),
                  ]}
                  rows={visibleIncomes.map((row) => [
                    row.title,
                    row.income_heads?.name ?? '—',
                    formatMoney(row.amount),
                    formatDate(row.received_on, i18n.language),
                    t(`app.expenses.pay.${row.method}`, { defaultValue: row.method }),
                    row.reference ?? '—',
                    row.receipt_name ?? '—',
                  ])}
                  summary={[
                    { label: t('app.income.total'), value: formatMoney(visibleIncomes.reduce((sum, row) => sum + toNumber(row.amount), 0)) },
                    { label: t('app.income.entries', { count: visibleIncomes.length }), value: String(visibleIncomes.length) },
                  ]}
                />
                <button
                  type="button"
                  onClick={() => setModal('income')}
                  className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-add-line" />
                  {t('app.income.addIncome')}
                </button>
              </>
            )}
            {tab === 'heads' && (
              <>
                <ExportBar
                  title={t('app.income.headList')}
                  fileName="income-heads"
                  columns={[t('app.income.headName'), t('app.income.code'), t('app.common.status'), t('app.income.entries', { count: 0 })]}
                  rows={heads.map((head) => [
                    head.name,
                    head.code ?? '—',
                    head.is_active ? t('app.common.active') : t('app.common.inactive'),
                    String(incomes.filter((row) => row.head_id === head.id).length),
                  ])}
                />
                <button
                  type="button"
                  onClick={() => setModal('head')}
                  className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-add-line" />
                  {t('app.income.addHead')}
                </button>
              </>
            )}
          </div>
        </div>
      </Card>

      {actionError && (
        <p className="mb-3 text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">
          {actionError}
        </p>
      )}

      {tab === 'register' && (
        <Card>
          {visibleIncomes.length === 0 ? (
            <EmptyState icon="ri-arrow-down-circle-line" />
          ) : (
            <TableWrap>
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.income.incomeTitle')}</Th>
                  <Th>{t('app.income.head')}</Th>
                  <Th>{t('app.income.amount')}</Th>
                  <Th>{t('app.common.date')}</Th>
                  <Th>{t('app.income.method')}</Th>
                  <Th>{t('app.income.receipt')}</Th>
                  <Th>{t('app.common.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {visibleIncomes.map((row) => (
                  <Row key={row.id}>
                    <Td>
                      <p className="text-sm font-medium text-foreground-950 max-w-[220px] truncate">{row.title}</p>
                      <p className="text-[11px] text-foreground-500 max-w-[220px] truncate">
                        {row.reference ?? row.notes ?? '—'}
                      </p>
                    </Td>
                    <Td>
                      <Badge tone="secondary">{row.income_heads?.name ?? '—'}</Badge>
                    </Td>
                    <Td className="text-sm font-semibold tabular-nums whitespace-nowrap">{formatMoney(row.amount)}</Td>
                    <Td className="text-xs whitespace-nowrap">{formatDate(row.received_on, i18n.language)}</Td>
                    <Td className="text-xs whitespace-nowrap">
                      {t(`app.expenses.pay.${row.method}`, { defaultValue: row.method })}
                    </Td>
                    <Td>
                      {row.receipt_url ? (
                        <button
                          type="button"
                          onClick={() => void openReceipt(row.receipt_url as string)}
                          className="inline-flex items-center gap-1 rounded-md border border-secondary-300 bg-secondary-100 px-2.5 py-1.5 text-[11px] font-semibold text-secondary-900 whitespace-nowrap cursor-pointer"
                        >
                          <i className="ri-eye-line" />
                          {t('app.income.viewReceipt')}
                        </button>
                      ) : (
                        <span className="text-[11px] text-foreground-400">—</span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <RecordPrintButton
                          title={`${t('app.income.title')} — ${row.title}`}
                          columns={[
                            t('app.income.incomeTitle'),
                            t('app.income.head'),
                            t('app.income.amount'),
                            t('app.common.date'),
                            t('app.income.method'),
                            t('app.income.reference'),
                            t('app.income.receipt'),
                          ]}
                          values={[
                            row.title,
                            row.income_heads?.name ?? '',
                            formatMoney(row.amount),
                            formatDate(row.received_on, i18n.language),
                            t(`app.expenses.pay.${row.method}`, { defaultValue: row.method }),
                            row.reference ?? '',
                            row.receipt_name ?? '',
                          ]}
                        />
                        <button
                          type="button"
                          onClick={() => void remove(row.id)}
                          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                            confirmId === row.id
                              ? 'bg-primary-500 text-background-50 border-primary-500'
                              : 'border-background-300 text-foreground-700 hover:border-primary-400'
                          }`}
                        >
                          <i className={confirmId === row.id ? 'ri-check-line' : 'ri-delete-bin-line'} />
                          {confirmId === row.id ? t('app.common.confirm') : t('app.common.delete')}
                        </button>
                      </div>
                    </Td>
                  </Row>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      )}

      {tab === 'heads' && (
        <Card>
          {heads.length === 0 ? (
            <EmptyState icon="ri-list-settings-line" />
          ) : (
            <TableWrap>
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.income.headName')}</Th>
                  <Th>{t('app.income.code')}</Th>
                  <Th>{t('app.income.entries', { count: 0 })}</Th>
                  <Th>{t('app.income.collected')}</Th>
                  <Th>{t('app.common.status')}</Th>
                </tr>
              </thead>
              <tbody>
                {heads.map((head) => {
                  const rows = incomes.filter((row) => row.head_id === head.id);
                  const sum = rows.reduce((totalRow, row) => totalRow + toNumber(row.amount), 0);
                  return (
                    <Row key={head.id}>
                      <Td>
                        <p className="text-sm font-medium text-foreground-950">{head.name}</p>
                        <p className="text-[11px] text-foreground-500 max-w-[240px] truncate">{head.description ?? '—'}</p>
                      </Td>
                      <Td>
                        <Badge tone="neutral">{head.code ?? '—'}</Badge>
                      </Td>
                      <Td className="text-xs tabular-nums">{rows.length}</Td>
                      <Td className="text-xs tabular-nums font-semibold whitespace-nowrap">{formatMoney(sum)}</Td>
                      <Td>
                        <button
                          type="button"
                          onClick={async () => {
                            await setIncomeHeadActive(head.id, !head.is_active);
                            state.reload();
                          }}
                          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                            head.is_active
                              ? 'border-secondary-300 text-secondary-900 bg-secondary-100'
                              : 'border-background-300 text-foreground-600'
                          }`}
                        >
                          <i className={head.is_active ? 'ri-checkbox-circle-line' : 'ri-forbid-line'} />
                          {head.is_active ? t('app.common.active') : t('app.common.inactive')}
                        </button>
                      </Td>
                    </Row>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </Card>
      )}

      {tab === 'summary' && (
        <Card>
          <div className="p-4 md:p-5 flex flex-col gap-3">
            {byHead.length === 0 && <EmptyState icon="ri-pie-chart-line" />}
            {byHead.map((row) => {
              const max = Math.max(1, ...byHead.map((item) => item.amount));
              return (
                <div key={row.name} className="flex items-center gap-3">
                  <span className="w-28 md:w-40 shrink-0 text-xs font-medium text-foreground-800 truncate">{row.name}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-background-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-secondary-500"
                      style={{ width: `${Math.max(4, (row.amount / max) * 100)}%` }}
                    />
                  </div>
                  <span className="w-24 text-end text-xs font-semibold text-foreground-900 tabular-nums">
                    {formatMoney(row.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {modal === 'head' && (
        <HeadModal
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            state.reload();
          }}
        />
      )}
      {modal === 'income' && (
        <IncomeModal
          heads={heads}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            state.reload();
          }}
        />
      )}
    </>
  );
}