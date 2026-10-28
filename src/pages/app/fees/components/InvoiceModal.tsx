import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import { createInvoice, fetchApplicableDiscounts } from '@/api/college';
import type { ApplicableDiscount } from '@/api/college';
import type { FeeHead } from '@/api/types';
import { formatMoney } from '@/utils/money';

interface StudentOption {
  id: string;
  first_name: string;
  last_name: string | null;
  student_no: string | null;
}

export default function InvoiceModal({
  students,
  heads,
  onClose,
  onSaved,
}: {
  students: StudentOption[];
  heads: FeeHead[];
  onClose: () => void;
  onSaved: (appliedDiscount: number) => void;
}) {
  const { t } = useTranslation();
  const [studentId, setStudentId] = useState(students[0]?.id ?? '');
  const [feeHeadId, setFeeHeadId] = useState(heads[0]?.id ?? '');
  const [description, setDescription] = useState(heads[0]?.name ?? '');
  const [amount, setAmount] = useState(String(heads[0]?.amount ?? ''));
  const [discount, setDiscount] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [autoDiscounts, setAutoDiscounts] = useState<ApplicableDiscount[]>([]);
  const [autoLoading, setAutoLoading] = useState(false);

  const base = Number(amount) || 0;

  useEffect(() => {
    let alive = true;
    if (!studentId || base <= 0) {
      setAutoDiscounts([]);
      setAutoLoading(false);
      return () => {
        alive = false;
      };
    }
    setAutoLoading(true);
    const timer = window.setTimeout(() => {
      fetchApplicableDiscounts(studentId, base)
        .then((lines) => {
          if (alive) setAutoDiscounts(lines);
        })
        .catch(() => {
          if (alive) setAutoDiscounts([]);
        })
        .finally(() => {
          if (alive) setAutoLoading(false);
        });
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [studentId, base]);

  const handleHeadChange = (value: string) => {
    setFeeHeadId(value);
    const head = heads.find((item) => item.id === value);
    if (head) {
      setDescription(head.name);
      setAmount(String(head.amount));
    }
  };

  const autoTotal = autoDiscounts.reduce((sum, line) => sum + line.value, 0);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number(amount);
    if (!studentId) {
      setError(t('app.fees.pickStudent'));
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError(t('app.fees.invalidAmount'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createInvoice({
        studentId,
        feeHeadId: feeHeadId || null,
        description: description.trim() || t('app.fees.feeHead'),
        amount: value,
        discount: Number(discount) || 0,
        dueDate: dueDate || null,
      });
      onSaved(autoTotal);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
      setBusy(false);
    }
  };

  const total = Math.max(0, base - (Number(discount) || 0) - autoTotal);

  return (
    <Modal title={t('app.fees.invoiceTitle')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="inv-student">
            {t('app.fees.student')}
          </label>
          <select
            id="inv-student"
            name="studentId"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className={inputClass}
            required
          >
            <option value="">{t('app.fees.pickStudent')}</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {`${student.first_name} ${student.last_name ?? ''}`.trim()}
                {student.student_no ? ` · ${student.student_no}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="inv-head">
            {t('app.fees.feeHead')}
          </label>
          <select
            id="inv-head"
            name="feeHeadId"
            value={feeHeadId}
            onChange={(e) => handleHeadChange(e.target.value)}
            className={inputClass}
          >
            <option value="">{t('app.common.unknown')}</option>
            {heads.map((head) => (
              <option key={head.id} value={head.id}>
                {head.name} · {formatMoney(head.amount)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="inv-desc">
            {t('app.fees.description')}
          </label>
          <input
            id="inv-desc"
            name="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="inv-amount">
              {t('app.fees.amount')}
            </label>
            <input
              id="inv-amount"
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
            <label className={labelClass} htmlFor="inv-discount">
              {t('app.fees.discount')}
            </label>
            <input
              id="inv-discount"
              name="discount"
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="rounded-md border border-background-200 bg-background-50 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-foreground-900">{t('app.fees.autoDiscounts')}</p>
            {autoTotal > 0 && (
              <span className="text-xs font-semibold text-secondary-700 tabular-nums">
                - {formatMoney(autoTotal)}
              </span>
            )}
          </div>
          {autoLoading ? (
            <p className="text-[11px] text-foreground-500 mt-1">{t('app.common.loading')}</p>
          ) : autoDiscounts.length === 0 ? (
            <p className="text-[11px] text-foreground-500 mt-1">{t('app.fees.autoDiscountsEmpty')}</p>
          ) : (
            <ul className="mt-1.5 flex flex-col gap-1">
              {autoDiscounts.map((line) => (
                <li key={line.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-foreground-700 truncate">{line.name}</span>
                  <span className="text-foreground-900 tabular-nums whitespace-nowrap">
                    - {formatMoney(line.value)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10px] text-foreground-500 mt-1.5">{t('app.fees.autoDiscountsHint')}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="inv-due">
            {t('app.fees.dueDate')} <span className="font-normal text-foreground-500">({t('app.common.optional')})</span>
          </label>
          <input
            id="inv-due"
            name="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex items-center justify-between rounded-md bg-background-100 border border-background-200 px-3 py-2">
          <span className="text-xs text-foreground-600">{t('app.fees.total')}</span>
          <span className="text-sm font-semibold text-foreground-950 tabular-nums">{formatMoney(total)}</span>
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
            {busy ? t('app.common.saving') : t('app.fees.createInvoice')}
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