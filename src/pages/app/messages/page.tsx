import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { deleteMessage, fetchMessages, fetchReadIds, markMessageRead } from '@/api/messaging';
import type { MessageRow } from '@/api/messaging';
import { formatDate } from '@/utils/date';
import Modal from '@/components/app/Modal';
import ExportBar from '@/components/app/ExportBar';
import PrintSheet from '@/components/app/PrintSheet';
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  SearchBox,
  StatCard,
  Tabs,
} from '@/components/app/ui';
import ComposeMessageModal from './components/ComposeMessageModal';

/**
 * Internal messaging. Every signed-in account gets an inbox: staff see messages
 * addressed to staff, teachers to teachers, students and parents to their own
 * audience. The Backend enforces that — this screen never hides anything itself.
 */
export default function MessagesPage() {
  const { t, i18n } = useTranslation();
  const { user, profile, role } = useAuth();
  const [tab, setTab] = useState('inbox');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [printing, setPrinting] = useState<MessageRow | null>(null);
  const [composing, setComposing] = useState(false);

  const state = useAsync(async () => {
    const [messages, readIds] = await Promise.all([fetchMessages(), fetchReadIds()]);
    return { messages, readIds };
  }, []);

  const userId = user?.id ?? null;
  const messages = state.data?.messages ?? [];
  const readIds = state.data?.readIds ?? [];

  const inbox = useMemo(() => messages.filter((row) => row.sender_id !== userId), [messages, userId]);
  const sent = useMemo(() => messages.filter((row) => row.sender_id === userId), [messages, userId]);

  const unread = useMemo(
    () => inbox.filter((row) => !readIds.includes(row.id)),
    [inbox, readIds],
  );

  const term = query.trim().toLowerCase();
  const source = tab === 'inbox' ? inbox : sent;
  const visible = source.filter(
    (row) =>
      !term ||
      row.subject.toLowerCase().includes(term) ||
      row.body.toLowerCase().includes(term) ||
      row.sender_name.toLowerCase().includes(term),
  );

  const openMessage = async (row: MessageRow) => {
    setOpenId(row.id);
    if (userId && row.sender_id !== userId && !readIds.includes(row.id)) {
      try {
        await markMessageRead(row.id, userId);
        state.reload();
      } catch {
        // Reading the message still works even if the read receipt fails.
      }
    }
  };

  const active = messages.find((row) => row.id === openId) ?? null;

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  return (
    <>
      <PageHeader
        title={t('app.messages.title')}
        subtitle={t('app.messages.subtitle')}
        action={
          <>
            <ExportBar
              title={tab === 'inbox' ? t('app.messages.inbox') : t('app.messages.sent')}
              fileName="messages"
              columns={[
                t('app.messages.subject'),
                t('app.messages.from'),
                t('app.messages.audienceLabel'),
                t('app.common.date'),
              ]}
              rows={visible.map((row) => [
                row.subject,
                row.sender_name,
                t(`app.messages.audience.${row.audience}`, { defaultValue: row.audience }),
                formatDate(row.created_at, i18n.language),
              ])}
            />
            <button
              type="button"
              onClick={() => setComposing(true)}
              className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-send-plane-line" />
              {t('app.messages.compose')}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.messages.inbox')} value={inbox.length} icon="ri-inbox-line" tone="primary" />
        <StatCard label={t('app.messages.unread')} value={unread.length} icon="ri-mail-unread-line" tone="accent" />
        <StatCard label={t('app.messages.sent')} value={sent.length} icon="ri-send-plane-line" tone="secondary" />
        <StatCard
          label={t('app.messages.toStudents')}
          value={sent.filter((row) => row.audience === 'students' || row.audience === 'parents').length}
          icon="ri-parent-line"
          tone="neutral"
        />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { key: 'inbox', label: t('app.messages.inbox'), count: inbox.length },
              { key: 'sent', label: t('app.messages.sent'), count: sent.length },
            ]}
          />
          <SearchBox value={query} onChange={setQuery} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState icon="ri-mail-line" label={t('app.messages.empty')} />
        ) : (
          <ul>
            {visible.map((row) => {
              const isUnread = tab === 'inbox' && !readIds.includes(row.id);
              return (
                <li
                  key={row.id}
                  className="border-b border-background-100 last:border-b-0 hover:bg-background-100/60"
                >
                  <div className="flex items-start gap-3 px-4 md:px-5 py-3">
                    <Avatar name={row.sender_name} />
                    <button
                      type="button"
                      onClick={() => void openMessage(row)}
                      className="flex-1 min-w-0 text-start cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={`text-sm truncate ${
                            isUnread ? 'font-bold text-foreground-950' : 'font-medium text-foreground-900'
                          }`}
                        >
                          {row.subject}
                        </p>
                        {isUnread ? <span className="w-2 h-2 rounded-full bg-accent-500 shrink-0" /> : null}
                        <Badge tone="secondary">
                          {t(`app.messages.audience.${row.audience}`, { defaultValue: row.audience })}
                        </Badge>
                      </div>
                      <p className="text-xs text-foreground-600 mt-1 line-clamp-1">{row.body}</p>
                      <p className="text-[11px] text-foreground-500 mt-1">
                        {row.sender_name} · {formatDate(row.created_at, i18n.language)}
                      </p>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPrinting(row)}
                        title={t('app.print.printRecord')}
                        aria-label={t('app.print.printRecord')}
                        className="w-8 h-8 flex items-center justify-center rounded-md border border-background-300 text-foreground-700 hover:border-primary-400 cursor-pointer"
                      >
                        <i className="ri-printer-line text-sm" />
                      </button>
                      {tab === 'sent' ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteMessage(row.id);
                            state.reload();
                          }}
                          title={t('app.common.delete')}
                          aria-label={t('app.common.delete')}
                          className="w-8 h-8 flex items-center justify-center rounded-md border border-background-300 text-foreground-600 hover:border-primary-400 cursor-pointer"
                        >
                          <i className="ri-delete-bin-line text-sm" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {active && (
        <Modal
          title={active.subject}
          subtitle={t('app.messages.fromLine', { name: active.sender_name })}
          onClose={() => setOpenId(null)}
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="secondary">
                {t(`app.messages.audience.${active.audience}`, { defaultValue: active.audience })}
              </Badge>
              <span className="text-[11px] text-foreground-500 tabular-nums">
                {formatDate(active.created_at, i18n.language)}
              </span>
            </div>
            <p className="text-sm text-foreground-800 leading-relaxed whitespace-pre-line">{active.body}</p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPrinting(active)}
                className="inline-flex items-center gap-1.5 border border-background-300 text-foreground-800 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
              >
                <i className="ri-printer-line" />
                {t('app.print.printRecord')}
              </button>
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="px-3.5 py-2.5 rounded-md bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                {t('app.common.close')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {composing && (
        <ComposeMessageModal
          senderName={profile?.full_name ?? 'School Office'}
          senderRole={role}
          onClose={() => setComposing(false)}
          onSent={() => {
            setComposing(false);
            state.reload();
          }}
        />
      )}

      {printing && (
        <PrintSheet
          title={printing.subject}
          hint={t('app.print.singleRecord')}
          onClose={() => setPrinting(null)}
        >
          <div className="p-6 md:p-8">
            <div className="flex items-start justify-between gap-4 border-b-2 border-foreground-900 pb-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-foreground-600">
                  {t('app.messages.message')}
                </p>
                <h2 className="font-heading text-lg text-foreground-950 mt-0.5">{printing.subject}</h2>
                <p className="text-[11px] text-foreground-600 mt-1">
                  {t('app.messages.fromLine', { name: printing.sender_name })}
                </p>
              </div>
              <div className="text-end shrink-0">
                <p className="text-[11px] text-foreground-600">{t('app.common.date')}</p>
                <p className="text-[11px] text-foreground-900 font-semibold tabular-nums">
                  {formatDate(printing.created_at, i18n.language)}
                </p>
              </div>
            </div>
            <p className="mt-5 text-[12px] text-foreground-900 leading-relaxed whitespace-pre-line">
              {printing.body}
            </p>
            <div className="mt-10 flex items-center justify-between gap-6 text-[11px] text-foreground-600">
              <span className="border-t border-background-300 pt-1 w-40">{t('app.print.preparedBy')}</span>
              <span className="border-t border-background-300 pt-1 w-40 text-end">{t('app.print.approvedBy')}</span>
            </div>
            <p className="mt-4 text-[10px] text-foreground-500">{t('app.print.docFooter')}</p>
          </div>
        </PrintSheet>
      )}
    </>
  );
}