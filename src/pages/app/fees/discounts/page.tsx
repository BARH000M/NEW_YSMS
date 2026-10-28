import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import {
  fetchAcademicYears,
  fetchClasses,
  fetchSections,
  fetchStudents,
} from '@/api/college';
import { fetchDiscountAllotments, fetchFeeDiscounts, setFeeDiscountActive } from '@/api/fees';
import type { FeeDiscount } from '@/api/fees';
import { formatMoney } from '@/utils/money';
import ExportBar from '@/components/app/ExportBar';
import MobileFab from '@/components/app/MobileFab';
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
  Tabs,
  Td,
  Th,
} from '@/components/app/ui';
import DiscountModal from './components/DiscountModal';
import AllotmentPanel from './components/AllotmentPanel';

export default function FeeDiscountsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'catalogue' | 'allotment'>('catalogue');
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FeeDiscount | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const state = useAsync(async () => {
    const [discounts, allotments, students, classes, sections, years] = await Promise.all([
      fetchFeeDiscounts(),
      fetchDiscountAllotments(),
      fetchStudents(),
      fetchClasses(),
      fetchSections(),
      fetchAcademicYears(),
    ]);
    return { discounts, allotments, students, classes, sections, years };
  }, []);

  const discounts = state.data?.discounts ?? [];
  const allotments = state.data?.allotments ?? [];

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return discounts;
    return discounts.filter(
      (discount) =>
        discount.name.toLowerCase().includes(needle) ||
        (discount.code ?? '').toLowerCase().includes(needle),
    );
  }, [discounts, query]);

  const activeCount = discounts.filter((discount) => discount.is_active).length;

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (discount: FeeDiscount) => {
    setEditing(discount);
    setModalOpen(true);
  };

  const toggle = async (discount: FeeDiscount) => {
    setRowBusy(discount.id);
    try {
      await setFeeDiscountActive(discount.id, !discount.is_active);
      state.reload();
    } finally {
      setRowBusy(null);
    }
  };

  if (state.loading) return <LoadingBlock />;
  if (state.error || !state.data) return <ErrorState message={state.error ?? 'No data'} onRetry={state.reload} />;

  return (
    <>
      <PageHeader
        title={t('app.discounts.title')}
        subtitle={t('app.discounts.subtitle')}
        action={
          <>
            <ExportBar
              title={`${t('app.discounts.title')} — ${t('app.nav.brand')}`}
              fileName="fee-discounts"
              columns={[
                t('app.common.name'),
                t('app.discounts.code'),
                t('app.discounts.type'),
                t('app.discounts.value'),
                t('app.common.notes'),
                t('app.common.status'),
              ]}
              rows={filtered.map((discount) => [
                discount.name,
                discount.code ?? '',
                discount.discount_type === 'percent'
                  ? t('app.discounts.typePercent')
                  : t('app.discounts.typeFixed'),
                discount.discount_type === 'percent'
                  ? `${Number(discount.amount)}%`
                  : formatMoney(discount.amount),
                discount.description ?? '',
                discount.is_active ? t('app.common.active') : t('app.common.inactive'),
              ])}
              summary={[
                { label: t('app.discounts.total'), value: String(discounts.length) },
                { label: t('app.discounts.active'), value: String(activeCount) },
              ]}
            />
            {tab === 'catalogue' ? (
              <button
                type="button"
                onClick={openCreate}
                className="hidden md:inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
              >
                <i className="ri-add-line" />
                {t('app.discounts.add')}
              </button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.discounts.total')} value={discounts.length} icon="ri-coupon-2-line" tone="primary" />
        <StatCard label={t('app.discounts.active')} value={activeCount} icon="ri-checkbox-circle-line" tone="secondary" />
        <StatCard label={t('app.discounts.allotted')} value={allotments.length} icon="ri-gift-line" tone="accent" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <Tabs
          items={[
            { key: 'catalogue', label: t('app.discounts.tabCatalogue'), count: discounts.length },
            { key: 'allotment', label: t('app.discounts.tabAllotment'), count: allotments.length },
          ]}
          value={tab}
          onChange={(key) => setTab(key as 'catalogue' | 'allotment')}
        />
        {tab === 'catalogue' && <SearchBox value={query} onChange={setQuery} />}
      </div>

      {tab === 'catalogue' ? (
        <Card>
          {/* Phones: a card per discount code instead of the wide table. */}
          {filtered.length > 0 ? (
            <div className="md:hidden divide-y divide-background-100">
              {filtered.map((discount) => (
                <div key={discount.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground-950 truncate">{discount.name}</p>
                      <p className="text-[11px] text-foreground-500 tabular-nums truncate">{discount.code ?? '—'}</p>
                    </div>
                    <p className="text-sm font-bold text-foreground-950 tabular-nums shrink-0 whitespace-nowrap">
                      {discount.discount_type === 'percent'
                        ? `${Number(discount.amount)}%`
                        : formatMoney(discount.amount)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <Badge tone="neutral">
                      {discount.discount_type === 'percent'
                        ? t('app.discounts.typePercent')
                        : t('app.discounts.typeFixed')}
                    </Badge>
                    <Badge tone={discount.is_active ? 'secondary' : 'neutral'}>
                      {discount.is_active ? t('app.common.active') : t('app.common.inactive')}
                    </Badge>
                  </div>

                  {discount.description ? (
                    <p className="text-[11px] text-foreground-600 mt-1.5 line-clamp-2">{discount.description}</p>
                  ) : null}

                  <div className="flex items-center gap-1.5 mt-2.5">
                    <button
                      type="button"
                      onClick={() => openEdit(discount)}
                      className="inline-flex items-center gap-1 rounded-md border border-background-300 px-2.5 py-1.5 text-[11px] font-semibold text-foreground-700 whitespace-nowrap cursor-pointer"
                    >
                      <i className="ri-edit-2-line text-sm" />
                      {t('app.common.edit')}
                    </button>
                    <button
                      type="button"
                      disabled={rowBusy === discount.id}
                      onClick={() => void toggle(discount)}
                      className="inline-flex items-center gap-1 rounded-md border border-background-300 px-2.5 py-1.5 text-[11px] font-semibold text-foreground-700 whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      <i className={`${discount.is_active ? 'ri-toggle-fill' : 'ri-toggle-line'} text-base`} />
                      {discount.is_active ? t('app.common.inactive') : t('app.common.active')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <EmptyState icon="ri-coupon-2-line" label={t('app.discounts.empty')} />
          ) : (
            <TableWrap className="hidden md:block">
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.common.name')}</Th>
                  <Th>{t('app.discounts.code')}</Th>
                  <Th>{t('app.discounts.type')}</Th>
                  <Th>{t('app.discounts.value')}</Th>
                  <Th>{t('app.common.notes')}</Th>
                  <Th>{t('app.common.status')}</Th>
                  <Th>{t('app.common.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((discount) => (
                  <Row key={discount.id}>
                    <Td className="text-sm font-medium text-foreground-950 whitespace-nowrap">{discount.name}</Td>
                    <Td className="text-xs tabular-nums">{discount.code ?? '—'}</Td>
                    <Td>
                      <Badge tone="neutral">
                        {discount.discount_type === 'percent'
                          ? t('app.discounts.typePercent')
                          : t('app.discounts.typeFixed')}
                      </Badge>
                    </Td>
                    <Td className="text-sm font-semibold tabular-nums whitespace-nowrap">
                      {discount.discount_type === 'percent'
                        ? `${Number(discount.amount)}%`
                        : formatMoney(discount.amount)}
                    </Td>
                    <Td className="text-xs text-foreground-600 max-w-[240px] truncate">
                      {discount.description ?? '—'}
                    </Td>
                    <Td>
                      <Badge tone={discount.is_active ? 'secondary' : 'neutral'}>
                        {discount.is_active ? t('app.common.active') : t('app.common.inactive')}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(discount)}
                          className="w-8 h-8 flex items-center justify-center rounded-md border border-background-300 text-foreground-700 hover:border-primary-400 cursor-pointer"
                          aria-label={t('app.common.edit')}
                        >
                          <i className="ri-edit-2-line text-sm" />
                        </button>
                        <button
                          type="button"
                          disabled={rowBusy === discount.id}
                          onClick={() => void toggle(discount)}
                          className="w-8 h-8 flex items-center justify-center rounded-md border border-background-300 text-foreground-700 hover:border-primary-400 cursor-pointer disabled:opacity-50"
                          aria-label={discount.is_active ? t('app.common.inactive') : t('app.common.active')}
                        >
                          <i className={`${discount.is_active ? 'ri-toggle-fill' : 'ri-toggle-line'} text-base`} />
                        </button>
                      </div>
                    </Td>
                  </Row>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      ) : (
        <AllotmentPanel
          discounts={discounts.filter((discount) => discount.is_active)}
          students={state.data.students}
          classes={state.data.classes}
          sections={state.data.sections}
          years={state.data.years}
          allotments={allotments}
          onChanged={state.reload}
        />
      )}

      {tab === 'catalogue' ? (
        <MobileFab label={t('app.discounts.add')} onClick={openCreate} />
      ) : null}

      {modalOpen && (
        <DiscountModal
          discount={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            state.reload();
          }}
        />
      )}
    </>
  );
}