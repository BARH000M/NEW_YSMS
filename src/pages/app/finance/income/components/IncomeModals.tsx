import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import type { IncomeHead } from '@/api/campusOps';
import { createIncomeHead, createOtherIncome, uploadReceipt } from '@/api/campusOps';
import { todayKey } from '@/utils/date';

const METHODS = ['cash', 'bank_transfer', 'card', 'cheque', 'mobile_wallet'] as const;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className={labelClass}>{label}</span>
      {children}
    </div>
  );
}

export function HeadModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createIncomeHead(form);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.income.addHead')} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label={t('app.income.headName')}>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <Field label={t('app.income.code')}>
          <input
            className={inputClass}
            dir="ltr"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="INC-TRN"
          />
        </Field>
        <Field label={t('app.common.notes')}>
          <textarea
            className={inputClass}
            rows={2}
            maxLength={300}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        {error && (
          <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">{error}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="submit"
            disabled={busy}
            className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-4 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
          >
            {busy ? t('app.common.saving') : t('app.common.save')}
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

export function IncomeModal({
  heads,
  onClose,
  onSaved,
}: {
  heads: IncomeHead[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    headId: heads[0]?.id ?? '',
    title: '',
    amount: '',
    receivedOn: todayKey(),
    method: 'cash',
    reference: '',
    notes: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.title.trim()) {
      setError(t('app.income.titleRequired'));
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t('app.income.amountInvalid'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let receiptPath: string | null = null;
      let receiptName: string | null = null;
      if (file) {
        const uploaded = await uploadReceipt(file);
        receiptPath = uploaded.path;
        receiptName = uploaded.name;
      }
      await createOtherIncome({
        headId: form.headId || null,
        title: form.title,
        amount,
        receivedOn: form.receivedOn,
        method: form.method,
        reference: form.reference,
        notes: form.notes,
        receiptPath,
        receiptName,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.income.addIncome')} subtitle={t('app.income.receiptHint')} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label={t('app.income.head')}>
          <select
            className={inputClass}
            value={form.headId}
            onChange={(e) => setForm({ ...form, headId: e.target.value })}
          >
            <option value="">{t('app.common.unknown')}</option>
            {heads.map((head) => (
              <option key={head.id} value={head.id}>
                {head.name}
                {head.code ? ` · ${head.code}` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('app.income.incomeTitle')}>
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label={t('app.income.amount')}>
            <input
              className={inputClass}
              type="number"
              min={0}
              dir="ltr"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </Field>
          <Field label={t('app.common.date')}>
            <input
              className={inputClass}
              type="date"
              value={form.receivedOn}
              onChange={(e) => setForm({ ...form, receivedOn: e.target.value })}
            />
          </Field>
          <Field label={t('app.income.method')}>
            <select
              className={inputClass}
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
            >
              {METHODS.map((method) => (
                <option key={method} value={method}>
                  {t(`app.expenses.pay.${method}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t('app.income.reference')}>
          <input
            className={inputClass}
            dir="ltr"
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
          />
        </Field>

        <div className="rounded-md border border-background-200 bg-background-100 p-3">
          <p className="text-[11px] font-semibold text-foreground-800 mb-2">{t('app.income.receipt')}</p>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full box-border text-xs text-foreground-700 file:me-3 file:rounded-md file:border-0 file:bg-primary-500 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-background-50 file:cursor-pointer cursor-pointer"
          />
          <p className="text-[10px] text-foreground-500 mt-1.5">{t('app.income.receiptHint')}</p>
          {file && (
            <p className="text-[11px] text-secondary-900 mt-1.5 inline-flex items-center gap-1">
              <i className="ri-attachment-2" />
              {file.name}
            </p>
          )}
        </div>

        <Field label={t('app.common.notes')}>
          <textarea
            className={inputClass}
            rows={2}
            maxLength={500}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>

        {error && (
          <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">{error}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="submit"
            disabled={busy}
            className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-4 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
          >
            {busy ? t('app.common.saving') : t('app.income.record')}
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