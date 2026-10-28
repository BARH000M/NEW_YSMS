import { useTranslation } from 'react-i18next';
import type { Institution } from '@/api/types';
import type { StudentRow } from '@/api/college';
import { formatDate } from '@/utils/date';

export default function StudentIdCard({
  student,
  institution,
}: {
  student: StudentRow;
  institution: Institution | null;
}) {
  const { t, i18n } = useTranslation();

  const name = `${student.first_name} ${student.last_name ?? ''}`.trim();
  const nameAr = `${student.first_name_ar ?? ''} ${student.last_name_ar ?? ''}`.trim();
  const initial = name.charAt(0).toUpperCase() || '?';
  const className = student.sections?.classes?.name ?? '—';
  const sectionName = student.sections?.name ?? '—';

  return (
    <div className="p-6 sm:p-10">
      <p className="text-[11px] text-foreground-500 mb-4 text-center">{t('app.print.idCardHint')}</p>

      <div className="print-break mx-auto w-full max-w-[400px] rounded-lg overflow-hidden border border-foreground-300">
        <div className="bg-foreground-950 text-background-50 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 shrink-0 rounded-md bg-accent-500 text-foreground-950 flex items-center justify-center font-bold text-[11px]">
              SAI
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold leading-tight truncate">
                {institution?.name_ar || institution?.name || 'SAI Educational College'}
              </p>
              <p className="text-[9px] text-background-50/60 truncate">{institution?.name ?? 'SAI Educational College'}</p>
            </div>
          </div>
          <span className="text-[9px] font-semibold text-accent-300 whitespace-nowrap shrink-0">
            {t('app.print.studentCard')}
          </span>
        </div>

        <div className="bg-background-50 px-4 py-4 flex items-start gap-4">
          <div className="shrink-0">
            <span className="w-[64px] h-[80px] rounded-md bg-background-200 border border-foreground-200 flex items-center justify-center">
              <span className="text-xl font-bold text-foreground-700">{initial}</span>
            </span>
            <p className="text-[8px] text-foreground-500 text-center mt-1">{t('app.print.photo')}</p>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground-950 truncate">{name}</p>
            {nameAr ? (
              <p className="text-[11px] text-foreground-600 truncate mt-0.5" dir="rtl">
                {nameAr}
              </p>
            ) : null}

            <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[9px]">
              <div className="col-span-2">
                <dt className="text-foreground-500">{t('app.students.studentNo')}</dt>
                <dd className="font-semibold tabular-nums text-[11px]" dir="ltr">
                  {student.student_no ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-foreground-500">{t('app.students.classCol')}</dt>
                <dd className="font-semibold text-foreground-900 truncate">{className}</dd>
              </div>
              <div>
                <dt className="text-foreground-500">{t('app.students.sectionCol')}</dt>
                <dd className="font-semibold text-foreground-900 truncate">{sectionName}</dd>
              </div>
              <div>
                <dt className="text-foreground-500">{t('app.students.dob')}</dt>
                <dd className="font-semibold text-foreground-900">
                  {student.dob ? formatDate(student.dob, i18n.language) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-foreground-500">{t('app.print.academicYear')}</dt>
                <dd className="font-semibold text-foreground-900 tabular-nums">2026 / 2027</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="bg-background-100 border-t border-foreground-200 px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-[2px] h-6" aria-hidden="true">
            {(student.student_no ?? 'SAI-0000').split('').concat(['0', '1', '2', '7']).slice(0, 18).map((char, index) => (
              <span
                key={`${char}-${index}`}
                className="block bg-foreground-900"
                style={{ width: index % 3 === 0 ? '2px' : '1px', height: '100%' }}
              />
            ))}
          </div>
          <p className="text-[8px] text-foreground-500 text-end leading-tight">
            {t('app.print.cardFooter')}
          </p>
        </div>
      </div>

      <p className="text-[10px] text-foreground-500 mt-6 text-center">{t('app.print.idCardNote')}</p>
    </div>
  );
}