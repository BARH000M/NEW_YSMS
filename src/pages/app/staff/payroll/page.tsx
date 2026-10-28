import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { fetchExpenses, createExpense } from '@/api/operations';
import { fetchStaff } from '@/api/college';
import type { Staff } from '@/api/types';
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
  SearchBox,
  StatCard,
  TableWrap,
  Td,
  Th,
} from '@/components/app/ui';

export default function PayrollPage() {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [paying, setPaying] = useState<Staff | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const state = useAsync(async () => {
    const [staff, expenses] = await Promise.all([fetchStaff(), fetchExpenses()]);
    return { staff, expenses };
  }, []);

  const staff = state.data?.staff ?? [];
  const expenses = state.data?.expenses ?? [];

  const salaryPayments = useMemo(() => expenses.filter((row) => row.category === 'salaries'), [expenses]);

  const monthKey = todayKey().slice(0, 7);
  const paidThisMonth = salaryPayments
    .filter((row) => (row.spent_on ?? '').slice(0, 7) === monthKey)
    .reduce((sum, row) => sum + toNumber(row.amount), 0);

  const monthlyCost = staff
    .filter((member) => member.is_active)
    .reduce((sum, member) => sum + toNumber(member.base_salary), 0);

  const byDepartment = useMemo(() => {
    const map = new Map<string, { count: number; cost: number }>();
    staff.forEach((member) => {
      const key = member.department || t('app.payroll.unspecified');
      const current = map.get(key) ?? { count: 0, cost: 0 };
      map.set(key, { count: current.count + 1, cost: current.cost + toNumber(member.base_salary) });
    });
    return Array.from(map.entries())
      .map(([department, value]) => ({ department, ...value }))
      .sort((a, b) => b.cost - a.cost);
  }, [staff, t]);

  const maxCost = Math.max(1, ...byDepartment.map((row) => row.cost));

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return staff;
    return staff.filter(
      (member) =>
        member.full_name.toLowerCase().includes(needle) ||
        (member.staff_no ?? '').toLowerCase().includes(needle) ||
        (member.department ?? '').toLowerCase().includes(needle) ||
        (member.designation ?? '').toLowerCase().includes(needle),
    );
  }, [staff, query]);

  const openPay = (member: Staff) => {
    setPaying(member);
    setAmount(String(member.base_salary ?? ''));
    setFormError(null);
    setNotice(null);
  };

  const handlePay = async () => {
    if (!paying) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setFormError(t('app.payroll.amountInvalid'));
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await createExpense({
        title: `${t('app.payroll.salaryPayment')} — ${paying.full_name}`,
        category: 'salaries',
        amount: value,
        spentOn: todayKey(),
        method: 'bank_transfer',
        reference: paying.staff_no ?? undefined,
      });
      setPaying(null);
      setNotice(t('app.payroll.recorded'));
      state.reload();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  return (
    <>
      <PageHeader title={t('app.payroll.title')} subtitle={t('app.payroll.subtitle')} />

      {notice && (
        <p className="mb-3 text-xs text-secondary-900 bg-secondary-100 border border-secondary-200 rounded-md px-3 py-2">
          {notice}
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.payroll.headcount')} value={staff.length} icon="ri-team-line" tone="primary" />
        <StatCard label={t('app.payroll.monthlyCost')} value={formatMoney(monthlyCost)} icon="ri-hand-coin-line" tone="accent" />
        <StatCard label={t('app.payroll.paidThisMonth')} value={formatMoney(paidThisMonth)} icon="ri-checkbox-circle-line" tone="secondary" />
        <StatCard label={t('app.payroll.payments')} value={salaryPayments.length} icon="ri-file-list-2-line" tone="neutral" />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <SearchBox value={query} onChange={setQuery} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        <Card className="lg:col-span-2">
          {filtered.length === 0 ? (
            <EmptyState icon="ri-user-star-line" />
          ) : (
            <TableWrap>
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.common.name')}</Th>
                  <Th>{t('app.payroll.designation')}</Th>
                  <Th>{t('app.payroll.department')}</Th>
                  <Th>{t('app.payroll.contract')}</Th>
                  <Th>{t('app.payroll.baseSalary')}</Th>
                  <Th>{t('app.common.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <Row key={member.id}>
                    <Td>
                      <p className="text-sm font-medium text-foreground-950 truncate max-w-[170px]">{member.full_name}</p>
                      <p className="text-[11px] text-foreground-500 tabular-nums">{member.staff_no ?? '—'}</p>
                    </Td>
                    <Td className="text-xs">{member.designation ?? '—'}</Td>
                    <Td className="text-xs">{member.department ?? '—'}</Td>
                    <Td>
                      <Badge tone={member.contract_type === 'full_time' ? 'secondary' : 'neutral'}>
                        {t(`app.payroll.contractType.${member.contract_type}`, { defaultValue: member.contract_type })}
                      </Badge>
                    </Td>
                    <Td className="text-sm font-semibold tabular-nums whitespace-nowrap">
                      {formatMoney(member.base_salary)}
                    </Td>
                    <Td>
                      <button
                        type="button"
                        onClick={() => openPay(member)}
                        className="inline-flex items-center gap-1 rounded-md border border-background-300 hover:border-primary-400 px-2.5 py-1.5 text-[11px] font-semibold text-foreground-700 whitespace-nowrap cursor-pointer"
                      >
                        <i className="ri-hand-coin-line" />
                        {t('app.payroll.pay')}
                      </button>
                    </Td>
                  </Row>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>

        <div className="flex flex-col gap-3 md:gap-4">
          <Card>
            <CardHeader title={t('app.payroll.byDepartment')} />
            <div className="p-4 flex flex-col gap-3">
              {byDepartment.length === 0 && <EmptyState />}
              {byDepartment.map((row) => (
                <div key={row.department} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-foreground-800 truncate">{row.department}</span>
                    <span className="tabular-nums text-foreground-600 shrink-0">
                      {formatMoney(row.cost)} · {row.count}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-background-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-secondary-500"
                      style={{ width: `${Math.max(4, (row.cost / maxCost) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title={t('app.payroll.recentPayments')} />
            <div className="p-2">
              {salaryPayments.length === 0 && <EmptyState />}
              {salaryPayments.slice(0, 5).map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-3 px-2 py-2.5 border-b border-background-100 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground-900 truncate">{row.title}</p>
                    <p className="text-[11px] text-foreground-500">{formatDate(row.spent_on, i18n.language)}</p>
                  </div>
                  <span className="text-xs font-semibold tabular-nums whitespace-nowrap">{formatMoney(row.amount)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {paying && (
        <Modal
          title={t('app.payroll.pay')}
          subtitle={`${paying.full_name} · ${paying.staff_no ?? ''}`}
          onClose={() => setPaying(null)}
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="pay-amount">
                {t('app.payroll.amount')}
              </label>
              <input
                id="pay-amount"
                type="number"
                min={0}
                dir="ltr"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className={inputClass}
              />
            </div>
            <p className="text-[11px] text-foreground-500">{t('app.payroll.payHint')}</p>

            {formError && (
              <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">
                {formError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPaying(null)}
                className="px-3.5 py-2.5 rounded-md border border-background-300 text-xs font-semibold text-foreground-700 whitespace-nowrap cursor-pointer"
              >
                {t('app.common.cancel')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handlePay()}
                className="px-4 py-2.5 rounded-md bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                {busy ? t('app.common.saving') : t('app.payroll.confirmPay')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}