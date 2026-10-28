import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GuardianLink, InvoiceWithStudent, StudentRow } from '@/api/college';
import type { Institution } from '@/api/types';
import { fetchSiblings, fetchStudentExtras } from '@/api/campusOps';
import { useAsync } from '@/hooks/useAsync';
import { formatDate } from '@/utils/date';
import { Avatar, Badge, StatusPill } from '@/components/app/ui';
import FamilyBalances from './FamilyBalances';
import EnrollmentHistory from './EnrollmentHistory';
import StudentDocuments from './StudentDocuments';

type Tab = 'overview' | 'history' | 'documents';

function RecordItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-500">{label}</p>
      <p className="text-xs font-medium text-foreground-900 break-words">{value}</p>
    </div>
  );
}

export default function StudentProfileModal({
  student,
  students,
  links,
  invoices,
  institution,
  canSeeFamily,
  canWrite,
  onClose,
  onPrint,
}: {
  student: StudentRow;
  students: StudentRow[];
  links: GuardianLink[];
  invoices: InvoiceWithStudent[];
  institution: Institution | null;
  canSeeFamily: boolean;
  canWrite: boolean;
  onClose: () => void;
  onPrint: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>('overview');

  const guardian = useMemo(
    () => links.find((link) => link.student_id === student.id && link.guardians)?.guardians ?? null,
    [links, student.id],
  );

  // The 360° record lives in its own tables — load it lazily for the open student.
  const record = useAsync(async () => {
    const [extras, siblings] = await Promise.all([fetchStudentExtras(), fetchSiblings()]);
    return {
      extras: extras.find((row) => row.student_id === student.id) ?? null,
      siblings: siblings.filter((row) => row.student_id === student.id),
    };
  }, [student.id]);

  const extras = record.data?.extras ?? null;
  const siblings = record.data?.siblings ?? [];

  const displayName = `${student.first_name} ${student.last_name ?? ''}`.trim();

  const details = [
    { label: t('app.students.studentNo'), value: student.student_no ?? '—' },
    {
      label: t('app.students.classCol'),
      value: `${student.sections?.classes?.name ?? '—'}${student.sections ? ` / ${student.sections.name}` : ''}`,
    },
    { label: t('app.students.dob'), value: student.dob ? formatDate(student.dob, i18n.language) : '—' },
    { label: t('app.students.gender'), value: student.gender ? t(`app.status.${student.gender}`) : '—' },
    { label: t('app.students.nationality'), value: student.nationality ?? '—' },
    {
      label: t('app.students.enrolledAt'),
      value: student.enrolled_at ? formatDate(student.enrolled_at, i18n.language) : '—',
    },
    { label: t('app.students.guardianCol'), value: guardian?.full_name ?? t('app.students.noGuardians') },
    { label: t('app.students.guardianPhone'), value: guardian?.phone ?? '—' },
  ];

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: t('app.students.tabOverview'), icon: 'ri-user-line' },
    { key: 'history', label: t('app.students.tabHistory'), icon: 'ri-history-line' },
    { key: 'documents', label: t('app.students.tabDocuments'), icon: 'ri-folder-3-line' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <button
        type="button"
        aria-label="close"
        onClick={onClose}
        className="absolute inset-0 bg-foreground-950/50 cursor-pointer"
      />
      <div className="relative bg-background-50 border border-background-300 rounded-t-lg sm:rounded-lg w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 p-4 md:p-5 border-b border-background-200 sticky top-0 bg-background-50 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={displayName} />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground-950 truncate">{displayName}</h2>
              <p className="text-[11px] text-foreground-500">{t('app.students.profile')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md border border-background-300 text-foreground-700 cursor-pointer"
            aria-label="close"
          >
            <i className="ri-close-line" />
          </button>
        </div>

        <div className="px-4 md:px-5 pt-3">
          <div className="inline-flex items-center gap-1 p-1 bg-background-100 border border-background-200 rounded-full flex-wrap">
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  tab === item.key
                    ? 'bg-primary-500 text-background-50'
                    : 'text-foreground-700 hover:bg-background-200'
                }`}
              >
                <i className={item.icon} />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 md:p-5">
          {tab === 'overview' ? (
            <>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {details.map((item) => (
                  <div key={item.label}>
                    <dt className="text-[11px] font-semibold text-foreground-500">{item.label}</dt>
                    <dd className="text-sm text-foreground-900 mt-0.5 break-words">{item.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 rounded-md border border-background-200 bg-background-100 p-3">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-foreground-600">
                    {t('app.students.record360')}
                  </p>
                  {extras?.rte ? <Badge tone="accent">{t('app.students.rte')}</Badge> : null}
                </div>

                {record.loading ? (
                  <p className="text-[11px] text-foreground-500">{t('app.common.loading')}…</p>
                ) : record.error ? (
                  <p className="text-[11px] text-foreground-500">{t('app.students.recordUnavailable')}</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <RecordItem label={t('app.categories.caste')} value={extras?.caste || '—'} />
                      <RecordItem label={t('app.categories.skill')} value={extras?.skill_ability || '—'} />
                      <RecordItem label={t('app.categories.motherTongue')} value={extras?.mother_tongue || '—'} />
                      <RecordItem label={t('app.categories.nationalId')} value={extras?.national_id || '—'} />
                    </div>

                    <div className="rounded-md bg-background-50 border border-background-200 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-foreground-500 mb-1.5">
                        {t('app.categories.previousSchool')}
                      </p>
                      {extras?.prev_school_name ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <RecordItem label={t('app.categories.schoolName')} value={extras.prev_school_name} />
                          <RecordItem label={t('app.categories.lastClass')} value={extras.prev_school_class || '—'} />
                          <RecordItem label={t('app.categories.tcNo')} value={extras.prev_school_tc_no || '—'} />
                        </div>
                      ) : (
                        <p className="text-[11px] text-foreground-500">{t('app.students.prevSchoolNone')}</p>
                      )}
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-foreground-500 mb-1.5">
                        {t('app.students.siblingsOnFile')}
                      </p>
                      {siblings.length === 0 ? (
                        <p className="text-[11px] text-foreground-500">{t('app.categories.noSiblings')}</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {siblings.map((row) => (
                            <span
                              key={row.id}
                              className="inline-flex items-center gap-1.5 border border-background-300 bg-background-50 rounded-full px-2.5 py-1 text-[11px] text-foreground-800"
                            >
                              <i className="ri-user-heart-line text-foreground-500" />
                              {row.sibling_name}
                              {row.class_name ? (
                                <span className="text-foreground-500">· {row.class_name}</span>
                              ) : null}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between rounded-md bg-background-100 border border-background-200 px-3 py-2 mt-4">
                <span className="text-xs text-foreground-600">{t('app.common.status')}</span>
                <StatusPill value={student.status} />
              </div>

              {canSeeFamily ? (
                <div className="mt-3">
                  <FamilyBalances student={student} students={students} links={links} invoices={invoices} />
                </div>
              ) : null}

              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <button
                  type="button"
                  onClick={onPrint}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-4 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-id-card-line" />
                  {t('app.print.idCard')}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 border border-background-300 text-foreground-800 text-xs font-semibold px-4 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
                >
                  {t('app.common.close')}
                </button>
              </div>
            </>
          ) : null}

          {tab === 'history' ? <EnrollmentHistory student={student} canWrite={canWrite} /> : null}

          {tab === 'documents' ? (
            <StudentDocuments
              studentId={student.id}
              institutionId={student.institution_id}
              canWrite={canWrite}
            />
          ) : null}

          {tab !== 'overview' && institution ? (
            <p className="text-[10px] text-foreground-400 mt-4 truncate">{institution.name}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}