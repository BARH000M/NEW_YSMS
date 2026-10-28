import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { createCallLog, fetchCallLogs } from '@/api/operations';
import type { CallLog } from '@/api/operations';
import { formatDateTime } from '@/utils/date';
import Modal from '@/components/app/Modal';
import ExportBar from '@/components/app/ExportBar';
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

export default function CallsPage() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    callerName: '',
    phone: '',
    direction: 'incoming' as 'incoming' | 'outgoing',
    purpose: '',
    notes: '',
  });

  const state = useAsync(() => fetchCallLogs(), []);

  const rows = state.data ?? [];

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (row) =>
        row.caller_name.toLowerCase().includes(needle) ||
        (row.phone ?? '').includes(needle) ||
        (row.purpose ?? '').toLowerCase().includes(needle),
    );
  }, [rows, query]);

  const today = new Date().toISOString().slice(0, 10);

  const stats = useMemo(
    () => ({
      total: rows.length,
      incoming: rows.filter((row) => row.direction === 'incoming').length,
      outgoing: rows.filter((row) => row.direction === 'outgoing').length,
      today: rows.filter((row) => (row.call_at ?? '').slice(0, 10) === today).length,
    }),
    [rows, today],
  );

  const reset = () => {
    setForm({ callerName: '', phone: '', direction: 'incoming', purpose: '', notes: '' });
    setFormError(null);
  };

  const handleSubmit = async () => {
    if (!form.callerName.trim()) {
      setFormError(t('app.calls.nameRequired'));
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await createCallLog(form);
      setOpen(false);
      reset();
      state.reload();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  return (
    <>
      <PageHeader
        title={t('app.calls.title')}
        subtitle={t('app.calls.subtitle')}
        action={
          <>
            <ExportBar
              title={`${t('app.calls.title')} — ${t('app.nav.brand')}`}
              fileName="call-register"
              columns={[
                t('app.calls.caller'),
                t('app.common.phone'),
                t('app.calls.direction'),
                t('app.calls.purpose'),
                t('app.common.date'),
                t('app.calls.notes'),
              ]}
              rows={filtered.map((row) => [
                row.caller_name,
                row.phone ?? '',
                row.direction === 'incoming' ? t('app.calls.incoming') : t('app.calls.outgoing'),
                row.purpose ?? '',
                formatDateTime(row.call_at, i18n.language),
                row.notes ?? '',
              ])}
              summary={[
                { label: t('app.calls.total'), value: String(stats.total) },
                { label: t('app.calls.incoming'), value: String(stats.incoming) },
                { label: t('app.calls.outgoing'), value: String(stats.outgoing) },
              ]}
            />
            <button
              type="button"
              onClick={() => {
                reset();
                setOpen(true);
              }}
              className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-add-line" />
              {t('app.calls.log')}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.calls.total')} value={stats.total} icon="ri-phone-line" tone="primary" />
        <StatCard label={t('app.calls.incoming')} value={stats.incoming} icon="ri-inbox-archive-line" tone="accent" />
        <StatCard label={t('app.calls.outgoing')} value={stats.outgoing} icon="ri-send-plane-line" tone="secondary" />
        <StatCard label={t('app.calls.today')} value={stats.today} icon="ri-calendar-check-line" tone="neutral" />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SearchBox value={query} onChange={setQuery} />
          <span className="text-[11px] text-foreground-500">{t('app.calls.showing', { count: filtered.length })}</span>
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon="ri-phone-line" label={t('app.calls.empty')} />
        ) : (
          <TableWrap>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th>{t('app.calls.caller')}</Th>
                <Th>{t('app.common.phone')}</Th>
                <Th>{t('app.calls.direction')}</Th>
                <Th>{t('app.calls.purpose')}</Th>
                <Th>{t('app.common.date')}</Th>
                <Th>{t('app.calls.notes')}</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row: CallLog) => (
                <Row key={row.id}>
                  <Td className="text-sm font-medium text-foreground-950 whitespace-nowrap">{row.caller_name}</Td>
                  <Td className="text-xs tabular-nums" dir="ltr">
                    {row.phone ?? '—'}
                  </Td>
                  <Td>
                    <Badge tone={row.direction === 'incoming' ? 'secondary' : 'accent'}>
                      {row.direction === 'incoming' ? t('app.calls.incoming') : t('app.calls.outgoing')}
                    </Badge>
                  </Td>
                  <Td className="text-xs">
                    <span className="block max-w-[240px] truncate">{row.purpose ?? '—'}</span>
                  </Td>
                  <Td className="text-xs whitespace-nowrap">{formatDateTime(row.call_at, i18n.language)}</Td>
                  <Td className="text-xs text-foreground-600">
                    <span className="block max-w-[200px] truncate">{row.notes ?? '—'}</span>
                  </Td>
                </Row>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>

      {open && (
        <Modal title={t('app.calls.log')} onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="call-name">
                {t('app.calls.caller')}
              </label>
              <input
                id="call-name"
                type="text"
                value={form.callerName}
                onChange={(event) => setForm({ ...form, callerName: event.target.value })}
                className={inputClass}
                placeholder={t('app.calls.callerPlaceholder')}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className={labelClass} htmlFor="call-phone">
                  {t('app.common.phone')}
                </label>
                <input
                  id="call-phone"
                  type="text"
                  dir="ltr"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  className={inputClass}
                  placeholder="+967"
                />
              </div>
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className={labelClass} htmlFor="call-direction">
                  {t('app.calls.direction')}
                </label>
                <select
                  id="call-direction"
                  value={form.direction}
                  onChange={(event) =>
                    setForm({ ...form, direction: event.target.value as 'incoming' | 'outgoing' })
                  }
                  className={inputClass}
                >
                  <option value="incoming">{t('app.calls.incoming')}</option>
                  <option value="outgoing">{t('app.calls.outgoing')}</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="call-purpose">
                {t('app.calls.purpose')}
              </label>
              <input
                id="call-purpose"
                type="text"
                value={form.purpose}
                onChange={(event) => setForm({ ...form, purpose: event.target.value })}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="call-notes">
                {t('app.calls.notes')}
              </label>
              <textarea
                id="call-notes"
                rows={3}
                maxLength={500}
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                className={inputClass}
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