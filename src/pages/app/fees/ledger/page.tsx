import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { fetchInvoices, fetchPayments } from '@/api/college';
import { formatMoney, toNumber } from '@/utils/money';
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
  Td,
  Th,
} from '@/components/app/ui';

const METHODS = ['all', 'cash', 'bank_transfer', 'card', 'cheque', 'mobile_wallet'] as const;

export default function LedgerPage() {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [method, setMethod] = useState<string>('all');

  const state = useAsync(async () => {
    const [payments, invoices] = await Promise.all([fetchPayments(), fetchInvoices()]);
    return { payments, invoices };
  }, []);

  const payments = state.data?.payments ?? [];
  const invoices = state.data?.invoices ?? [];

  /** Invoice → student, so the ledger reads like a cash book rather than a raw table. */
  const studentOfInvoice = useMemo(() => {
    const map = new Map<string, { name: string; className: string }>();
    invoices.forEach((invoice) => {
      if (!invoice.students) return;
      map.set(invoice.id, {
        name: `${invoice.students.first_name} ${invoice.students.last_name ?? ''}`.trim(),
        className: `${invoice.students.sections?.classes?.name ?? '—'}${
          invoice.students.sections ? ` / ${invoice.students.sections.name}` : ''
        }`,
      });
    });
    return map;
  }, [invoices]);

  /** Oldest first so the running balance actually accumulates. */
  const chronological = useMemo(() => {
    return [...payments].sort((a, b) => new Date(a.paid_at).getTime() - new Date(b.paid_at).getTime());
  }, [payments]);

  const ledger = useMemo(() => {
    let running = 0;
    return chronological.map((payment) => {
      running += toNumber(payment.amount);
      return { ...payment, running };
    });
  }, [chronological]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ledger
      .filter((row) => (method === 'all' ? true : row.method === method))
      .filter((row) => {
        if (!needle) return true;
        const student = studentOfInvoice.get(row.invoice_id);
        return (
          (row.receipt_no ?? '').toLowerCase().includes(needle) ||
          (row.reference ?? '').toLowerCase().includes(needle) ||
          (student?.name ?? '').toLowerCase().includes(needle)
        );
      })
      .reverse();
  }, [ledger, method, query, studentOfInvoice]);

  const total = ledger.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const closing = ledger.length > 0 ? ledger[ledger.length - 1].running : 0;

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  return (
    <>
      <PageHeader title={t('app.ledger.title')} subtitle={t('app.ledger.subtitle')} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.ledger.entries')} value={ledger.length} icon="ri-book-read-line" tone="primary" />
        <StatCard label={t('app.ledger.collected')} value={formatMoney(total)} icon="ri-hand-coin-line" tone="secondary" />
        <StatCard label={t('app.ledger.closing')} value={formatMoney(closing)} icon="ri-scales-3-line" tone="accent" />
        <StatCard
          label={t('app.ledger.invoices')}
          value={invoices.length}
          icon="ri-receipt-line"
          tone="neutral"
        />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <SearchBox value={query} onChange={setQuery} />
          <div className="flex flex-wrap items-center gap-1.5">
            {METHODS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMethod(item)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  method === item
                    ? 'bg-secondary-500 text-background-50'
                    : 'bg-background-100 text-foreground-700 hover:bg-background-200'
                }`}
              >
                {item === 'all' ? t('app.common.all') : t(`app.expenses.pay.${item}`)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon="ri-book-read-line" label={t('app.ledger.empty')} />
        ) : (
          <TableWrap>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th>{t('app.ledger.receipt')}</Th>
                <Th>{t('app.common.date')}</Th>
                <Th>{t('app.ledger.student')}</Th>
                <Th>{t('app.expenses.method')}</Th>
                <Th>{t('app.ledger.reference')}</Th>
                <Th>{t('app.ledger.amount')}</Th>
                <Th>{t('app.ledger.balance')}</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const student = studentOfInvoice.get(row.invoice_id);
                return (
                  <Row key={row.id}>
                    <Td className="text-xs font-semibold tabular-nums whitespace-nowrap">{row.receipt_no ?? '—'}</Td>
                    <Td className="text-xs whitespace-nowrap">{formatDate(row.paid_at, i18n.language)}</Td>
                    <Td>
                      <p className="text-sm text-foreground-900 truncate max-w-[180px]">{student?.name ?? '—'}</p>
                      <p className="text-[11px] text-foreground-500 truncate max-w-[180px]">{student?.className ?? ''}</p>
                    </Td>
                    <Td>
                      <Badge tone="neutral">
                        {t(`app.expenses.pay.${row.method}`, { defaultValue: row.method })}
                      </Badge>
                    </Td>
                    <Td className="text-xs tabular-nums whitespace-nowrap">{row.reference ?? '—'}</Td>
                    <Td className="text-sm font-semibold tabular-nums whitespace-nowrap">{formatMoney(row.amount)}</Td>
                    <Td className="text-xs tabular-nums whitespace-nowrap text-foreground-600">
                      {formatMoney(row.running)}
                    </Td>
                  </Row>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </>
  );
}