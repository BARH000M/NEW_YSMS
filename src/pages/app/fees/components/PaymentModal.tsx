import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import { recordPayment } from '@/api/college';
import type { InvoiceWithStudent } from '@/api/college';
import { formatMoney } from '@/utils/money';

const METHODS = ['cash', 'bank_transfer', 'card', 'cheque', 'mobile_wallet'] as const;

const methodKey: Record<string, string> = {
  cash: 'app.fees.methodCash',
  bank_transfer: 'app.fees.methodBank',
  card: 'app.fees.methodCard',
  cheque: 'app.fees.methodCheque',
  mobile_wallet: 'app.fees.methodMobile',
};

export default function PaymentModal({
  invoice,
  balance,
  onClose,
  onSaved,
}: {
  invoice: InvoiceWithStudent;
  balance: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState<string>('cash');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const studentName = invoice.students
    ? `${invoice.students.first_name} ${invoice.students.last_name ?? ''}`.trim()
    : '—';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError(t('app.fees.invalidAmount'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await recordPayment({
        invoiceId: invoice.id,
        studentId: invoice.student_id,
        amount: value,
        method,
        reference,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t('app.fees.paymentTitle')}
      subtitle={`${studentName} · ${invoice.invoice_no}`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-3 rounded-md bg-background-100 border border-background-200 px-3 py-2.5">
          <div>
            <p className="text-[11px] text-foreground-500">{t('app.fees.total')}</p>
            <p className="text-sm font-semibold text-foreground-950 tabular-nums">{formatMoney(invoice.total)}</p>
          </div>
          <div>
            <p className="text-[11px] text-foreground-500">{t('app.fees.balance')}</p>
            <p className="text-sm font-semibold text-primary-700 tabular-nums">{formatMoney(balance)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="pay-amount">
            {t('app.fees.amount')}
          </label>
          <input
            id="pay-amount"
            name="amount"
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="pay-method">
            {t('app.fees.method')}
          </label>
          <select
            id="pay-method"
            name="method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={inputClass}
          >
            {METHODS.map((item) => (
              <option key={item} value={item}>
                {t(methodKey[item])}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="pay-ref">
            {t('app.fees.reference')} <span className="font-normal text-foreground-500">({t('app.common.optional')})</span>
          </label>
          <input
            id="pay-ref"
            name="reference"
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && (
          <p className="text-xs text-primary-900 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">{error}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="submit"
            disabled={busy}
            className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-4 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
          >
            {busy ? t('app.common.saving') : t('app.fees.recordPayment')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-background-300 text-foreground-800 text-xs font-semibold px-4 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
          >
            {t('app.common.cancel')}
          </button>
        </div>
      </form>
    </Modal>
  );
}