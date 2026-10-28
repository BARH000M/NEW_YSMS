import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { createNotice, deleteNotice, fetchNotices, setNoticePinned } from '@/api/campus';
import { formatDate } from '@/utils/date';
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
  SearchBox,
  StatCard,
  Tabs,
} from '@/components/app/ui';

const AUDIENCES = ['all', 'students', 'parents', 'staff'] as const;

export default function NoticesPage() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const state = useAsync(() => fetchNotices(), []);

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  const notices = state.data ?? [];
  const term = query.trim().toLowerCase();
  const visible = notices.filter((notice) => {
    const matchesTab = tab === 'all' || notice.audience === tab;
    const matchesTerm =
      !term || notice.title.toLowerCase().includes(term) || (notice.body ?? '').toLowerCase().includes(term);
    return matchesTab && matchesTerm;
  });

  return (
    <>
      <PageHeader title={t('app.notices.title')} subtitle={t('app.notices.subtitle')} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.notices.total')} value={notices.length} icon="ri-megaphone-line" tone="primary" />
        <StatCard
          label={t('app.notices.pinned')}
          value={notices.filter((notice) => notice.is_pinned).length}
          icon="ri-pushpin-2-line"
          tone="accent"
        />
        <StatCard
          label={t('app.notices.forStudents')}
          value={notices.filter((notice) => notice.audience === 'students' || notice.audience === 'all').length}
          icon="ri-graduation-cap-line"
          tone="secondary"
        />
        <StatCard
          label={t('app.notices.forStaff')}
          value={notices.filter((notice) => notice.audience === 'staff' || notice.audience === 'all').length}
          icon="ri-team-line"
          tone="neutral"
        />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { key: 'all', label: t('app.common.all'), count: notices.length },
              ...AUDIENCES.filter((audience) => audience !== 'all').map((audience) => ({
                key: audience,
                label: t(`app.notices.audience.${audience}`),
                count: notices.filter((notice) => notice.audience === audience).length,
              })),
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <SearchBox value={query} onChange={setQuery} />
            <ExportBar
              title={t('app.notices.board')}
              fileName="notice-board"
              columns={[t('app.notices.notice'), t('app.notices.audienceLabel'), t('app.notices.publishDate')]}
              rows={visible.map((notice) => [
                notice.title,
                t(`app.notices.audience.${notice.audience}`, { defaultValue: notice.audience }),
                formatDate(notice.publish_date, i18n.language),
              ])}
            />
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-add-line" />
              {t('app.notices.add')}
            </button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState icon="ri-megaphone-line" label={t('app.notices.empty')} />
        ) : (
          <ul>
            {visible.map((notice) => (
              <li
                key={notice.id}
                className="flex flex-col sm:flex-row sm:items-start gap-3 px-4 md:px-5 py-3 border-b border-background-100 last:border-b-0 hover:bg-background-100/60"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground-950">{notice.title}</p>
                    {notice.is_pinned ? (
                      <Badge tone="accent">
                        <i className="ri-pushpin-2-line" />
                        {t('app.notices.pinned')}
                      </Badge>
                    ) : null}
                    <Badge tone="secondary">
                      {t(`app.notices.audience.${notice.audience}`, { defaultValue: notice.audience })}
                    </Badge>
                  </div>
                  {notice.body ? (
                    <p className="text-xs text-foreground-600 mt-1 leading-relaxed">{notice.body}</p>
                  ) : null}
                  <p className="text-[11px] text-foreground-500 mt-1.5 tabular-nums">
                    {formatDate(notice.publish_date, i18n.language)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      await setNoticePinned(notice.id, !notice.is_pinned);
                      state.reload();
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-md border border-background-300 text-foreground-700 hover:border-primary-400 cursor-pointer"
                    aria-label={t('app.notices.pinned')}
                  >
                    <i className={`${notice.is_pinned ? 'ri-pushpin-2-fill' : 'ri-pushpin-2-line'} text-sm`} />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteNotice(notice.id);
                      state.reload();
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-md border border-background-300 text-foreground-600 hover:border-primary-400 cursor-pointer"
                    aria-label={t('app.common.delete')}
                  >
                    <i className="ri-delete-bin-line text-sm" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {open && (
        <NewNoticeModal
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            state.reload();
          }}
        />
      )}
    </>
  );
}

function NewNoticeModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'staff' | 'students' | 'parents'>('all');
  const [pinned, setPinned] = useState(false);
  const [publishDate, setPublishDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim()) {
      setError(t('app.notices.titleRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createNotice({ title, body, audience, isPinned: pinned, publishDate });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.notices.add')} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="nt-title">
            {t('app.notices.notice')}
          </label>
          <input
            id="nt-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="nt-audience">
              {t('app.notices.audienceLabel')}
            </label>
            <select
              id="nt-audience"
              value={audience}
              onChange={(event) => setAudience(event.target.value as 'all' | 'staff' | 'students' | 'parents')}
              className={inputClass}
            >
              {AUDIENCES.map((value) => (
                <option key={value} value={value}>
                  {t(`app.notices.audience.${value}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="nt-date">
              {t('app.notices.publishDate')}
            </label>
            <input
              id="nt-date"
              type="date"
              value={publishDate}
              onChange={(event) => setPublishDate(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="nt-body">
            {t('app.notices.message')}
          </label>
          <textarea
            id="nt-body"
            rows={4}
            maxLength={500}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className={inputClass}
          />
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-foreground-700 cursor-pointer">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(event) => setPinned(event.target.checked)}
            className="w-4 h-4 accent-current cursor-pointer"
          />
          {t('app.notices.pinNotice')}
        </label>
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
            {busy ? t('app.common.saving') : t('app.notices.publish')}
          </button>
        </div>
      </div>
    </Modal>
  );
}