import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { createCourse, fetchCourses, setCourseActive } from '@/api/operations';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  StatCard,
} from '@/components/app/ui';

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

const emptyForm = { title: '', provider: '', url: '', level: 'beginner', description: '' };

export default function CoursesPage() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const state = useAsync(() => fetchCourses(), []);
  const courses = state.data ?? [];

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setFormError(t('app.lms.titleRequired'));
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await createCourse(form);
      setOpen(false);
      setForm(emptyForm);
      state.reload();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (id: string, next: boolean) => {
    await setCourseActive(id, next);
    state.reload();
  };

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  return (
    <>
      <PageHeader
        title={t('app.lms.coursesTitle')}
        subtitle={t('app.lms.coursesSubtitle')}
        action={
          <button
            type="button"
            onClick={() => {
              setForm(emptyForm);
              setFormError(null);
              setOpen(true);
            }}
            className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
          >
            <i className="ri-add-line" />
            {t('app.lms.newCourse')}
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.lms.totalCourses')} value={courses.length} icon="ri-global-line" tone="primary" />
        <StatCard
          label={t('app.lms.activeCourses')}
          value={courses.filter((course) => course.is_active).length}
          icon="ri-play-circle-line"
          tone="secondary"
        />
        <StatCard
          label={t('app.lms.providers')}
          value={new Set(courses.map((course) => course.provider ?? '—')).size}
          icon="ri-building-4-line"
          tone="accent"
        />
      </div>

      {courses.length === 0 ? (
        <Card>
          <EmptyState icon="ri-global-line" label={t('app.lms.noCourses')} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
          {courses.map((course) => (
            <Card key={course.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground-950 truncate">{course.title}</h3>
                  <p className="text-[11px] text-foreground-500 truncate">{course.provider ?? '—'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void toggleActive(course.id, !course.is_active)}
                  className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md border border-background-300 text-foreground-700 hover:border-primary-400 cursor-pointer"
                  aria-label={course.is_active ? t('app.common.inactive') : t('app.common.active')}
                >
                  <i className={`${course.is_active ? 'ri-toggle-fill' : 'ri-toggle-line'} text-base`} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="accent">{t(`app.lms.level.${course.level}`, { defaultValue: course.level })}</Badge>
                <Badge tone={course.is_active ? 'secondary' : 'neutral'}>
                  {course.is_active ? t('app.common.active') : t('app.common.inactive')}
                </Badge>
              </div>

              <p className="text-xs text-foreground-600 line-clamp-3 min-h-[48px]">{course.description ?? '—'}</p>

              {course.url ? (
                <a
                  href={course.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary-600 hover:text-primary-700 cursor-pointer"
                >
                  <i className="ri-external-link-line" />
                  {t('app.lms.openCourse')}
                </a>
              ) : (
                <span className="text-[11px] text-foreground-400">{t('app.lms.noLink')}</span>
              )}
            </Card>
          ))}
        </div>
      )}

      {open && (
        <Modal title={t('app.lms.newCourse')} onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="co-title">
                {t('app.lms.course')}
              </label>
              <input
                id="co-title"
                type="text"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className={labelClass} htmlFor="co-provider">
                  {t('app.lms.provider')}
                </label>
                <input
                  id="co-provider"
                  type="text"
                  value={form.provider}
                  onChange={(event) => setForm({ ...form, provider: event.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className={labelClass} htmlFor="co-level">
                  {t('app.lms.level')}
                </label>
                <select
                  id="co-level"
                  value={form.level}
                  onChange={(event) => setForm({ ...form, level: event.target.value })}
                  className={inputClass}
                >
                  {LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {t(`app.lms.level.${level}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="co-url">
                {t('app.lms.url')}
              </label>
              <input
                id="co-url"
                type="url"
                dir="ltr"
                value={form.url}
                onChange={(event) => setForm({ ...form, url: event.target.value })}
                className={inputClass}
                placeholder="https://"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="co-desc">
                {t('app.lms.description')}
              </label>
              <textarea
                id="co-desc"
                rows={3}
                maxLength={500}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
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