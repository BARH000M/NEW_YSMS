import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import {
  fetchFeeHeads,
  fetchInstitution,
  fetchInvoiceItems,
  fetchInvoices,
  fetchPayments,
} from '@/api/college';
import { fetchExpenses } from '@/api/operations';
import { formatMoney, toNumber } from '@/utils/money';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import ExportBar from '@/components/app/ExportBar';
import PrintSheet from '@/components/app/PrintSheet';
import {
  Card,
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
import ReportDocument from '../components/ReportDocument';

const monthStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
};

export default function TransactionReportPage() {
  const { t } = useTranslation();

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [tab, setTab] = useState<'collection' | 'expense'>('collection');
  const [printing, setPrinting] = useState(false);

  const state = useAsync(async () => {
    const [payments, invoices, items, heads, expenses, institution] = await Promise.all([
      fetchPayments(),
      fetchInvoices(),
      fetchInvoiceItems(),
      fetchFeeHeads(),
      fetchExpenses(),
      fetchInstitution(),
    ]);
    return { payments, invoices, items, heads, expenses, institution };
  }, []);

  const invoices = state.data?.invoices ?? [];
  const invoiceMap = useMemo(() => new Map(invoices.map((invoice) => [invoice.id, invoice])), [invoices]);
  const headMap = useMemo(
    () => new Map((state.data?.heads ?? []).map((head) => [head.id, head])),
    [state.data],
  );

  const inRange = (value: string | null | undefined) => {
    if (!value) return false;
    const day = value.slice(0, 10);
    return day >= from && day <= to;
  };

  const collections = useMemo(() => {
    const items = state.data?.items ?? [];
    return (state.data?.payments ?? [])
      .filter((payment) => inRange(payment.paid_at))
      .map((payment) => {
        const invoice = invoiceMap.get(payment.invoice_id);
        const feeTypes = items
          .filter((item) => item.invoice_id === payment.invoice_id)
          .map((item) => {
            const head = item.fee_head_id ? headMap.get(item.fee_head_id) : null;
            return head?.name ?? item.description;
          })
          .filter(Boolean);
        return {
          id: payment.id,
          receipt: payment.receipt_no ?? '',
          date: payment.paid_at.slice(0, 10),
          student: invoice?.students
            ? `${invoice.students.first_name} ${invoice.students.last_name ?? ''}`.trim()
            : '—',
          className: invoice?.students?.sections?.classes?.name ?? '—',
          feeType: feeTypes.join(', ') || '—',
          amount: toNumber(payment.amount),
          method: payment.method,
          reference: payment.reference ?? '',
        };
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [state.data, invoiceMap, headMap, from, to]);

  const expenses = useMemo(
    () =>
      (state.data?.expenses ?? [])
        .filter((expense) => inRange(expense.spent_on))
        .sort((a, b) => (a.spent_on < b.spent_on ? 1 : a.spent_on > b.spent_on ? -1 : 0)),
    [state.data, from, to],
  );

  const collected = collections.reduce((sum, row) => sum + row.amount, 0);
  const spent = expenses.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const net = collected - spent;

  const methodLabel = (method: string | null | undefined) =>
    method ? t(`app.expenses.pay.${method}`, { defaultValue: method }) : '—';

  const collectionColumns = [
    t('app.ledger.receipt'),
    t('app.common.date'),
    t('app.fees.student'),
    t('app.reports.class'),
    t('app.txn.feeType'),
    t('app.fees.amount'),
    t('app.fees.method'),
    t('app.common.reference'),
  ];

  const collectionRows = collections.map((row) => [
    row.receipt,
    row.date,
    row.student,
    row.className,
    row.feeType,
    row.amount,
    methodLabel(row.method),
    row.reference,
  ]);

  const expenseColumns = [
    t('app.common.date'),
    t('app.expenses.item'),
    t('app.expenses.category'),
    t('app.fees.method'),
    t('app.common.reference'),
    t('app.fees.amount'),
  ];

  const expenseRows = expenses.map((expense) => [
    expense.spent_on,
    expense.title,
    t(`app.expenses.cat.${expense.category}`, { defaultValue: expense.category }),
    methodLabel(expense.method),
    expense.reference ?? '',
    toNumber(expense.amount),
  ]);

  const rangeLabel = `${from} → ${to}`;

  if (state.loading) return <LoadingBlock />;
  if (state.error || !state.data) {
    return <ErrorState message={state.error ?? t('app.common.errorDesc')} onRetry={state.reload} />;
  }

  return (
    <>
      <PageHeader
        title={t('app.txn.title')}
        subtitle={t('app.txn.subtitle')}
        action={
          <>
            {tab === 'collection' ? (
              <ExportBar
                title={`${t('app.txn.collectionTitle')} — ${rangeLabel}`}
                fileName={`collection-${from}-${to}`}
                columns={collectionColumns}
                rows={collectionRows}
                hint={rangeLabel}
                summary={[{ label: t('app.expenses.income'), value: formatMoney(collected) }]}
              />
            ) : (
              <ExportBar
                title={`${t('app.txn.expenseTitle')} — ${rangeLabel}`}
                fileName={`expense-${from}-${to}`}
                columns={expenseColumns}
                rows={expenseRows}
                hint={rangeLabel}
                summary={[{ label: t('app.expenses.spent'), value: formatMoney(spent) }]}
              />
            )}
            <button
              type="button"
              onClick={() => setPrinting(true)}
              disabled={tab === 'collection' ? collections.length === 0 : expenses.length === 0}
              className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-printer-line" />
              {t('app.print.printRecord')}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.expenses.income')} value={formatMoney(collected)} icon="ri-arrow-down-circle-line" tone="secondary" />
        <StatCard label={t('app.expenses.spent')} value={formatMoney(spent)} icon="ri-arrow-up-circle-line" tone="primary" />
        <StatCard label={t('app.expenses.net')} value={formatMoney(net)} icon="ri-scales-3-line" tone={net >= 0 ? 'accent' : 'danger'} />
        <StatCard
          label={t('app.expenses.entries')}
          value={collections.length + expenses.length}
          icon="ri-list-check-2"
          tone="neutral"
        />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="txn-from">
              {t('app.txn.from')}
            </label>
            <input
              id="txn-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="txn-to">
              {t('app.txn.to')}
            </label>
            <input
              id="txn-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0 lg:col-span-2">
            <span className={labelClass}>{t('app.txn.view')}</span>
            <Tabs
              items={[
                { key: 'collection', label: t('app.txn.collection'), count: collections.length },
                { key: 'expense', label: t('app.txn.expenses'), count: expenses.length },
              ]}
              value={tab}
              onChange={(key) => setTab(key === 'expense' ? 'expense' : 'collection')}
            />
          </div>
        </div>
      </Card>

      <Card>
        {tab === 'collection' ? (
          collections.length === 0 ? (
            <EmptyState label={t('app.txn.empty')} icon="ri-hand-coin-line" />
          ) : (
            <TableWrap>
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  {collectionColumns.map((column) => (
                    <Th key={column}>{column}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {collections.map((row) => (
                  <Row key={row.id}>
                    <Td className="text-[11px] text-foreground-600 whitespace-nowrap">{row.receipt || '—'}</Td>
                    <Td className="text-xs whitespace-nowrap">{row.date}</Td>
                    <Td className="text-sm font-medium text-foreground-950 truncate max-w-[180px]">{row.student}</Td>
                    <Td className="text-xs whitespace-nowrap">{row.className}</Td>
                    <Td className="text-xs truncate max-w-[200px]">{row.feeType}</Td>
                    <Td className="text-xs tabular-nums whitespace-nowrap font-semibold">{formatMoney(row.amount)}</Td>
                    <Td className="text-xs whitespace-nowrap">{methodLabel(row.method)}</Td>
                    <Td className="text-[11px] text-foreground-600 whitespace-nowrap">{row.reference || '—'}</Td>
                  </Row>
                ))}
                <tr className="bg-background-100 border-t-2 border-background-300">
                  <Td className="text-xs font-bold" />
                  <Td className="text-xs font-bold" />
                  <Td className="text-xs font-bold" />
                  <Td className="text-xs font-bold" />
                  <Td className="text-xs font-bold">{t('app.common.total')}</Td>
                  <Td className="text-xs font-bold tabular-nums">{formatMoney(collected)}</Td>
                  <Td className="text-xs font-bold" />
                  <Td className="text-xs font-bold" />
                </tr>
              </tbody>
            </TableWrap>
          )
        ) : expenses.length === 0 ? (
          <EmptyState label={t('app.txn.empty')} icon="ri-exchange-dollar-line" />
        ) : (
          <TableWrap>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                {expenseColumns.map((column) => (
                  <Th key={column}>{column}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <Row key={expense.id}>
                  <Td className="text-xs whitespace-nowrap">{expense.spent_on}</Td>
                  <Td className="text-sm font-medium text-foreground-950 truncate max-w-[200px]">{expense.title}</Td>
                  <Td className="text-xs whitespace-nowrap">
                    {t(`app.expenses.cat.${expense.category}`, { defaultValue: expense.category })}
                  </Td>
                  <Td className="text-xs whitespace-nowrap">{methodLabel(expense.method)}</Td>
                  <Td className="text-[11px] text-foreground-600 whitespace-nowrap">{expense.reference ?? '—'}</Td>
                  <Td className="text-xs tabular-nums whitespace-nowrap font-semibold">{formatMoney(expense.amount)}</Td>
                </Row>
              ))}
              <tr className="bg-background-100 border-t-2 border-background-300">
                <Td className="text-xs font-bold" />
                <Td className="text-xs font-bold" />
                <Td className="text-xs font-bold" />
                <Td className="text-xs font-bold" />
                <Td className="text-xs font-bold">{t('app.common.total')}</Td>
                <Td className="text-xs font-bold tabular-nums">{formatMoney(spent)}</Td>
              </tr>
            </tbody>
          </TableWrap>
        )}
      </Card>

      {printing && (
        <PrintSheet
          title={tab === 'collection' ? t('app.txn.collectionTitle') : t('app.txn.expenseTitle')}
          hint={rangeLabel}
          onClose={() => setPrinting(false)}
        >
          <ReportDocument
            institution={state.data.institution}
            title={tab === 'collection' ? t('app.txn.collectionTitle') : t('app.txn.expenseTitle')}
            subtitle={t('app.txn.subtitle')}
            meta={[
              { label: t('app.txn.from'), value: from },
              { label: t('app.txn.to'), value: to },
              {
                label: t('app.print.records'),
                value: String(tab === 'collection' ? collections.length : expenses.length),
              },
              {
                label: tab === 'collection' ? t('app.expenses.income') : t('app.expenses.spent'),
                value: formatMoney(tab === 'collection' ? collected : spent),
              },
            ]}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-background-100">
                  {(tab === 'collection' ? collectionColumns : expenseColumns).map((column, index) => (
                    <th
                      key={column}
                      className={`text-[9px] font-bold uppercase tracking-wide text-foreground-700 px-1.5 py-1.5 border-b border-background-300 whitespace-nowrap ${
                        index === 5 ? 'text-end' : 'text-start'
                      }`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tab === 'collection'
                  ? collections.map((row) => (
                      <tr key={row.id}>
                        <td className="px-1.5 py-1 text-[9px] border-b border-background-200">{row.receipt || '—'}</td>
                        <td className="px-1.5 py-1 text-[9px] border-b border-background-200 whitespace-nowrap">{row.date}</td>
                        <td className="px-1.5 py-1 text-[9px] border-b border-background-200">{row.student}</td>
                        <td className="px-1.5 py-1 text-[9px] border-b border-background-200 whitespace-nowrap">{row.className}</td>
                        <td className="px-1.5 py-1 text-[9px] border-b border-background-200">{row.feeType}</td>
                        <td className="px-1.5 py-1 text-[9px] text-end border-b border-background-200 tabular-nums">{row.amount}</td>
                        <td className="px-1.5 py-1 text-[9px] border-b border-background-200 whitespace-nowrap">{methodLabel(row.method)}</td>
                        <td className="px-1.5 py-1 text-[9px] border-b border-background-200">{row.reference || '—'}</td>
                      </tr>
                    ))
                  : expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td className="px-1.5 py-1 text-[9px] border-b border-background-200 whitespace-nowrap">{expense.spent_on}</td>
                        <td className="px-1.5 py-1 text-[9px] border-b border-background-200">{expense.title}</td>
                        <td className="px-1.5 py-1 text-[9px] border-b border-background-200 whitespace-nowrap">
                          {t(`app.expenses.cat.${expense.category}`, { defaultValue: expense.category })}
                        </td>
                        <td className="px-1.5 py-1 text-[9px] border-b border-background-200 whitespace-nowrap">{methodLabel(expense.method)}</td>
                        <td className="px-1.5 py-1 text-[9px] border-b border-background-200">{expense.reference ?? '—'}</td>
                        <td className="px-1.5 py-1 text-[9px] text-end border-b border-background-200 tabular-nums">{expense.amount}</td>
                      </tr>
                    ))}
                <tr>
                  <td
                    colSpan={(tab === 'collection' ? collectionColumns.length : expenseColumns.length) - 1}
                    className="px-1.5 py-1.5 text-[10px] font-bold border-t border-foreground-900"
                  >
                    {t('app.common.total')}
                  </td>
                  <td className="px-1.5 py-1.5 text-[10px] text-end font-bold border-t border-foreground-900 tabular-nums">
                    {formatMoney(tab === 'collection' ? collected : spent)}
                  </td>
                </tr>
              </tbody>
            </table>
          </ReportDocument>
        </PrintSheet>
      )}
    </>
  );
}