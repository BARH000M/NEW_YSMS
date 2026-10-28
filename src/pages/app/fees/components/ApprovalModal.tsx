import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import { createApproval } from '@/api/college';
import type { ApprovalType, InvoiceWithStudent } from '@/api/college';

const TYPES: ApprovalType[] = ['invoice_adjustment', 'discount', 'refund', 'write_off', 'other'];

export default function ApprovalModal({
  invoices,
  requesterName,
  onClose,
  onSaved,
}: {
  invoices: InvoiceWithStudent[];
  requesterName: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [requestType, setRequestType] = useState<ApprovalType>('discount');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number(amount);
    if (!title.trim()) {
      setError(t('app.approvals.needTitle'));
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError(t('app.fees.invalidAmount'));
      return;
    }
    const invoice = invoices.find((item) => item.id === invoiceId) ?? null;
    setBusy(true);
    setError(null);
    try {
      await createApproval({
        requestType,
        title: title.trim(),
        amount: value,
        invoiceId: invoice?.id ?? null,
        studentId: invoice?.students?.id ?? null,
        note,
        requestedByName: requesterName,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.approvals.newTitle')} subtitle={t('app.approvals.newHint')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="ap-type">
            {t('app.approvals.type')}
          </label>
          <select
            id="ap-type"
            name="requestType"
            value={requestType}
            onChange={(e) => setRequestType(e.target.value as ApprovalType)}
            className={inputClass}
          >
            {TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`app.approvals.types.${type}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="ap-title">
            {t('app.approvals.titleField')}
          </label>
          <input
            id="ap-title"
            name="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="ap-amount">
              {t('app.fees.amount')}
            </label>
            <input
              id="ap-amount"
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
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="ap-invoice">
              {t('app.fees.invoiceNo')}{' '}
              <span className="font-normal text-foreground-500">({t('app.common.optional')})</span>
            </label>
            <select
              id="ap-invoice"
              name="invoiceId"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {invoices.slice(0, 100).map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoice_no}
                  {invoice.students ? ` · ${invoice.students.first_name} ${invoice.students.last_name ?? ''}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="ap-note">
            {t('app.approvals.note')}
          </label>
          <textarea
            id="ap-note"
            name="note"
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
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
            {busy ? t('app.common.saving') : t('app.approvals.submit')}
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