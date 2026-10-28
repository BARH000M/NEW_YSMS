import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { fetchSelfPortal } from '@/api/portal';
import { Card, EmptyState, ErrorState, LoadingBlock, PageHeader } from '@/components/app/ui';
import ExportBar from '@/components/app/ExportBar';
import { fullName } from '@/api/portal';
import SelfPortalView from './SelfPortalView';

export default function SelfStudentPortal() {
  const { t, i18n } = useTranslation();
  const state = useAsync(() => fetchSelfPortal(), []);
  const [activeId, setActiveId] = useState('');

  const students = state.data?.students ?? [];

  useEffect(() => {
    if (!activeId && students[0]) setActiveId(students[0].id);
  }, [students, activeId]);

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  const active = students.find((student) => student.id === activeId) ?? students[0] ?? null;
  const isParent = state.data?.role === 'parent';

  return (
    <>
      <PageHeader
        title={isParent ? t('app.portal.parentTitle') : t('app.portal.studentTitle')}
        subtitle={isParent ? t('app.portal.parentSubtitle') : t('app.portal.selfSubtitle')}
        action={
          active ? (
            <ExportBar
              title={`${fullName(active, i18n.language === 'ar')} — ${t('app.portal.latestResults')}`}
              fileName={`student-portal-${active.student_no ?? active.id.slice(0, 8)}`}
              columns={[
                t('app.enroll.subject'),
                t('app.portal.marks'),
                t('app.marks.max'),
                t('app.marks.percentage'),
                t('app.portal.grade'),
              ]}
              rows={active.results.map((result) => [
                i18n.language === 'ar' && result.subject_ar ? result.subject_ar : result.subject,
                result.marks,
                result.max,
                `${result.percentage}%`,
                result.grade ?? '',
              ])}
              hint={`${active.student_no ?? ''} · ${active.sections?.classes?.name ?? ''}`}
              summary={[
                { label: t('app.attendance.rate'), value: `${active.attendance.total ? Math.round(((active.attendance.present + active.attendance.late) / active.attendance.total) * 100) : 0}%` },
                { label: t('app.portal.outstanding'), value: String(active.finance.outstanding) },
              ]}
            />
          ) : null
        }
      />

      {!state.data?.linked || !active ? (
        <Card>
          <EmptyState icon="ri-link-m" label={t('app.portal.notLinkedTitle')} />
          <p className="px-6 pb-6 text-xs text-foreground-600 text-center max-w-lg mx-auto">
            {t('app.portal.notLinkedBody')}
          </p>
        </Card>
      ) : (
        <>
          {isParent && students.length > 1 && (
            <div className="inline-flex items-center gap-1 p-1 bg-background-100 border border-background-200 rounded-full mb-3 md:mb-4 flex-wrap">
              {students.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setActiveId(student.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer ${
                    active.id === student.id
                      ? 'bg-primary-500 text-background-50'
                      : 'text-foreground-700 hover:bg-background-200'
                  }`}
                >
                  {fullName(student, i18n.language === 'ar')}
                </button>
              ))}
            </div>
          )}
          <SelfPortalView student={active} />
        </>
      )}
    </>
  );
}