import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAsync } from '@/hooks/useAsync';
import { fetchPayments } from '@/api/college';
import { fetchExpenses } from '@/api/operations';
import { formatMoney, toNumber } from '@/utils/money';
import ExportBar from '@/components/app/ExportBar';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import {
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Row,
  StatCard,
  TableWrap,
  Td,
  Th,
} from '@/components/app/ui';

const MONTH_KEYS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

interface MonthPoint {
  key: string;
  label: string;
  collected: number;
  spent: number;
  net: number;
}

/**
 * Chart & graph analysis in fees — the reference screen's bar chart of one
 * month and its collection-vs-expense curve for the session, built from the
 * live payments and expenses tables.
 */
export default function FinanceChartPage() {
  const { t, i18n } = useTranslation();
  const [monthCursor, setMonthCursor] = useState(() => new Date().toISOString().slice(0, 7));

  const state = useAsync(async () => {
    const [payments, expenses] = await Promise.all([fetchPayments(), fetchExpenses()]);
    return { payments, expenses };
  }, []);

  const payments = state.data?.payments ?? [];
  const expenses = state.data?.expenses ?? [];

  const year = monthCursor.slice(0, 4);

  const months = useMemo<MonthPoint[]>(() => {
    const monthLabel = (key: string) =>
      new Intl.DateTimeFormat(i18n.language, { month: 'short' }).format(new Date(`${key}-01T00:00:00`));

    return MONTH_KEYS.map((month) => {
      const key = `${year}-${month}`;
      const collected = payments
        .filter((row) => (row.paid_at ?? '').slice(0, 7) === key)
        .reduce((sum, row) => sum + toNumber(row.amount), 0);
      const spent = expenses
        .filter((row) => (row.spent_on ?? '').slice(0, 7) === key)
        .reduce((sum, row) => sum + toNumber(row.amount), 0);
      return {
        key,
        label: `${monthLabel(key)} ${year.slice(2)}`,
        collected: Math.round(collected * 100) / 100,
        spent: Math.round(spent * 100) / 100,
        net: Math.round((collected - spent) * 100) / 100,
      };
    });
  }, [payments, expenses, year, i18n.language]);

  const days = useMemo(() => {
    const lastDay = new Date(
      Number(year),
      Number(monthCursor.slice(5, 7)),
      0,
    ).getDate();

    return Array.from({ length: lastDay }, (_, index) => {
      const day = String(index + 1).padStart(2, '0');
      const key = `${monthCursor}-${day}`;
      const collected = payments
        .filter((row) => (row.paid_at ?? '').slice(0, 10) === key)
        .reduce((sum, row) => sum + toNumber(row.amount), 0);
      const spent = expenses
        .filter((row) => (row.spent_on ?? '').slice(0, 10) === key)
        .reduce((sum, row) => sum + toNumber(row.amount), 0);
      return { key: day, collected: Math.round(collected * 100) / 100, spent: Math.round(spent * 100) / 100 };
    });
  }, [payments, expenses, monthCursor, year]);

  const totals = useMemo(() => {
    const collected = months.reduce((sum, row) => sum + row.collected, 0);
    const spent = months.reduce((sum, row) => sum + row.spent, 0);
    return { collected, spent, net: collected - spent };
  }, [months]);

  const monthCollected = days.reduce((sum, row) => sum + row.collected, 0);
  const monthSpent = days.reduce((sum, row) => sum + row.spent, 0);

  const axisStyle = { fontSize: 11, fill: 'oklch(var(--foreground-600))' } as const;
  const gridColor = 'oklch(var(--background-300))';

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  return (
    <>
      <PageHeader
        title={t('app.chart.title')}
        subtitle={t('app.chart.subtitle')}
        action={
          <>
            <div className="w-40">
              <label className={labelClass} htmlFor="chart-month">
                {t('app.chart.month')}
              </label>
              <input
                id="chart-month"
                type="month"
                value={monthCursor}
                onChange={(event) => setMonthCursor(event.target.value)}
                className={inputClass}
              />
            </div>
            <ExportBar
              title={`${t('app.chart.title')} — ${year}`}
              fileName={`fees-analysis-${year}`}
              columns={[
                t('app.chart.month'),
                t('app.chart.collected'),
                t('app.chart.spent'),
                t('app.chart.net'),
              ]}
              rows={months.map((row) => [row.label, row.collected, row.spent, row.net])}
              summary={[
                { label: t('app.chart.collected'), value: formatMoney(totals.collected) },
                { label: t('app.chart.spent'), value: formatMoney(totals.spent) },
                { label: t('app.chart.net'), value: formatMoney(totals.net) },
              ]}
              hint={`${t('app.chart.session')}: ${year}`}
            />
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.chart.collected')} value={formatMoney(totals.collected)} icon="ri-arrow-down-line" tone="secondary" />
        <StatCard label={t('app.chart.spent')} value={formatMoney(totals.spent)} icon="ri-arrow-up-line" tone="danger" />
        <StatCard label={t('app.chart.net')} value={formatMoney(totals.net)} icon="ri-scales-3-line" tone="primary" />
        <StatCard
          label={t('app.chart.monthNet')}
          value={formatMoney(monthCollected - monthSpent)}
          icon="ri-line-chart-line"
          tone="accent"
          hint={monthCursor}
        />
      </div>

      <Card className="mb-3 md:mb-4">
        <CardHeader title={t('app.chart.sessionChart')} />
        <div className="p-3 md:p-4 h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={months} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={gridColor} vertical={false} />
              <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={{ stroke: gridColor }} />
              <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={70} />
              <Tooltip
                formatter={(value) => formatMoney(Number(value))}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: '1px solid oklch(var(--background-300))',
                  background: 'oklch(var(--background-50))',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="collected"
                name={t('app.chart.collected')}
                fill="oklch(var(--secondary-500))"
                radius={[3, 3, 0, 0]}
                barSize={16}
              />
              <Bar
                dataKey="spent"
                name={t('app.chart.spent')}
                fill="oklch(var(--primary-300))"
                radius={[3, 3, 0, 0]}
                barSize={16}
              />
              <Line
                type="monotone"
                dataKey="net"
                name={t('app.chart.net')}
                stroke="oklch(var(--accent-600))"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="mb-3 md:mb-4">
        <CardHeader
          title={t('app.chart.dailyChart')}
          action={<span className="text-[11px] text-foreground-500 tabular-nums">{monthCursor}</span>}
        />
        <div className="p-3 md:p-4 h-[260px]">
          {monthCollected + monthSpent === 0 ? (
            <EmptyState icon="ri-bar-chart-line" label={t('app.chart.noChartData')} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={gridColor} vertical={false} />
                <XAxis dataKey="key" tick={axisStyle} tickLine={false} axisLine={{ stroke: gridColor }} />
                <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={64} />
                <Tooltip
                  formatter={(value) => formatMoney(Number(value))}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid oklch(var(--background-300))',
                    background: 'oklch(var(--background-50))',
                  }}
                />
                <Bar
                  dataKey="collected"
                  name={t('app.chart.collected')}
                  fill="oklch(var(--secondary-500))"
                  radius={[2, 2, 0, 0]}
                  barSize={10}
                />
                <Line
                  type="monotone"
                  dataKey="spent"
                  name={t('app.chart.spent')}
                  stroke="oklch(var(--primary-700))"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title={t('app.chart.monthTable')} />
        <TableWrap>
          <thead className="bg-background-100 border-b border-background-200">
            <tr>
              <Th>{t('app.chart.month')}</Th>
              <Th>{t('app.chart.collected')}</Th>
              <Th>{t('app.chart.spent')}</Th>
              <Th>{t('app.chart.net')}</Th>
            </tr>
          </thead>
          <tbody>
            {months.map((row) => (
              <Row key={row.key}>
                <Td className="text-xs whitespace-nowrap">{row.label}</Td>
                <Td className="text-xs tabular-nums">{formatMoney(row.collected)}</Td>
                <Td className="text-xs tabular-nums">{formatMoney(row.spent)}</Td>
                <Td
                  className={`text-xs font-semibold tabular-nums ${
                    row.net < 0 ? 'text-primary-800' : 'text-secondary-800'
                  }`}
                >
                  {formatMoney(row.net)}
                </Td>
              </Row>
            ))}
            <tr className="bg-background-100">
              <Td className="text-xs font-bold">{t('app.chart.total')}</Td>
              <Td className="text-xs font-bold tabular-nums">{formatMoney(totals.collected)}</Td>
              <Td className="text-xs font-bold tabular-nums">{formatMoney(totals.spent)}</Td>
              <Td className="text-xs font-bold tabular-nums">{formatMoney(totals.net)}</Td>
            </tr>
          </tbody>
        </TableWrap>
      </Card>
    </>
  );
}