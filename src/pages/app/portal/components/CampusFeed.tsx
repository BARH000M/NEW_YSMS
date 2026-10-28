import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { fetchDownloads, fetchLibraryIssues, fetchNotices } from '@/api/campus';
import { fetchMessages, fetchReadIds } from '@/api/messaging';
import { formatDate } from '@/utils/date';
import { Badge, Card, CardHeader, EmptyState } from '@/components/app/ui';

/**
 * The campus feed a student or guardian sees: notices addressed to them, the
 * download center and the books currently on loan. Every read is scoped by
 * row-level security on the Backend — the browser never filters for safety.
 */
export default function CampusFeed() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const state = useAsync(async () => {
    const [notices, downloads, issues, messages, readIds] = await Promise.all([
      fetchNotices(),
      fetchDownloads(),
      fetchLibraryIssues(),
      fetchMessages(),
      fetchReadIds(),
    ]);
    return { notices, downloads, issues, messages, readIds };
  }, []);

  const notices = state.data?.notices ?? [];
  const downloads = state.data?.downloads ?? [];
  const issues = state.data?.issues ?? [];
  const messages = state.data?.messages ?? [];
  const readIds = state.data?.readIds ?? [];
  const myMessages = messages.filter((row) => row.sender_id !== (user?.id ?? null));

  const myNotices = notices.filter(
    (notice) => notice.audience === 'all' || notice.audience === 'students' || notice.audience === 'parents',
  );
  const myDownloads = downloads.filter((item) => item.is_published);
  const activeLoans = issues.filter((issue) => issue.status === 'issued');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mt-3 md:mt-4">
      <Card>
        <CardHeader
          title={t('app.messages.inbox')}
          action={
            <Link
              to="/app/messages"
              className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 whitespace-nowrap"
            >
              {t('app.common.view')}
            </Link>
          }
        />
        <div className="p-2">
          {myMessages.length === 0 && <EmptyState icon="ri-mail-line" label={t('app.messages.empty')} />}
          {myMessages.slice(0, 5).map((message) => {
            const unread = !readIds.includes(message.id);
            return (
              <Link
                key={message.id}
                to="/app/messages"
                className="block px-2 py-2.5 border-b border-background-100 last:border-b-0 cursor-pointer"
              >
                <div className="flex items-start gap-2">
                  {unread ? <span className="w-1.5 h-1.5 rounded-full bg-accent-500 mt-1.5 shrink-0" /> : null}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground-950 truncate">{message.subject}</p>
                    <p className="text-[11px] text-foreground-600 mt-0.5 line-clamp-2">{message.body}</p>
                    <p className="text-[10px] text-foreground-500 mt-1">
                      {message.sender_name} · {formatDate(message.created_at, i18n.language)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader
          title={t('app.notices.title')}
          action={
            <Link
              to="/app/notices"
              className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 whitespace-nowrap"
            >
              {t('app.common.view')}
            </Link>
          }
        />
        <div className="p-2">
          {myNotices.length === 0 && <EmptyState icon="ri-megaphone-line" label={t('app.notices.empty')} />}
          {myNotices.slice(0, 5).map((notice) => (
            <div key={notice.id} className="px-2 py-2.5 border-b border-background-100 last:border-b-0">
              <div className="flex items-start gap-2">
                {notice.is_pinned ? (
                  <i className="ri-pushpin-2-fill text-accent-600 text-xs mt-0.5" />
                ) : null}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground-950">{notice.title}</p>
                  {notice.body ? (
                    <p className="text-[11px] text-foreground-600 mt-0.5 line-clamp-2">{notice.body}</p>
                  ) : null}
                  <p className="text-[10px] text-foreground-500 mt-1 tabular-nums">
                    {formatDate(notice.publish_date, i18n.language)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title={t('app.downloads.title')}
          action={
            <Link
              to="/app/downloads"
              className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 whitespace-nowrap"
            >
              {t('app.common.view')}
            </Link>
          }
        />
        <div className="p-2">
          {myDownloads.length === 0 && <EmptyState icon="ri-download-cloud-2-line" label={t('app.downloads.empty')} />}
          {myDownloads.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 px-2 py-2.5 border-b border-background-100 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground-900 truncate">{item.title}</p>
                <p className="text-[10px] text-foreground-500 tabular-nums">
                  {formatDate(item.publish_date, i18n.language)}
                </p>
              </div>
              {item.file_url ? (
                <a
                  href={item.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md border border-background-300 text-foreground-700 hover:border-primary-400 cursor-pointer"
                  aria-label={t('app.downloads.open')}
                >
                  <i className="ri-download-2-line text-xs" />
                </a>
              ) : (
                <Badge tone="neutral">{t(`app.downloads.type.${item.content_type}`, { defaultValue: item.content_type })}</Badge>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title={t('app.library.tabIssues')}
          action={
            <Link
              to="/app/library"
              className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 whitespace-nowrap"
            >
              {t('app.common.view')}
            </Link>
          }
        />
        <div className="p-2">
          {activeLoans.length === 0 && <EmptyState icon="ri-book-read-line" label={t('app.library.noIssues')} />}
          {activeLoans.slice(0, 5).map((issue) => (
            <div
              key={issue.id}
              className="flex items-center justify-between gap-2 px-2 py-2.5 border-b border-background-100 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground-900 truncate">
                  {issue.library_books?.title ?? '—'}
                </p>
                <p className="text-[10px] text-foreground-500">
                  {t('app.library.dueOn')}: {issue.due_on ? formatDate(issue.due_on, i18n.language) : '—'}
                </p>
              </div>
              <Badge tone="accent">{t('app.library.status.issued')}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}