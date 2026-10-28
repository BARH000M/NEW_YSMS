import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import { saveInstallments, setInstallmentStatus } from '@/api/college';
import type { Installment, InstallmentInput, InvoiceWithStudent } from '@/api/college';
import { formatMoney, toNumber } from '@/utils/money';

interface DraftRow {
  id?: string;
  label: string;
  amount: string;
  dueDate: string;
  status: 'pending' | 'paid';
}

const addMonths = (base: Date, months: number) => {
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next.toISOString().slice(0, 10);
};

export default function InstallmentModal({
  invoice,
  existing,
  canWrite,
  onClose,
  onSaved,
}: {
  invoice: InvoiceWithStudent;
  existing: Installment[];
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const total = toNumber(invoice.total);

  const [rows, setRows] = useState<DraftRow[]>(
    existing.length > 0
      ? existing.map((item) => ({
          id: item.id,
          label: item.label ?? '',
          amount: String(toNumber(item.amount)),
          dueDate: item.due_date ?? '',
          status: item.status,
        }))
      : [],
  );
  const [splitCount, setSplitCount] = useState('3');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const studentName = invoice.students
    ? `${invoice.students.first_name} ${invoice.students.last_name ?? ''}`.trim()
    : '—';

  const planned = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
    [rows],
  );
  const remaining = Math.round((total - planned) * 100) / 100;

  const generate = () => {
    const count = Math.max(1, Math.min(12, Math.floor(Number(splitCount) || 1)));
    const base = Math.floor((total / count) * 100) / 100;
    const start = new Date();
    const next: DraftRow[] = Array.from({ length: count }, (_, index) => {
      const amount = index === count - 1 ? Math.round((total - base * (count - 1)) * 100) / 100 : base;
      return {
        label: `${t('app.fees.installment')} ${index + 1}`,
        amount: String(amount),
        dueDate: addMonths(start, index),
        status: 'pending' as const,
      };
    });
    setRows(next);
    setError(null);
  };

  const updateRow = (index: number, patch: Partial<DraftRow>) => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    setRows((current) => current.filter((_, i) => i !== index));
  };

  const addRow = () => {
    setRows((current) => [
      ...current,
      {
        label: `${t('app.fees.installment')} ${current.length + 1}`,
        amount: String(remaining > 0 ? remaining : 0),
        dueDate: addMonths(new Date(), current.length),
        status: 'pending',
      },
    ]);
  };

  const togglePaid = async (index: number) => {
    const row = rows[index];
    const nextStatus = row.status === 'paid' ? 'pending' : 'paid';
    updateRow(index, { status: nextStatus });
    if (row.id) {
      try {
        await setInstallmentStatus(row.id, nextStatus);
      } catch {
        updateRow(index, { status: row.status });
      }
    }
  };

  const handleSave = async () => {
    setError(null);
    if (rows.length === 0) {
      setError(t('app.fees.installmentEmpty'));
      return;
    }
    if (Math.abs(remaining) > 0.5) {
      setError(t('app.fees.installmentMismatch', { amount: formatMoney(total) }));
      return;
    }
    const payload: InstallmentInput[] = rows.map((row, index) => ({
      seq: index + 1,
      label: row.label,
      amount: Number(row.amount) || 0,
      dueDate: row.dueDate || null,
    }));
    setBusy(true);
    try {
      await saveInstallments(invoice.id, payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t('app.fees.installmentTitle')}
      subtitle={`${studentName} · ${invoice.invoice_no} · ${formatMoney(total)}`}
      onClose={onClose}
    >
      <div className="flex flex-col gap-3.5">
        {canWrite && (
          <div className="flex flex-wrap items-end gap-2 rounded-md bg-background-100 border border-background-200 p-3">
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className={labelClass} htmlFor="split-count">
                {t('app.fees.splitInto')}
              </label>
              <input
                id="split-count"
                type="number"
                min="1"
                max="12"
                value={splitCount}
                onChange={(e) => setSplitCount(e.target.value)}
                className={`${inputClass} w-24`}
              />
            </div>
            <button
              type="button"
              onClick={generate}
              className="inline-flex items-center gap-1.5 bg-secondary-500 hover:bg-secondary-600 text-background-50 text-xs font-semibold px-3.5 py-3 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-magic-line" />
              {t('app.fees.generate')}
            </button>
          </div>
        )}

        {rows.length === 0 ? (
          <p className="text-xs text-foreground-500 text-center py-6">{t('app.fees.installmentEmpty')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((row, index) => (
              <div
                key={row.id ?? index}
                className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-end rounded-md border border-background-200 p-2.5"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <label className="text-[10px] font-semibold text-foreground-500">{t('app.fees.label')}</label>
                  <input
                    type="text"
                    value={row.label}
                    disabled={!canWrite}
                    onChange={(e) => updateRow(index, { label: e.target.value })}
                    className="w-full box-border bg-background-50 border border-background-300 rounded-md px-2 py-1.5 text-xs text-foreground-900 focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:opacity-60"
                  />
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <label className="text-[10px] font-semibold text-foreground-500">{t('app.fees.amount')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.amount}
                    disabled={!canWrite}
                    onChange={(e) => updateRow(index, { amount: e.target.value })}
                    className="w-full sm:w-28 box-border bg-background-50 border border-background-300 rounded-md px-2 py-1.5 text-xs text-foreground-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:opacity-60"
                  />
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <label className="text-[10px] font-semibold text-foreground-500">{t('app.fees.dueDate')}</label>
                  <input
                    type="date"
                    value={row.dueDate}
                    disabled={!canWrite}
                    onChange={(e) => updateRow(index, { dueDate: e.target.value })}
                    className="w-full sm:w-36 box-border bg-background-50 border border-background-300 rounded-md px-2 py-1.5 text-xs text-foreground-900 focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:opacity-60"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void togglePaid(index)}
                    className={`inline-flex items-center rounded-full border px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                      row.status === 'paid'
                        ? 'bg-secondary-500 text-background-50 border-secondary-500'
                        : 'bg-background-50 text-foreground-600 border-background-300'
                    }`}
                  >
                    {row.status === 'paid' ? t('app.status.paid') : t('app.fees.markPaid')}
                  </button>
                  {canWrite && (
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="w-8 h-8 flex items-center justify-center rounded-md border border-background-300 text-primary-700 cursor-pointer"
                      aria-label={t('app.common.cancel')}
                    >
                      <i className="ri-delete-bin-line" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {canWrite && (
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-primary-600 hover:text-primary-700 cursor-pointer"
          >
            <i className="ri-add-line" />
            {t('app.fees.addInstallment')}
          </button>
        )}

        <div className="flex items-center justify-between rounded-md bg-background-100 border border-background-200 px-3 py-2">
          <span className="text-xs text-foreground-600">{t('app.fees.scheduled')}</span>
          <span className="text-sm font-semibold text-foreground-950 tabular-nums">
            {formatMoney(planned)} / {formatMoney(total)}
          </span>
        </div>
        {Math.abs(remaining) > 0.5 && (
          <p className="text-[11px] text-primary-700 tabular-nums -mt-2">
            {t('app.fees.remaining')}: {formatMoney(remaining)}
          </p>
        )}

        {error && (
          <p className="text-xs text-primary-900 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">{error}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          {canWrite && (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={busy}
              className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-4 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              {busy ? t('app.common.saving') : t('app.fees.saveSchedule')}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-background-300 text-foreground-800 text-xs font-semibold px-4 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
          >
            {t('app.common.close')}
          </button>
        </div>
      </div>
    </Modal>
  );
}