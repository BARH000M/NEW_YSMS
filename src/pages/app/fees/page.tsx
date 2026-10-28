import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchApprovals,
  fetchFeeHeads,
  fetchInstallments,
  fetchInstitution,
  fetchInvoiceItems,
  fetchInvoices,
  fetchPayments,
  fetchStudents,
} from '@/api/college';
import type { InvoiceWithStudent } from '@/api/college';
import { formatDate } from '@/utils/date';
import { formatMoney, toNumber } from '@/utils/money';
import PrintSheet from '@/components/app/PrintSheet';
import ExportBar from '@/components/app/ExportBar';
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
  StatusPill,
  TableWrap,
  Tabs,
  Td,
  Th,
} from '@/components/app/ui';
import PaymentModal from './components/PaymentModal';
import InvoiceModal from './components/InvoiceModal';
import FeeReceipt from './components/FeeReceipt';
import InstallmentModal from './components/InstallmentModal';
import ApprovalModal from './components/ApprovalModal';
import ApprovalsPanel from './components/ApprovalsPanel';

const WRITE_ROLES = ['super_admin', 'admin', 'accountant'];

export default function FeesPage() {
  const { t, i18n } = useTranslation();
  const { role, profile, user } = useAuth();
  const canWrite = role ? WRITE_ROLES.includes(role) : false;
  const reviewerName = profile?.full_name || profile?.full_name_ar || user?.email || null;

  const [tab, setTab] = useState<'invoices' | 'approvals' | 'heads'>('invoices');
  const [installmentFor, setInstallmentFor] = useState<InvoiceWithStudent | null>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [paymentFor, setPaymentFor] = useState<InvoiceWithStudent | null>(null);
  const [receiptFor, setReceiptFor] = useState<InvoiceWithStudent | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const state = useAsync(async () => {
    const [invoices, heads, students, items, payments, institution, installments, approvals] =
      await Promise.all([
        fetchInvoices(),
        fetchFeeHeads(),
        fetchStudents(),
        fetchInvoiceItems(),
        fetchPayments(),
        fetchInstitution(),
        fetchInstallments(),
        fetchApprovals(),
      ]);
    return { invoices, heads, students, items, payments, institution, installments, approvals };
  }, []);

  const rows = useMemo(() => {
    const list = state.data?.invoices ?? [];
    const needle = query.trim().toLowerCase();
    return list.filter((invoice) => {
      const matchesTab = statusFilter === 'all' || invoice.status === statusFilter;
      const name = invoice.students
        ? `${invoice.students.first_name} ${invoice.students.last_name ?? ''}`.toLowerCase()
        : '';
      const matchesQuery =
        !needle || name.includes(needle) || invoice.invoice_no.toLowerCase().includes(needle);
      return matchesTab && matchesQuery;
    });
  }, [state.data, query, statusFilter]);

  if (state.loading) return <LoadingBlock />;
  if (state.error || !state.data) {
    return <ErrorState message={state.error ?? t('app.common.errorDesc')} onRetry={state.reload} />;
  }

  const { invoices, heads, students, items, payments, institution, installments, approvals } = state.data;
  const pendingApprovals = approvals.filter((approval) => approval.status === 'pending').length;
  const canReview = role === 'super_admin' || role === 'admin';

  const paidOf = (invoice: InvoiceWithStudent) =>
    (invoice.payments ?? []).reduce((sum, payment) => sum + toNumber(payment.amount), 0);

  const billed = invoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0);
  const collected = invoices.reduce((sum, invoice) => sum + paidOf(invoice), 0);
  const outstanding = Math.max(0, billed - collected);

  const balanceOf = (invoice: InvoiceWithStudent) =>
    Math.max(0, toNumber(invoice.total) - paidOf(invoice));

  const reloadAll = () => {
    state.reload();
  };

  return (
    <>
      <PageHeader
        title={t('app.fees.title')}
        subtitle={t('app.fees.subtitle')}
        action={
          <>
            <ExportBar
              title={`${t('app.fees.invoices')} — ${t('app.nav.brand')}`}
              fileName="invoice-register"
              columns={[
                t('app.fees.invoiceNo'),
                t('app.fees.student'),
                t('app.reports.class'),
                t('app.fees.issued'),
                t('app.fees.dueDate'),
                t('app.fees.total'),
                t('app.fees.paid'),
                t('app.fees.balance'),
                t('app.common.status'),
              ]}
              rows={rows.map((invoice) => [
                invoice.invoice_no,
                invoice.students
                  ? `${invoice.students.first_name} ${invoice.students.last_name ?? ''}`.trim()
                  : '',
                invoice.students?.sections?.classes?.name ?? '',
                formatDate(invoice.issue_date, i18n.language),
                invoice.due_date ? formatDate(invoice.due_date, i18n.language) : '',
                toNumber(invoice.total),
                paidOf(invoice),
                balanceOf(invoice),
                t(`app.status.${invoice.status}`, { defaultValue: invoice.status }),
              ])}
              hint={statusFilter === 'all' ? t('app.common.all') : t(`app.status.${statusFilter}`)}
              summary={[
                { label: t('app.fees.billed'), value: formatMoney(billed) },
                { label: t('app.fees.collected'), value: formatMoney(collected) },
                { label: t('app.fees.outstanding'), value: formatMoney(outstanding) },
              ]}
            />
            {canWrite ? (
            <>
              <Link
                to="/app/fees/outstanding"
                className="inline-flex items-center gap-1.5 border border-background-300 hover:border-primary-400 text-foreground-800 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
              >
                <i className="ri-file-chart-line" />
                {t('app.nav.outstanding')}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setNotice(null);
                  setInvoiceOpen(true);
                }}
                className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
              >
                <i className="ri-add-line" />
                {t('app.fees.newInvoice')}
              </button>
            </>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.fees.billed')} value={formatMoney(billed)} icon="ri-file-list-3-line" tone="primary" />
        <StatCard label={t('app.fees.collected')} value={formatMoney(collected)} icon="ri-wallet-3-line" tone="secondary" />
        <StatCard label={t('app.fees.outstanding')} value={formatMoney(outstanding)} icon="ri-time-line" tone="danger" />
        <StatCard
          label={t('app.approvals.pending')}
          value={pendingApprovals}
          icon="ri-git-pull-request-line"
          tone="accent"
        />
      </div>

      {notice && (
        <div className="mb-3 rounded-md border border-secondary-200 bg-secondary-100 px-3 py-2 text-xs text-secondary-900">
          {notice}
        </div>
      )}

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <Tabs
            value={tab}
            onChange={(key) => setTab(key as 'invoices' | 'approvals' | 'heads')}
            items={[
              { key: 'invoices', label: t('app.fees.invoices'), count: invoices.length },
              { key: 'approvals', label: t('app.approvals.title'), count: pendingApprovals },
              { key: 'heads', label: t('app.fees.heads'), count: heads.length },
            ]}
          />
          {tab === 'invoices' && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {['all', 'unpaid', 'partial', 'paid'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer border transition-colors ${
                      statusFilter === status
                        ? 'bg-primary-500 text-background-50 border-primary-500'
                        : 'bg-background-50 text-foreground-700 border-background-300 hover:border-primary-400'
                    }`}
                  >
                    {status === 'all' ? t('app.common.all') : t(`app.status.${status}`)}
                  </button>
                ))}
              </div>
              <SearchBox value={query} onChange={setQuery} />
            </div>
          )}
        </div>
      </Card>

      {tab === 'invoices' ? (
        <Card>
          {rows.length === 0 ? (
            <EmptyState icon="ri-receipt-line" />
          ) : (
            <TableWrap>
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.fees.student')}</Th>
                  <Th>{t('app.fees.invoiceNo')}</Th>
                  <Th>{t('app.fees.issued')}</Th>
                  <Th>{t('app.fees.total')}</Th>
                  <Th>{t('app.fees.paid')}</Th>
                  <Th>{t('app.fees.balance')}</Th>
                  <Th>{t('app.common.status')}</Th>
                  <Th className="text-end">{t('app.common.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((invoice) => {
                  const balance = balanceOf(invoice);
                  const studentName = invoice.students
                    ? `${invoice.students.first_name} ${invoice.students.last_name ?? ''}`.trim()
                    : '—';
                  return (
                    <Row key={invoice.id}>
                      <Td>
                        <p className="text-sm font-medium text-foreground-950 truncate max-w-[180px]">{studentName}</p>
                        <p className="text-[11px] text-foreground-500">
                          {invoice.students?.sections?.classes?.name ?? '—'}
                          {invoice.students?.sections ? ` / ${invoice.students.sections.name}` : ''}
                        </p>
                      </Td>
                      <Td className="text-xs tabular-nums whitespace-nowrap">{invoice.invoice_no}</Td>
                      <Td className="text-xs whitespace-nowrap">
                        {formatDate(invoice.issue_date, i18n.language)}
                        {invoice.due_date ? (
                          <span className="block text-[11px] text-foreground-500">
                            {formatDate(invoice.due_date, i18n.language)}
                          </span>
                        ) : null}
                      </Td>
                      <Td className="text-xs font-semibold tabular-nums">{formatMoney(invoice.total)}</Td>
                      <Td className="text-xs tabular-nums text-secondary-700">{formatMoney(paidOf(invoice))}</Td>
                      <Td className="text-xs tabular-nums font-semibold text-primary-700">{formatMoney(balance)}</Td>
                      <Td>
                        <StatusPill value={invoice.status} />
                      </Td>
                      <Td className="text-end">
                        <span className="inline-flex items-center gap-3 justify-end">
                          <button
                            type="button"
                            onClick={() => setReceiptFor(invoice)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-foreground-700 hover:text-primary-700 cursor-pointer whitespace-nowrap"
                          >
                            <i className="ri-printer-line" />
                            {t('app.print.receipt')}
                          </button>
                          {canWrite ? (
                            <button
                              type="button"
                              onClick={() => {
                                setNotice(null);
                                setInstallmentFor(invoice);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-foreground-700 hover:text-primary-700 cursor-pointer whitespace-nowrap"
                            >
                              <i className="ri-calendar-schedule-line" />
                              {t('app.fees.installments')}
                            </button>
                          ) : null}
                          {canWrite && balance > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setNotice(null);
                                setPaymentFor(invoice);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
                            >
                              <i className="ri-hand-coin-line" />
                              {t('app.fees.recordPayment')}
                            </button>
                          ) : null}
                        </span>
                      </Td>
                    </Row>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </Card>
      ) : tab === 'approvals' ? (
        <div className="flex flex-col gap-3">
          {canWrite && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-foreground-600">{t('app.approvals.subtitle')}</p>
              <button
                type="button"
                onClick={() => {
                  setNotice(null);
                  setApprovalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
              >
                <i className="ri-add-line" />
                {t('app.approvals.newTitle')}
              </button>
            </div>
          )}
          <ApprovalsPanel
            approvals={approvals}
            canReview={canReview}
            reviewerName={reviewerName}
            onChanged={(message) => {
              setNotice(message);
              reloadAll();
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {heads.length === 0 && (
            <Card className="sm:col-span-2 lg:col-span-3">
              <EmptyState icon="ri-price-tag-3-line" />
            </Card>
          )}
          {heads.map((head) => (
            <Card key={head.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground-950 truncate">{head.name}</p>
                  <p className="text-[11px] text-foreground-500 mt-0.5">
                    {head.code ?? '—'} · {head.category}
                  </p>
                </div>
                <Badge tone={head.is_active ? 'secondary' : 'neutral'}>
                  {head.is_active ? t('app.common.active') : t('app.common.inactive')}
                </Badge>
              </div>
              <p className="font-heading text-2xl text-foreground-950 mt-3 tabular-nums">{formatMoney(head.amount)}</p>
            </Card>
          ))}
        </div>
      )}

      {paymentFor && (
        <PaymentModal
          invoice={paymentFor}
          balance={balanceOf(paymentFor)}
          onClose={() => setPaymentFor(null)}
          onSaved={() => {
            setPaymentFor(null);
            setNotice(t('app.fees.paymentSaved'));
            reloadAll();
          }}
        />
      )}

      {receiptFor && (
        <PrintSheet
          title={t('app.print.receipt')}
          hint={`${receiptFor.invoice_no} · ${t('app.print.receiptHint')}`}
          onClose={() => setReceiptFor(null)}
        >
          <FeeReceipt
            invoice={receiptFor}
            payments={payments.filter((payment) => payment.invoice_id === receiptFor.id)}
            items={items
              .filter((item) => item.invoice_id === receiptFor.id)
              .map((item) => ({
                id: item.id,
                invoice_id: item.invoice_id,
                fee_head_id: item.fee_head_id,
                description: item.description,
                amount: item.amount,
              }))}
            institution={institution}
          />
        </PrintSheet>
      )}

      {installmentFor && (
        <InstallmentModal
          invoice={installmentFor}
          existing={installments.filter((item) => item.invoice_id === installmentFor.id)}
          canWrite={canWrite}
          onClose={() => setInstallmentFor(null)}
          onSaved={() => {
            setInstallmentFor(null);
            setNotice(t('app.fees.scheduleSaved'));
            reloadAll();
          }}
        />
      )}

      {approvalOpen && (
        <ApprovalModal
          invoices={invoices}
          requesterName={reviewerName}
          onClose={() => setApprovalOpen(false)}
          onSaved={() => {
            setApprovalOpen(false);
            setNotice(t('app.approvals.created'));
            reloadAll();
          }}
        />
      )}

      {invoiceOpen && (
        <InvoiceModal
          students={students}
          heads={heads}
          onClose={() => setInvoiceOpen(false)}
          onSaved={(appliedDiscount) => {
            setInvoiceOpen(false);
            setNotice(
              appliedDiscount > 0
                ? t('app.fees.invoiceSavedAuto', { amount: formatMoney(appliedDiscount) })
                : t('app.fees.invoiceSaved'),
            );
            reloadAll();
          }}
        />
      )}
    </>
  );
}