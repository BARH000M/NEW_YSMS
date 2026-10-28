import { useTranslation } from 'react-i18next';
import type { Institution } from '@/api/types';
import type { StudentRow } from '@/api/college';
import type { ReportSummary } from '@/utils/report';
import { formatDate } from '@/utils/date';

export default function ReportCard({
  student,
  report,
  institution,
  termLabel,
}: {
  student: StudentRow;
  report: ReportSummary;
  institution: Institution | null;
  termLabel: string;
}) {
  const { t, i18n } = useTranslation();

  const fullName = `${student.first_name} ${student.last_name ?? ''}`.trim();
  const nameAr = `${student.first_name_ar ?? ''} ${student.last_name_ar ?? ''}`.trim();
  const className = student.sections?.classes?.name ?? '—';
  const sectionName = student.sections?.name ?? '—';

  return (
    <div className="p-6 sm:p-8 text-foreground-950">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b-2 border-foreground-900">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-12 h-12 shrink-0 rounded-md bg-foreground-950 text-background-50 flex items-center justify-center font-bold text-sm">
            SAI
          </span>
          <div className="min-w-0">
            <p className="font-heading text-lg leading-tight">
              {institution?.name_ar || institution?.name || 'SAI Educational College'}
            </p>
            <p className="text-[11px] text-foreground-600 mt-0.5">
              {institution?.name || 'SAI Educational College'}
            </p>
            <p className="text-[11px] text-foreground-600">
              {institution?.address ?? '—'} · {institution?.phone ?? '—'}
            </p>
          </div>
        </div>

        <div className="text-end shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground-500">
            {t('app.reports.termSummary')}
          </p>
          <p className="text-sm font-semibold">{termLabel}</p>
          <p className="text-[11px] text-foreground-600 mt-1">
            {t('app.reports.issued')}: {formatDate(new Date().toISOString(), i18n.language)}
          </p>
        </div>
      </div>

      <div className="text-center my-4">
        <h1 className="font-heading text-xl">{t('app.reports.titleOnSheet')}</h1>
        <p className="text-[11px] text-foreground-500 mt-0.5">{t('app.reports.subtitleOnSheet')}</p>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-md border border-foreground-200 bg-background-50 px-4 py-3 text-xs">
        <div>
          <span className="text-foreground-500">{t('app.reports.student')}: </span>
          <span className="font-semibold">{fullName}</span>
          {nameAr ? <span className="block text-[11px] text-foreground-600">{nameAr}</span> : null}
        </div>
        <div>
          <span className="text-foreground-500">{t('app.students.studentNo')}: </span>
          <span className="font-semibold tabular-nums" dir="ltr">
            {student.student_no ?? '—'}
          </span>
        </div>
        <div>
          <span className="text-foreground-500">{t('app.students.classCol')}: </span>
          <span className="font-semibold">
            {className} / {sectionName}
          </span>
        </div>
        <div>
          <span className="text-foreground-500">{t('app.reports.papers')}: </span>
          <span className="font-semibold tabular-nums">{report.papers}</span>
        </div>
      </div>

      <table className="w-full mt-4 border-collapse text-xs">
        <thead>
          <tr className="bg-background-200">
            <th className="text-start font-semibold px-3 py-2 border border-foreground-200">
              {t('app.exams.subject')}
            </th>
            <th className="text-end font-semibold px-3 py-2 border border-foreground-200 w-20">
              {t('app.reports.papers')}
            </th>
            <th className="text-end font-semibold px-3 py-2 border border-foreground-200 w-24">
              {t('app.reports.obtained')}
            </th>
            <th className="text-end font-semibold px-3 py-2 border border-foreground-200 w-20">
              {t('app.exams.maxMarks')}
            </th>
            <th className="text-end font-semibold px-3 py-2 border border-foreground-200 w-20">
              {t('app.reports.percentage')}
            </th>
            <th className="text-center font-semibold px-3 py-2 border border-foreground-200 w-16">
              {t('app.reports.grade')}
            </th>
          </tr>
        </thead>
        <tbody>
          {report.rows.map((row) => (
            <tr key={row.subjectId}>
              <td className="px-3 py-2 border border-foreground-200">
                <span className="font-medium">{row.name}</span>
                {row.nameAr ? (
                  <span className="block text-[10px] text-foreground-500">{row.nameAr}</span>
                ) : null}
              </td>
              <td className="px-3 py-2 border border-foreground-200 text-end tabular-nums">{row.papers}</td>
              <td className="px-3 py-2 border border-foreground-200 text-end tabular-nums">{row.obtained}</td>
              <td className="px-3 py-2 border border-foreground-200 text-end tabular-nums">{row.max}</td>
              <td className="px-3 py-2 border border-foreground-200 text-end tabular-nums">{row.percentage}%</td>
              <td className="px-3 py-2 border border-foreground-200 text-center font-bold">{row.grade}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-background-200 font-semibold">
            <td className="px-3 py-2 border border-foreground-200">{t('app.reports.overall')}</td>
            <td className="px-3 py-2 border border-foreground-200 text-end tabular-nums">{report.papers}</td>
            <td className="px-3 py-2 border border-foreground-200 text-end tabular-nums">{report.obtained}</td>
            <td className="px-3 py-2 border border-foreground-200 text-end tabular-nums">{report.max}</td>
            <td className="px-3 py-2 border border-foreground-200 text-end tabular-nums">{report.percentage}%</td>
            <td className="px-3 py-2 border border-foreground-200 text-center">{report.grade}</td>
          </tr>
        </tfoot>
      </table>

      <div className="grid grid-cols-3 gap-4 mt-4 text-xs">
        <div className="rounded-md border border-foreground-200 px-3 py-2">
          <p className="text-[10px] text-foreground-500">{t('app.reports.percentage')}</p>
          <p className="font-heading text-lg">{report.percentage}%</p>
        </div>
        <div className="rounded-md border border-foreground-200 px-3 py-2">
          <p className="text-[10px] text-foreground-500">{t('app.reports.grade')}</p>
          <p className="font-heading text-lg">{report.grade}</p>
        </div>
        <div className="rounded-md border border-foreground-200 px-3 py-2">
          <p className="text-[10px] text-foreground-500">{t('app.reports.result')}</p>
          <p className={`font-heading text-lg ${report.passed ? 'text-secondary-700' : 'text-primary-800'}`}>
            {report.passed ? t('app.reports.pass') : t('app.reports.fail')}
          </p>
        </div>
      </div>

      <p className="text-[10px] text-foreground-500 mt-3">{t('app.reports.gradeScale')}</p>

      <div className="grid grid-cols-3 gap-6 mt-10 text-[11px] text-foreground-600">
        <div>
          <div className="border-t border-foreground-400 pt-1.5">{t('app.reports.teacherSign')}</div>
        </div>
        <div>
          <div className="border-t border-foreground-400 pt-1.5">{t('app.reports.principalSign')}</div>
        </div>
        <div>
          <div className="border-t border-foreground-400 pt-1.5">{t('app.reports.guardianSign')}</div>
        </div>
      </div>

      <p className="text-[10px] text-foreground-500 mt-5 text-center leading-relaxed">{t('app.reports.footer')}</p>
    </div>
  );
}