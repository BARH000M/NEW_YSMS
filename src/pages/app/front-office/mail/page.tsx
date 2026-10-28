import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { createPostalRecord, fetchPostalRecords } from '@/api/operations';
import { formatDateTime } from '@/utils/date';
import Modal from '@/components/app/Modal';
import ExportBar from '@/components/app/ExportBar';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import {
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

type Direction = 'incoming' | 'outgoing';

export default function MailPage({ direction }: { direction: Direction }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({ sender: '', recipient: '', reference: '' });

  const state = useAsync(() => fetchPostalRecords(), []);

  /** One registry, filtered — incoming and outgoing never duplicate each other. */
  const rows = useMemo(
    () => (state.data ?? []).filter((row) => row.direction === direction),
    [state.data, direction],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (row) =>
        (row.sender ?? '').toLowerCase().includes(needle) ||
        (row.recipient ?? '').toLowerCase().includes(needle) ||
        (row.reference ?? '').toLowerCase().includes(needle),
    );
  }, [rows, query]);

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = rows.filter((row) => (row.received_at ?? '').slice(0, 10) === today).length;

  const reset = () => {
    setForm({ sender: '', recipient: '', reference: '' });
    setFormError(null);
  };

  const handleSubmit = async () => {
    if (!form.sender.trim() && !form.recipient.trim()) {
      setFormError(t('app.mail.partyRequired'));
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await createPostalRecord({ direction, ...form });
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

  const isIncoming = direction === 'incoming';

  return (
    <>
      <PageHeader
        title={isIncoming ? t('app.mail.incomingTitle') : t('app.mail.outgoingTitle')}
        subtitle={isIncoming ? t('app.mail.incomingSubtitle') : t('app.mail.outgoingSubtitle')}
        action={
          <>
            <ExportBar
              title={`${isIncoming ? t('app.mail.incomingTitle') : t('app.mail.outgoingTitle')} — ${t('app.nav.brand')}`}
              fileName={isIncoming ? 'incoming-mail' : 'outgoing-mail'}
              columns={[
                t('app.mail.sender'),
                t('app.mail.recipient'),
                t('app.mail.reference'),
                t('app.common.date'),
              ]}
              rows={filtered.map((row) => [
                row.sender ?? '',
                row.recipient ?? '',
                row.reference ?? '',
                row.received_at ? formatDateTime(row.received_at, i18n.language) : '',
              ])}
              summary={[
                { label: t('app.mail.total'), value: String(rows.length) },
                { label: t('app.mail.today'), value: String(todayCount) },
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
              {isIncoming ? t('app.mail.registerIncoming') : t('app.mail.registerOutgoing')}
            </button>
          </>
        }
      />

      <div className="inline-flex items-center gap-1 p-1 bg-background-100 border border-background-200 rounded-full mb-3 md:mb-4">
        <Link
          to="/app/front-office/mail/incoming"
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
            isIncoming ? 'bg-primary-500 text-background-50' : 'text-foreground-700 hover:bg-background-200'
          }`}
        >
          {t('app.mail.incomingTitle')}
        </Link>
        <Link
          to="/app/front-office/mail/outgoing"
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
            !isIncoming ? 'bg-primary-500 text-background-50' : 'text-foreground-700 hover:bg-background-200'
          }`}
        >
          {t('app.mail.outgoingTitle')}
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard
          label={t('app.mail.total')}
          value={rows.length}
          icon={isIncoming ? 'ri-inbox-archive-line' : 'ri-send-plane-line'}
          tone="primary"
        />
        <StatCard label={t('app.mail.today')} value={todayCount} icon="ri-calendar-check-line" tone="accent" />
        <StatCard label={t('app.mail.matched')} value={filtered.length} icon="ri-filter-3-line" tone="secondary" />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <SearchBox value={query} onChange={setQuery} />
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon="ri-inbox-line" label={t('app.mail.empty')} />
        ) : (
          <TableWrap>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th>{t('app.mail.sender')}</Th>
                <Th>{t('app.mail.recipient')}</Th>
                <Th>{t('app.mail.reference')}</Th>
                <Th>{t('app.common.date')}</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <Row key={row.id}>
                  <Td className="text-sm text-foreground-900">
                    <span className="block max-w-[220px] truncate">{row.sender ?? '—'}</span>
                  </Td>
                  <Td className="text-sm text-foreground-900">
                    <span className="block max-w-[220px] truncate">{row.recipient ?? '—'}</span>
                  </Td>
                  <Td className="text-xs tabular-nums whitespace-nowrap">{row.reference ?? '—'}</Td>
                  <Td className="text-xs whitespace-nowrap">
                    {row.received_at ? formatDateTime(row.received_at, i18n.language) : '—'}
                  </Td>
                </Row>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>

      {open && (
        <Modal title={isIncoming ? t('app.mail.registerIncoming') : t('app.mail.registerOutgoing')} onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="mail-sender">
                {t('app.mail.sender')}
              </label>
              <input
                id="mail-sender"
                type="text"
                value={form.sender}
                onChange={(event) => setForm({ ...form, sender: event.target.value })}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="mail-recipient">
                {t('app.mail.recipient')}
              </label>
              <input
                id="mail-recipient"
                type="text"
                value={form.recipient}
                onChange={(event) => setForm({ ...form, recipient: event.target.value })}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="mail-reference">
                {t('app.mail.reference')}
              </label>
              <input
                id="mail-reference"
                type="text"
                value={form.reference}
                onChange={(event) => setForm({ ...form, reference: event.target.value })}
                className={inputClass}
                placeholder="REF-0001"
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