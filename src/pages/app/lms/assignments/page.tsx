import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { fetchClasses, fetchSections, fetchSubjects } from '@/api/college';
import { createAssignment, deleteAssignment, fetchAssignments, setAssignmentPublished } from '@/api/operations';
import { formatDate } from '@/utils/date';
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
  StatCard,
  TableWrap,
  Td,
  Th,
} from '@/components/app/ui';

const emptyForm = { title: '', instructions: '', sectionId: '', subjectId: '', dueDate: '', maxScore: '100' };

export default function AssignmentsPage() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const state = useAsync(async () => {
    const [assignments, sections, classes, subjects] = await Promise.all([
      fetchAssignments(),
      fetchSections(),
      fetchClasses(),
      fetchSubjects(),
    ]);
    return { assignments, sections, classes, subjects };
  }, []);

  const assignments = state.data?.assignments ?? [];
  const sections = state.data?.sections ?? [];
  const classes = state.data?.classes ?? [];
  const subjects = state.data?.subjects ?? [];

  const sectionLabel = (sectionId: string | null) => {
    const section = sections.find((item) => item.id === sectionId);
    if (!section) return '—';
    const className = classes.find((klass) => klass.id === section.class_id)?.name ?? '';
    return `${className} / ${section.name}`.replace(/^ \//, '');
  };

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = useMemo(
    () => assignments.filter((item) => item.due_date && item.due_date >= today).length,
    [assignments, today],
  );

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setFormError(t('app.lms.titleRequired'));
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await createAssignment({
        title: form.title,
        instructions: form.instructions,
        sectionId: form.sectionId || null,
        subjectId: form.subjectId || null,
        dueDate: form.dueDate || null,
        maxScore: Number(form.maxScore) || 100,
      });
      setOpen(false);
      setForm(emptyForm);
      state.reload();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    setConfirmId(null);
    await deleteAssignment(id);
    state.reload();
  };

  const togglePublished = async (id: string, next: boolean) => {
    await setAssignmentPublished(id, next);
    state.reload();
  };

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  return (
    <>
      <PageHeader
        title={t('app.lms.assignmentsTitle')}
        subtitle={t('app.lms.assignmentsSubtitle')}
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
            {t('app.lms.newAssignment')}
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.lms.totalAssignments')} value={assignments.length} icon="ri-task-line" tone="primary" />
        <StatCard label={t('app.lms.upcoming')} value={upcoming} icon="ri-time-line" tone="accent" />
        <StatCard
          label={t('app.lms.published')}
          value={assignments.filter((item) => item.is_published).length}
          icon="ri-eye-line"
          tone="secondary"
        />
        <StatCard label={t('app.lms.sections')} value={sections.length} icon="ri-group-line" tone="neutral" />
      </div>

      <Card>
        {assignments.length === 0 ? (
          <EmptyState icon="ri-task-line" label={t('app.lms.noAssignments')} />
        ) : (
          <TableWrap>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th>{t('app.lms.assignment')}</Th>
                <Th>{t('app.reports.section')}</Th>
                <Th>{t('app.lms.subject')}</Th>
                <Th>{t('app.lms.dueDate')}</Th>
                <Th>{t('app.lms.maxScore')}</Th>
                <Th>{t('app.common.status')}</Th>
                <Th>{t('app.common.actions')}</Th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((item) => {
                const overdue = item.due_date ? item.due_date < today : false;
                return (
                  <Row key={item.id}>
                    <Td>
                      <p className="text-sm font-medium text-foreground-950 truncate max-w-[220px]">{item.title}</p>
                      <p className="text-[11px] text-foreground-500 truncate max-w-[220px]">{item.instructions ?? '—'}</p>
                    </Td>
                    <Td className="text-xs whitespace-nowrap">{sectionLabel(item.section_id)}</Td>
                    <Td className="text-xs whitespace-nowrap">{item.subjects?.name ?? '—'}</Td>
                    <Td className="text-xs whitespace-nowrap">
                      {item.due_date ? (
                        <span className={overdue ? 'text-primary-700 font-semibold' : ''}>
                          {formatDate(item.due_date, i18n.language)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td className="text-xs tabular-nums">{item.max_score}</Td>
                    <Td>
                      <Badge tone={item.is_published ? 'secondary' : 'neutral'}>
                        {item.is_published ? t('app.lms.publishedBadge') : t('app.lms.draftBadge')}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void togglePublished(item.id, !item.is_published)}
                          className="w-8 h-8 flex items-center justify-center rounded-md border border-background-300 text-foreground-700 hover:border-primary-400 cursor-pointer"
                          aria-label={t('app.lms.publish')}
                        >
                          <i className={`${item.is_published ? 'ri-eye-off-line' : 'ri-eye-line'} text-sm`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item.id)}
                          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                            confirmId === item.id
                              ? 'bg-primary-500 text-background-50 border-primary-500'
                              : 'border-background-300 text-foreground-700 hover:border-primary-400'
                          }`}
                        >
                          <i className={confirmId === item.id ? 'ri-check-line' : 'ri-delete-bin-line'} />
                          {confirmId === item.id ? t('app.common.confirm') : ''}
                        </button>
                      </div>
                    </Td>
                  </Row>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>

      {open && (
        <Modal title={t('app.lms.newAssignment')} onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="as-title">
                {t('app.lms.assignment')}
              </label>
              <input
                id="as-title"
                type="text"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className={labelClass} htmlFor="as-section">
                  {t('app.reports.section')}
                </label>
                <select
                  id="as-section"
                  value={form.sectionId}
                  onChange={(event) => setForm({ ...form, sectionId: event.target.value })}
                  className={inputClass}
                >
                  <option value="">{t('app.lms.anySection')}</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {sectionLabel(section.id)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className={labelClass} htmlFor="as-subject">
                  {t('app.lms.subject')}
                </label>
                <select
                  id="as-subject"
                  value={form.subjectId}
                  onChange={(event) => setForm({ ...form, subjectId: event.target.value })}
                  className={inputClass}
                >
                  <option value="">{t('app.lms.anySubject')}</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className={labelClass} htmlFor="as-due">
                  {t('app.lms.dueDate')}
                </label>
                <input
                  id="as-due"
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className={labelClass} htmlFor="as-max">
                  {t('app.lms.maxScore')}
                </label>
                <input
                  id="as-max"
                  type="number"
                  min={1}
                  dir="ltr"
                  value={form.maxScore}
                  onChange={(event) => setForm({ ...form, maxScore: event.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="as-instructions">
                {t('app.lms.instructions')}
              </label>
              <textarea
                id="as-instructions"
                rows={3}
                maxLength={500}
                value={form.instructions}
                onChange={(event) => setForm({ ...form, instructions: event.target.value })}
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