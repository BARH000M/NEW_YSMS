import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { fetchClasses } from '@/api/college';
import { createDownload, deleteDownload, fetchDownloads, setDownloadPublished } from '@/api/campus';
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
  Row,
  SearchBox,
  StatCard,
  TableWrap,
  Tabs,
  Td,
  Th,
} from '@/components/app/ui';

const CONTENT_TYPES = ['syllabus', 'assignment', 'study_material', 'form', 'other'] as const;

export default function DownloadCenterPage() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const state = useAsync(async () => {
    const [items, classes] = await Promise.all([fetchDownloads(), fetchClasses()]);
    return { items, classes };
  }, []);

  if (state.loading) return <LoadingBlock />;
  if (state.error || !state.data) return <ErrorState message={state.error ?? 'No data'} onRetry={state.reload} />;

  const { items, classes } = state.data;
  const className = (id: string | null) => classes.find((klass) => klass.id === id)?.name ?? t('app.downloads.allClasses');
  const term = query.trim().toLowerCase();

  const visible = items.filter((item) => {
    const matchesTab = tab === 'all' || item.content_type === tab;
    const matchesTerm =
      !term ||
      item.title.toLowerCase().includes(term) ||
      (item.description ?? '').toLowerCase().includes(term);
    return matchesTab && matchesTerm;
  });

  return (
    <>
      <PageHeader title={t('app.downloads.title')} subtitle={t('app.downloads.subtitle')} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.downloads.total')} value={items.length} icon="ri-download-cloud-2-line" tone="primary" />
        <StatCard
          label={t('app.downloads.published')}
          value={items.filter((item) => item.is_published).length}
          icon="ri-eye-line"
          tone="secondary"
        />
        <StatCard
          label={t('app.downloads.assignments')}
          value={items.filter((item) => item.content_type === 'assignment').length}
          icon="ri-task-line"
          tone="accent"
        />
        <StatCard label={t('app.downloads.classes')} value={classes.length} icon="ri-building-4-line" tone="neutral" />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { key: 'all', label: t('app.common.all'), count: items.length },
              ...CONTENT_TYPES.map((type) => ({
                key: type,
                label: t(`app.downloads.type.${type}`),
                count: items.filter((item) => item.content_type === type).length,
              })),
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <SearchBox value={query} onChange={setQuery} />
            <ExportBar
              title={t('app.downloads.list')}
              fileName="download-center"
              columns={[
                t('app.downloads.contentTitle'),
                t('app.downloads.contentType'),
                t('app.downloads.availableFor'),
                t('app.downloads.publishDate'),
                t('app.common.status'),
              ]}
              rows={visible.map((item) => [
                item.title,
                t(`app.downloads.type.${item.content_type}`, { defaultValue: item.content_type }),
                className(item.class_id),
                formatDate(item.publish_date, i18n.language),
                item.is_published ? t('app.common.active') : t('app.common.inactive'),
              ])}
            />
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-upload-cloud-2-line" />
              {t('app.downloads.add')}
            </button>
          </div>
        </div>
      </Card>

      <Card>
        {visible.length === 0 ? (
          <EmptyState icon="ri-download-cloud-2-line" label={t('app.downloads.empty')} />
        ) : (
          <TableWrap>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th>{t('app.downloads.contentTitle')}</Th>
                <Th>{t('app.downloads.contentType')}</Th>
                <Th>{t('app.downloads.availableFor')}</Th>
                <Th>{t('app.downloads.publishDate')}</Th>
                <Th>{t('app.common.status')}</Th>
                <Th>{t('app.common.actions')}</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <Row key={item.id}>
                  <Td>
                    <p className="text-sm font-medium text-foreground-950 max-w-[260px] truncate">{item.title}</p>
                    <p className="text-[11px] text-foreground-500 max-w-[260px] truncate">{item.description ?? '—'}</p>
                  </Td>
                  <Td>
                    <Badge tone="secondary">
                      {t(`app.downloads.type.${item.content_type}`, { defaultValue: item.content_type })}
                    </Badge>
                  </Td>
                  <Td className="text-xs whitespace-nowrap">{className(item.class_id)}</Td>
                  <Td className="text-xs whitespace-nowrap text-foreground-600">
                    {formatDate(item.publish_date, i18n.language)}
                  </Td>
                  <Td>
                    <Badge tone={item.is_published ? 'secondary' : 'neutral'}>
                      {item.is_published ? t('app.common.active') : t('app.common.inactive')}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      {item.file_url ? (
                        <a
                          href={item.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-8 h-8 flex items-center justify-center rounded-md border border-background-300 text-foreground-700 hover:border-primary-400 cursor-pointer"
                          aria-label={t('app.downloads.open')}
                        >
                          <i className="ri-external-link-line text-sm" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-foreground-400 whitespace-nowrap">
                          {item.file_name ?? '—'}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          await setDownloadPublished(item.id, !item.is_published);
                          state.reload();
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-md border border-background-300 text-foreground-700 hover:border-primary-400 cursor-pointer"
                        aria-label={t('app.downloads.open')}
                      >
                        <i className={`${item.is_published ? 'ri-eye-off-line' : 'ri-eye-line'} text-sm`} />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteDownload(item.id);
                          state.reload();
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-md border border-background-300 text-foreground-600 hover:border-primary-400 cursor-pointer"
                        aria-label={t('app.common.delete')}
                      >
                        <i className="ri-delete-bin-line text-sm" />
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
        <NewDownloadModal
          classes={classes}
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

function NewDownloadModal({
  classes,
  onClose,
  onSaved,
}: {
  classes: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    title: '',
    contentType: 'syllabus',
    classId: '',
    description: '',
    fileUrl: '',
    publishDate: new Date().toISOString().slice(0, 10),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!form.title.trim()) {
      setError(t('app.downloads.titleRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createDownload({
        title: form.title,
        contentType: form.contentType,
        classId: form.classId || null,
        description: form.description,
        fileUrl: form.fileUrl,
        publishDate: form.publishDate,
      });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  const options = useMemo(() => CONTENT_TYPES, []);

  return (
    <Modal title={t('app.downloads.add')} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="dc-title">
            {t('app.downloads.contentTitle')}
          </label>
          <input
            id="dc-title"
            type="text"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="dc-type">
              {t('app.downloads.contentType')}
            </label>
            <select
              id="dc-type"
              value={form.contentType}
              onChange={(event) => setForm({ ...form, contentType: event.target.value })}
              className={inputClass}
            >
              {options.map((type) => (
                <option key={type} value={type}>
                  {t(`app.downloads.type.${type}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="dc-class">
              {t('app.downloads.availableFor')}
            </label>
            <select
              id="dc-class"
              value={form.classId}
              onChange={(event) => setForm({ ...form, classId: event.target.value })}
              className={inputClass}
            >
              <option value="">{t('app.downloads.allClasses')}</option>
              {classes.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="dc-url">
              {t('app.downloads.fileLink')}
            </label>
            <input
              id="dc-url"
              type="url"
              dir="ltr"
              placeholder="https://"
              value={form.fileUrl}
              onChange={(event) => setForm({ ...form, fileUrl: event.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="dc-date">
              {t('app.downloads.publishDate')}
            </label>
            <input
              id="dc-date"
              type="date"
              value={form.publishDate}
              onChange={(event) => setForm({ ...form, publishDate: event.target.value })}
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="dc-desc">
            {t('app.downloads.description')}
          </label>
          <textarea
            id="dc-desc"
            rows={3}
            maxLength={500}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className={inputClass}
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