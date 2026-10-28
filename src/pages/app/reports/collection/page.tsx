import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { fetchInvoices } from '@/api/college';
import { formatMoney, toNumber } from '@/utils/money';
import {
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  ProgressRow,
  Row,
  StatCard,
  TableWrap,
  Td,
  Th,
} from '@/components/app/ui';

interface ClassBucket {
  name: string;
  invoices: number;
  billed: number;
  collected: number;
  outstanding: number;
  rate: number;
}

export default function CollectionLoadPage() {
  const { t } = useTranslation();

  const state = useAsync(() => fetchInvoices(), []);

  const buckets = useMemo<ClassBucket[]>(() => {
    const map = new Map<string, ClassBucket>();
    (state.data ?? []).forEach((invoice) => {
      if (invoice.status === 'void') return;
      const name = invoice.students?.sections?.classes?.name ?? t('app.collection.unassigned');
      const current =
        map.get(name) ?? { name, invoices: 0, billed: 0, collected: 0, outstanding: 0, rate: 0 };
      const billed = toNumber(invoice.total);
      const collected = (invoice.payments ?? []).reduce((sum, payment) => sum + toNumber(payment.amount), 0);
      current.invoices += 1;
      current.billed += billed;
      current.collected += collected;
      current.outstanding += Math.max(0, billed - collected);
      map.set(name, current);
    });
    return Array.from(map.values())
      .map((bucket) => ({
        ...bucket,
        rate: bucket.billed > 0 ? Math.round((bucket.collected / bucket.billed) * 100) : 0,
      }))
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [state.data, t]);

  const totals = buckets.reduce(
    (acc, bucket) => ({
      billed: acc.billed + bucket.billed,
      collected: acc.collected + bucket.collected,
      outstanding: acc.outstanding + bucket.outstanding,
      invoices: acc.invoices + bucket.invoices,
    }),
    { billed: 0, collected: 0, outstanding: 0, invoices: 0 },
  );

  const overallRate = totals.billed > 0 ? Math.round((totals.collected / totals.billed) * 100) : 0;

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  return (
    <>
      <PageHeader title={t('app.collection.title')} subtitle={t('app.collection.subtitle')} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.collection.billed')} value={formatMoney(totals.billed)} icon="ri-receipt-line" tone="primary" />
        <StatCard label={t('app.collection.collected')} value={formatMoney(totals.collected)} icon="ri-hand-coin-line" tone="secondary" />
        <StatCard label={t('app.collection.outstanding')} value={formatMoney(totals.outstanding)} icon="ri-alarm-warning-line" tone="danger" />
        <StatCard label={t('app.collection.rate')} value={`${overallRate}%`} icon="ri-pie-chart-line" tone="accent" />
      </div>

      <Card>
        <CardHeader title={t('app.collection.byClass')} />
        {buckets.length === 0 ? (
          <EmptyState icon="ri-pie-chart-line" />
        ) : (
          <TableWrap>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th>{t('app.reports.class')}</Th>
                <Th>{t('app.collection.invoices')}</Th>
                <Th>{t('app.collection.billed')}</Th>
                <Th>{t('app.collection.collected')}</Th>
                <Th>{t('app.collection.outstanding')}</Th>
                <Th>{t('app.collection.rate')}</Th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((bucket) => (
                <Row key={bucket.name}>
                  <Td className="text-sm font-medium text-foreground-950 whitespace-nowrap">{bucket.name}</Td>
                  <Td className="text-xs tabular-nums">{bucket.invoices}</Td>
                  <Td className="text-xs tabular-nums whitespace-nowrap">{formatMoney(bucket.billed)}</Td>
                  <Td className="text-xs tabular-nums whitespace-nowrap text-secondary-700 font-semibold">
                    {formatMoney(bucket.collected)}
                  </Td>
                  <Td className="text-xs tabular-nums whitespace-nowrap font-semibold">{formatMoney(bucket.outstanding)}</Td>
                  <Td className="w-40">
                    <ProgressRow value={bucket.rate} />
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