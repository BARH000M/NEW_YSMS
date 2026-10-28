import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GuardianLink, InvoiceWithStudent, StudentRow } from '@/api/college';
import type { Institution } from '@/api/types';
import { formatDate } from '@/utils/date';
import { Avatar, StatusPill } from '@/components/app/ui';
import FamilyBalances from './FamilyBalances';
import EnrollmentHistory from './EnrollmentHistory';
import StudentDocuments from './StudentDocuments';

type Tab = 'overview' | 'history' | 'documents';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <button
        type="button"
        aria-label="close"
        onClick={onClose}
        className="absolute inset-0 bg-foreground-950/50 cursor-pointer"
      />
      <div className="relative bg-background-50 border border-background-300 rounded-lg w-full max-w-2xl max-h-[92vh] overflow-y-auto">
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