import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { fetchPayments } from '@/api/college';
import { createExpense, deleteExpense, fetchExpenses } from '@/api/operations';
import type { Expense } from '@/api/operations';
import { formatMoney, toNumber } from '@/utils/money';
import { formatDate, todayKey } from '@/utils/date';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Row,
  StatCard,
  TableWrap,
  Tabs,
  Td,
  Th,
} from '@/components/app/ui';

const CATEGORIES = ['supplies', 'utilities', 'maintenance', 'salaries', 'transport', 'marketing', 'assets', 'other'] as const;
const METHODS = ['cash', 'bank_transfer', 'card', 'cheque', 'mobile_wallet'] as const;

const emptyForm = {
  title: '',
  category: 'supplies',
  amount: '',
  spentOn: todayKey(),
  method: 'cash',
  reference: '',
  notes: '',
};

export default function ExpensesPage() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState('expenses');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const state = useAsync(async () => {
    const [expenses, payments] = await Promise.all([fetchExpenses(), fetchPayments()]);
    return { expenses, payments };
  }, []);

  const expenses = state.data?.expenses ?? [];
  const payments = state.data?.payments ?? [];

  const incomeTotal = payments.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const expenseTotal = expenses.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const net = incomeTotal - expenseTotal;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((row) => map.set(row.category, (map.get(row.category) ?? 0) + toNumber(row.amount)));
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const maxCategory = Math.max(1, ...byCategory.map((row) => row.amount));

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setFormError(t('app.expenses.titleRequired'));
      return;
    }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError(t('app.expenses.amountInvalid'));
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await createExpense({
        title: form.title,
        category: form.category,
        amount,
        spentOn: form.spentOn,
        method: form.method,
        reference: form.reference,
        notes: form.notes,
      });
      setOpen(false);
      setForm({ ...emptyForm, spentOn: todayKey() });
      state.reload();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (row: Expense) => {
    if (confirmId !== row.id) {
      setConfirmId(row.id);
      return;
    }
    setConfirmId(null);
    await deleteExpense(row.id);
    state.reload();
  };

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  return (
    <>
      <PageHeader
        title={t('app.expenses.title')}
        subtitle={t('app.expenses.subtitle')}
        action={
          <button
            type="button"
            onClick={() => {
              setForm({ ...emptyForm, spentOn: todayKey() });
              setFormError(null);
              setOpen(true);
            }}
            className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
          >
            <i className="ri-add-line" />
            {t('app.expenses.add')}
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.expenses.income')} value={formatMoney(incomeTotal)} icon="ri-arrow-down-line" tone="secondary" />
        <StatCard label={t('app.expenses.spent')} value={formatMoney(expenseTotal)} icon="ri-arrow-up-line" tone="danger" />
        <StatCard label={t('app.expenses.net')} value={formatMoney(net)} icon="ri-scales-3-line" tone="primary" />
        <StatCard
          label={t('app.expenses.entries')}
          value={expenses.length}
          icon="ri-file-list-2-line"
          tone="accent"
          hint={t('app.expenses.receipts', { count: payments.length })}
        />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { key: 'expenses', label: t('app.expenses.tabExpenses'), count: expenses.length },
            { key: 'breakdown', label: t('app.expenses.tabBreakdown'), count: byCategory.length },
          ]}
        />
      </Card>

      {tab === 'expenses' && (
        <Card>
          {expenses.length === 0 ? (
            <EmptyState icon="ri-exchange-dollar-line" label={t('app.expenses.empty')} />
          ) : (
            <TableWrap>
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.expenses.item')}</Th>
                  <Th>{t('app.expenses.category')}</Th>
                  <Th>{t('app.expenses.amount')}</Th>
                  <Th>{t('app.common.date')}</Th>
                  <Th>{t('app.expenses.method')}</Th>
                  <Th>{t('app.expenses.reference')}</Th>
                  <Th>{t('app.common.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((row) => (
                  <Row key={row.id}>
                    <Td className="text-sm font-medium text-foreground-950">
                      <span className="block max-w-[220px] truncate">{row.title}</span>
                    </Td>
                    <Td>
                      <Badge tone="neutral">
                        {t(`app.expenses.cat.${row.category}`, { defaultValue: row.category })}
                      </Badge>
                    </Td>
                    <Td className="text-sm font-semibold tabular-nums whitespace-nowrap">{formatMoney(row.amount)}</Td>
                    <Td className="text-xs whitespace-nowrap">{formatDate(row.spent_on, i18n.language)}</Td>
                    <Td className="text-xs whitespace-nowrap">
                      {t(`app.expenses.pay.${row.method}`, { defaultValue: row.method })}
                    </Td>
                    <Td className="text-xs tabular-nums whitespace-nowrap">{row.reference ?? '—'}</Td>
                    <Td>
                      <button
                        type="button"
                        onClick={() => void handleDelete(row)}
                        className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                          confirmId === row.id
                            ? 'bg-primary-500 text-background-50 border-primary-500'
                            : 'border-background-300 text-foreground-700 hover:border-primary-400'
                        }`}
                      >
                        <i className={confirmId === row.id ? 'ri-check-line' : 'ri-delete-bin-line'} />
                        {confirmId === row.id ? t('app.common.confirm') : t('app.common.delete')}
                      </button>
                    </Td>
                  </Row>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      )}

      {tab === 'breakdown' && (
        <Card>
          <CardHeader title={t('app.expenses.byCategory')} />
          <div className="p-4 md:p-5 flex flex-col gap-3">
            {byCategory.length === 0 && <EmptyState icon="ri-pie-chart-line" />}
            {byCategory.map((row) => (
              <div key={row.category} className="flex items-center gap-3">
                <span className="w-28 md:w-36 shrink-0 text-xs font-medium text-foreground-800 truncate">
                  {t(`app.expenses.cat.${row.category}`, { defaultValue: row.category })}
                </span>
                <div className="flex-1 h-2.5 rounded-full bg-background-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary-500"
                    style={{ width: `${Math.max(4, (row.amount / maxCategory) * 100)}%` }}
                  />
                </div>
                <span className="w-24 text-end text-xs font-semibold text-foreground-900 tabular-nums">
                  {formatMoney(row.amount)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {open && (
        <Modal title={t('app.expenses.add')} onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="exp-title">
                {t('app.expenses.item')}
              </label>
              <input
                id="exp-title"
                type="text"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className={labelClass} htmlFor="exp-category">
                  {t('app.expenses.category')}
                </label>
                <select
                  id="exp-category"
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                  className={inputClass}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {t(`app.expenses.cat.${category}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className={labelClass} htmlFor="exp-amount">
                  {t('app.expenses.amount')}
                </label>
                <input
                  id="exp-amount"
                  type="number"
                  min={0}
                  dir="ltr"
                  value={form.amount}
                  onChange={(event) => setForm({ ...form, amount: event.target.value })}
                  className={inputClass}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className={labelClass} htmlFor="exp-date">
                  {t('app.common.date')}
                </label>
                <input
                  id="exp-date"
                  type="date"
                  value={form.spentOn}
                  onChange={(event) => setForm({ ...form, spentOn: event.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className={labelClass} htmlFor="exp-method">
                  {t('app.expenses.method')}
                </label>
                <select
                  id="exp-method"
                  value={form.method}
                  onChange={(event) => setForm({ ...form, method: event.target.value })}
                  className={inputClass}
                >
                  {METHODS.map((method) => (
                    <option key={method} value={method}>
                      {t(`app.expenses.pay.${method}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="exp-ref">
                {t('app.expenses.reference')}
              </label>
              <input
                id="exp-ref"
                type="text"
                value={form.reference}
                onChange={(event) => setForm({ ...form, reference: event.target.value })}
                className={inputClass}
              />
            </div>

            {formError && (
              <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">
                {formError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3.5 py-2.5 rounded-md border border-background-300 text-xs font-semibold text-foreground-700 whitespace-nowrap cursor-pointer"
              >
                {t('app.common.cancel')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSubmit()}
                className="px-4 py-2.5 rounded-md bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                {busy ? t('app.common.saving') : t('app.common.save')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}