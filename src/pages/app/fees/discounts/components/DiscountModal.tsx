import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import { createFeeDiscount, updateFeeDiscount } from '@/api/fees';
import type { DiscountType, FeeDiscount } from '@/api/fees';

interface DiscountModalProps {
  discount: FeeDiscount | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyForm = { name: '', code: '', discountType: 'fixed' as DiscountType, amount: '', description: '' };

export default function DiscountModal({ discount, onClose, onSaved }: DiscountModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: discount?.name ?? emptyForm.name,
    code: discount?.code ?? emptyForm.code,
    discountType: (discount?.discount_type ?? emptyForm.discountType) as DiscountType,
    amount: discount ? String(discount.amount ?? '') : emptyForm.amount,
    description: discount?.description ?? emptyForm.description,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!form.name.trim()) {
      setError(t('app.discounts.nameRequired'));
      return;
    }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t('app.discounts.amountInvalid'));
      return;
    }
    if (form.discountType === 'percent' && amount > 100) {
      setError(t('app.discounts.percentInvalid'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        code: form.code,
        discountType: form.discountType,
        amount,
        description: form.description,
      };
      if (discount) await updateFeeDiscount(discount.id, payload);
      else await createFeeDiscount(payload);
      onSaved();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={discount ? t('app.discounts.edit') : t('app.discounts.add')} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="discount-name">
            {t('app.common.name')}
          </label>
          <input
            id="discount-name"
            type="text"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="discount-code">
              {t('app.discounts.code')}
            </label>
            <input
              id="discount-code"
              type="text"
              dir="ltr"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              className={inputClass}
              placeholder="sibling-disc"
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="discount-type">
              {t('app.discounts.type')}
            </label>
            <select
              id="discount-type"
              value={form.discountType}
              onChange={(event) => setForm({ ...form, discountType: event.target.value as DiscountType })}
              className={inputClass}
            >
              <option value="fixed">{t('app.discounts.typeFixed')}</option>
              <option value="percent">{t('app.discounts.typePercent')}</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="discount-amount">
            {form.discountType === 'percent' ? t('app.discounts.percent') : t('app.discounts.amount')}
          </label>
          <input
            id="discount-amount"
            type="number"
            min={0}
            dir="ltr"
            value={form.amount}
            onChange={(event) => setForm({ ...form, amount: event.target.value })}
            className={inputClass}
            placeholder="0"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="discount-desc">
            {t('app.discounts.description')}
          </label>
          <textarea
            id="discount-desc"
            rows={3}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className={`${inputClass} resize-none`}
          />
        </div>

        {error && (
          <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2.5 rounded-md border border-background-300 text-xs font-semibold text-foreground-700 whitespace-nowrap cursor-pointer"
          >
            {t('app.common.cancel')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="px-4 py-2.5 rounded-md bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold whitespace-nowrap cursor-pointer"
          >
            {busy ? t('app.common.saving') : t('app.common.save')}
          </button>
        </div>
      </div>
    </Modal>
  );
}