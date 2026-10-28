import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { createFeeHead, fetchFeeHeads, setFeeHeadActive, updateFeeHead } from '@/api/college';
import type { FeeHead } from '@/api/types';
import { formatMoney } from '@/utils/money';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
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
  TableWrap,
  Td,
  Th,
} from '@/components/app/ui';

const CATEGORIES = ['tuition', 'registration', 'lab', 'transport', 'library', 'exam', 'other'] as const;

const emptyForm = { name: '', code: '', category: 'tuition', amount: '' };

export default function FeeSetupPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FeeHead | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const state = useAsync(() => fetchFeeHeads(), []);
  const heads = state.data ?? [];

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return heads;
    return heads.filter(
      (head) =>
        head.name.toLowerCase().includes(needle) ||
        (head.code ?? '').toLowerCase().includes(needle) ||
        head.category.toLowerCase().includes(needle),
    );
  }, [heads, query]);

  const activeCount = heads.filter((head) => head.is_active).length;
  const catalogueValue = heads
    .filter((head) => head.is_active)
    .reduce((sum, head) => sum + Number(head.amount ?? 0), 0);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (head: FeeHead) => {
    setEditing(head);
    setForm({
      name: head.name,
      code: head.code ?? '',
      category: head.category,
      amount: String(head.amount ?? ''),
    });
    setFormError(null);
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFormError(t('app.feeSetup.nameRequired'));
      return;
    }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      setFormError(t('app.feeSetup.amountInvalid'));
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const payload = { name: form.name, code: form.code, category: form.category, amount };
      if (editing) await updateFeeHead(editing.id, payload);
      else await createFeeHead(payload);
      setOpen(false);
      state.reload();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (head: FeeHead) => {
    setRowBusy(head.id);
    try {
      await setFeeHeadActive(head.id, !head.is_active);
      state.reload();
    } finally {
      setRowBusy(null);
    }
  };

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  return (
    <>
      <PageHeader
        title={t('app.feeSetup.title')}
        subtitle={t('app.feeSetup.subtitle')}
        action={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
          >
            <i className="ri-add-line" />
            {t('app.feeSetup.add')}
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.feeSetup.totalHeads')} value={heads.length} icon="ri-list-settings-line" tone="primary" />
        <StatCard label={t('app.feeSetup.activeHeads')} value={activeCount} icon="ri-checkbox-circle-line" tone="secondary" />
        <StatCard
          label={t('app.feeSetup.catalogueValue')}
          value={formatMoney(catalogueValue)}
          icon="ri-money-dollar-circle-line"
          tone="accent"
          hint={t('app.feeSetup.currencyHint')}
        />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SearchBox value={query} onChange={setQuery} />
          <span className="text-[11px] text-foreground-500">{t('app.feeSetup.showing', { count: filtered.length })}</span>
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon="ri-list-settings-line" label={t('app.feeSetup.empty')} />
        ) : (
          <TableWrap>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th>{t('app.common.name')}</Th>
                <Th>{t('app.feeSetup.code')}</Th>
                <Th>{t('app.feeSetup.category')}</Th>
                <Th>{t('app.feeSetup.amount')}</Th>
                <Th>{t('app.common.status')}</Th>
                <Th>{t('app.common.actions')}</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((head) => (
                <Row key={head.id}>
                  <Td className="text-sm font-medium text-foreground-950 whitespace-nowrap">{head.name}</Td>
                  <Td className="text-xs tabular-nums">{head.code ?? '—'}</Td>
                  <Td>
                    <Badge tone="neutral">{t(`app.feeSetup.cat.${head.category}`, { defaultValue: head.category })}</Badge>
                  </Td>
                  <Td className="text-sm font-semibold tabular-nums whitespace-nowrap">{formatMoney(head.amount)}</Td>
                  <Td>
                    <Badge tone={head.is_active ? 'secondary' : 'neutral'}>
                      {head.is_active ? t('app.common.active') : t('app.common.inactive')}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(head)}
                        className="w-8 h-8 flex items-center justify-center rounded-md border border-background-300 text-foreground-700 hover:border-primary-400 cursor-pointer"
                        aria-label={t('app.common.edit')}
                      >
                        <i className="ri-edit-2-line text-sm" />
                      </button>
                      <button
                        type="button"
                        disabled={rowBusy === head.id}
                        onClick={() => void toggleActive(head)}
                        className="w-8 h-8 flex items-center justify-center rounded-md border border-background-300 text-foreground-700 hover:border-primary-400 cursor-pointer disabled:opacity-50"
                        aria-label={head.is_active ? t('app.common.inactive') : t('app.common.active')}
                      >
                        <i className={`${head.is_active ? 'ri-toggle-fill' : 'ri-toggle-line'} text-base`} />
                      </button>
                    </div>
                  </Td>
                </Row>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>

      {open && (
        <Modal
          title={editing ? t('app.feeSetup.edit') : t('app.feeSetup.add')}
          onClose={() => setOpen(false)}
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="fee-name">
                {t('app.common.name')}
              </label>
              <input
                id="fee-name"
                type="text"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className={labelClass} htmlFor="fee-code">
                  {t('app.feeSetup.code')}
                </label>
                <input
                  id="fee-code"
                  type="text"
                  value={form.code}
                  onChange={(event) => setForm({ ...form, code: event.target.value })}
                  className={inputClass}
                  placeholder="FEE-001"
                />
              </div>
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className={labelClass} htmlFor="fee-category">
                  {t('app.feeSetup.category')}
                </label>
                <select
                  id="fee-category"
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                  className={inputClass}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {t(`app.feeSetup.cat.${category}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="fee-amount">
                {t('app.feeSetup.amount')}
              </label>
              <input
                id="fee-amount"
                type="number"
                min={0}
                dir="ltr"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
                className={inputClass}
                placeholder="0"
              />
            </div>

            {formError && (
              <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">
                {formError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3.5 py-2.5 rounded-md border border-background-300 text-xs font-semibold text-foreground-700 whitespace-nowrap cursor-pointer"
              >
                {t('app.common.cancel')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSubmit()}
                className="px-4 py-2.5 rounded-md bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                {busy ? t('app.common.saving') : t('app.common.save')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}