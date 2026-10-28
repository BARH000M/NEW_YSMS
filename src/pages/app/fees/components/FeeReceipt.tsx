import { useTranslation } from 'react-i18next';
import type { Institution, InvoiceItem, Payment } from '@/api/types';
import type { InvoiceWithStudent } from '@/api/college';
import { formatDate } from '@/utils/date';
import { formatMoney, toNumber } from '@/utils/money';

export default function FeeReceipt({
  invoice,
  payments,
  items,
  institution,
}: {
  invoice: InvoiceWithStudent;
  payments: Payment[];
  items: InvoiceItem[];
  institution: Institution | null;
}) {
  const { t, i18n } = useTranslation();

  const studentName = invoice.students
    ? `${invoice.students.first_name} ${invoice.students.last_name ?? ''}`.trim()
    : '—';
  const paid = payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  const total = toNumber(invoice.total);
  const balance = Math.max(0, total - paid);
  const subtotal = toNumber(invoice.subtotal);
  const discount = toNumber(invoice.discount);

  const methodKey: Record<string, string> = {
    cash: 'app.fees.methodCash',
    bank_transfer: 'app.fees.methodBank',
    card: 'app.fees.methodCard',
    cheque: 'app.fees.methodCheque',
    mobile_wallet: 'app.fees.methodMobile',
  };

  const lineItems: { id: string; description: string; amount: number }[] =
    items.length > 0
      ? items.map((item) => ({ id: item.id, description: item.description, amount: item.amount }))
      : [{ id: 'fallback', description: t('app.print.generalFee'), amount: subtotal }];

  return (
    <div className="print-break p-6 sm:p-8 text-foreground-950">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b-2 border-foreground-900">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-12 h-12 shrink-0 rounded-md bg-foreground-950 text-background-50 flex items-center justify-center font-bold text-sm">
            SAI
          </span>
          <div className="min-w-0">
            <p className="font-heading text-lg leading-tight">
              {institution?.name_ar || institution?.name || 'SAI Educational College'}
            </p>
            <p className="text-[11px] text-foreground-600 mt-0.5">
              {institution?.name || 'SAI Educational College'}
            </p>
            <p className="text-[11px] text-foreground-600">
              {institution?.address ?? '—'} · {institution?.phone ?? '—'}
            </p>
          </div>
        </div>

        <div className="text-end shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground-500">
            {t('app.print.receiptNo')}
          </p>
          <p className="text-sm font-semibold tabular-nums" dir="ltr">
            {invoice.invoice_no}
          </p>
          <p className="text-[11px] text-foreground-600 mt-1">
            {t('app.print.issueDate')}: {formatDate(invoice.issue_date, i18n.language)}
          </p>
          {invoice.due_date ? (
            <p className="text-[11px] text-foreground-600">
              {t('app.fees.dueDate')}: {formatDate(invoice.due_date, i18n.language)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="text-center my-4">
        <h1 className="font-heading text-xl">{t('app.print.receiptTitle')}</h1>
        <p className="text-[11px] text-foreground-500 mt-0.5">{t('app.print.receiptSubtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-md border border-foreground-200 bg-background-50 px-4 py-3 text-xs">
        <div>
          <span className="text-foreground-500">{t('app.fees.student')}: </span>
          <span className="font-semibold">{studentName}</span>
        </div>
        <div>
          <span className="text-foreground-500">{t('app.students.studentNo')}: </span>
          <span className="font-semibold tabular-nums" dir="ltr">
            {invoice.students?.student_no ?? '—'}
          </span>
        </div>
        <div>
          <span className="text-foreground-500">{t('app.students.classCol')}: </span>
          <span className="font-semibold">
            {invoice.students?.sections?.classes?.name ?? '—'}
            {invoice.students?.sections ? ` / ${invoice.students.sections.name}` : ''}
          </span>
        </div>
        <div>
          <span className="text-foreground-500">{t('app.common.status')}: </span>
          <span className="font-semibold">{t(`app.status.${invoice.status}`, { defaultValue: invoice.status })}</span>
        </div>
      </div>

      <table className="w-full mt-4 border-collapse text-xs">
        <thead>
          <tr className="bg-background-200">
            <th className="text-start font-semibold px-3 py-2 border border-foreground-200">
              {t('app.fees.description')}
            </th>
            <th className="text-end font-semibold px-3 py-2 border border-foreground-200 w-32">
              {t('app.fees.amount')}
            </th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item) => (
            <tr key={item.id}>
              <td className="px-3 py-2 border border-foreground-200">{item.description}</td>
              <td className="px-3 py-2 border border-foreground-200 text-end tabular-nums">
                {formatMoney(item.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mt-3">
        <div className="w-full sm:w-72 text-xs">
          <div className="flex items-center justify-between py-1.5 border-b border-foreground-200">
            <span className="text-foreground-600">{t('app.print.subtotal')}</span>
            <span className="tabular-nums">{formatMoney(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex items-center justify-between py-1.5 border-b border-foreground-200">
              <span className="text-foreground-600">{t('app.fees.discount')}</span>
              <span className="tabular-nums">- {formatMoney(discount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-1.5 border-b border-foreground-200 font-semibold">
            <span>{t('app.fees.total')}</span>
            <span className="tabular-nums">{formatMoney(total)}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-foreground-200">
            <span className="text-foreground-600">{t('app.fees.paid')}</span>
            <span className="tabular-nums">{formatMoney(paid)}</span>
          </div>
          <div className="flex items-center justify-between py-2 mt-1 bg-background-200 px-2 font-bold">
            <span>{t('app.fees.balance')}</span>
            <span className="tabular-nums">{formatMoney(balance)}</span>
          </div>
        </div>
      </div>

      {payments.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold text-foreground-700 mb-1.5">{t('app.print.paymentLines')}</p>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-background-200">
                <th className="text-start font-semibold px-2 py-1.5 border border-foreground-200">
                  {t('app.print.receiptNo')}
                </th>
                <th className="text-start font-semibold px-2 py-1.5 border border-foreground-200">
                  {t('app.common.date')}
                </th>
                <th className="text-start font-semibold px-2 py-1.5 border border-foreground-200">
                  {t('app.fees.method')}
                </th>
                <th className="text-end font-semibold px-2 py-1.5 border border-foreground-200">
                  {t('app.fees.amount')}
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-2 py-1.5 border border-foreground-200 tabular-nums" dir="ltr">
                    {payment.receipt_no ?? '—'}
                  </td>
                  <td className="px-2 py-1.5 border border-foreground-200">
                    {formatDate(payment.paid_at, i18n.language)}
                  </td>
                  <td className="px-2 py-1.5 border border-foreground-200">
                    {t(methodKey[payment.method] ?? 'app.fees.methodCash')}
                  </td>
                  <td className="px-2 py-1.5 border border-foreground-200 text-end tabular-nums">
                    {formatMoney(payment.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-2 gap-8 mt-10 text-[11px] text-foreground-600">
        <div>
          <div className="border-t border-foreground-400 pt-1.5">{t('app.print.cashierSign')}</div>
        </div>
        <div>
          <div className="border-t border-foreground-400 pt-1.5">{t('app.print.parentSign')}</div>
        </div>
      </div>

      <p className="text-[10px] text-foreground-500 mt-5 text-center leading-relaxed">
        {t('app.print.receiptFooter')}
      </p>
    </div>
  );
}