import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import {
  fetchAttendanceSince,
  fetchClasses,
  fetchExamResults,
  fetchExamSubjects,
  fetchInvoices,
  fetchSections,
  fetchStudents,
} from '@/api/college';
import { recentSchoolDays } from '@/utils/attendance';
import { formatMoney, toNumber } from '@/utils/money';
import { formatDate } from '@/utils/date';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import {
  Avatar,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  ProgressRow,
  Row,
  StatCard,
  StatusPill,
  TableWrap,
  Td,
  Th,
} from '@/components/app/ui';

/** Staff view: an administrator or teacher looks at any student on record. */
export default function StaffStudentPortal() {
  const { t, i18n } = useTranslation();
  const [studentId, setStudentId] = useState('');

  const state = useAsync(async () => {
    const [students, sections, classes, invoices, results, papers, attendance] = await Promise.all([
      fetchStudents(),
      fetchSections(),
      fetchClasses(),
      fetchInvoices(),
      fetchExamResults(),
      fetchExamSubjects(),
      fetchAttendanceSince(recentSchoolDays(30)[0]),
    ]);
    return { students, sections, classes, invoices, results, papers, attendance };
  }, []);

  const students = state.data?.students ?? [];
  const sections = state.data?.sections ?? [];
  const classes = state.data?.classes ?? [];
  const invoices = state.data?.invoices ?? [];
  const results = state.data?.results ?? [];
  const papers = state.data?.papers ?? [];
  const attendance = state.data?.attendance ?? [];

  useEffect(() => {
    if (studentId || !state.data) return;
    if (students[0]) setStudentId(students[0].id);
  }, [state.data, students, studentId]);

  const student = students.find((item) => item.id === studentId) ?? null;
  const paperMap = useMemo(() => new Map(papers.map((paper) => [paper.id, paper])), [papers]);

  const myResults = useMemo(() => {
    if (!student) return [];
    return results
      .filter((result) => result.student_id === student.id)
      .map((result) => {
        const paper = paperMap.get(result.exam_subject_id);
        const max = toNumber(paper?.max_marks) || 100;
        return {
          id: result.id,
          subject: paper?.subjects?.name ?? t('app.lms.subject'),
          marks: toNumber(result.marks_obtained),
          max,
          grade: result.grade,
          percentage: Math.round((toNumber(result.marks_obtained) / max) * 100),
        };
      })
      .slice(0, 8);
  }, [results, student, paperMap, t]);

  const myInvoices = useMemo(
    () => (student ? invoices.filter((invoice) => invoice.student_id === student.id) : []),
    [invoices, student],
  );

  const billed = myInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0);
  const paid = myInvoices.reduce(
    (sum, invoice) => sum + (invoice.payments ?? []).reduce((inner, payment) => inner + toNumber(payment.amount), 0),
    0,
  );
  const outstanding = Math.max(0, billed - paid);

  const myAttendance = useMemo(
    () => (student ? attendance.filter((record) => record.student_id === student.id) : []),
    [attendance, student],
  );

  const attendanceRate = myAttendance.length
    ? Math.round(
        (myAttendance.filter((record) => record.status === 'present' || record.status === 'late').length /
          myAttendance.length) *
          100,
      )
    : 0;

  const classLabel = student
    ? `${classes.find((klass) => klass.id === student.sections?.class_id)?.name ?? '—'} / ${
        sections.find((section) => section.id === student.section_id)?.name ?? '—'
      }`
    : '—';

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  return (
    <>
      <PageHeader
        title={t('app.portal.studentTitle')}
        subtitle={t('app.portal.studentSubtitle')}
        action={
          <div className="flex flex-col gap-1 min-w-[220px]">
            <label className={labelClass} htmlFor="student-pick">
              {t('app.portal.viewAs')}
            </label>
            <select
              id="student-pick"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              className={inputClass}
            >
              {students.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.first_name} {item.last_name ?? ''} — {item.student_no ?? ''}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {!student ? (
        <Card>
          <EmptyState icon="ri-graduation-cap-line" label={t('app.portal.noStudent')} />
        </Card>
      ) : (
        <>
          <Card className="p-4 mb-3 md:mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <Avatar name={`${student.first_name} ${student.last_name ?? ''}`} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground-950 truncate">
                  {student.first_name} {student.last_name ?? ''}
                </p>
                <p className="text-[11px] text-foreground-500 truncate">
                  {student.student_no ?? '—'} · {classLabel}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 ms-auto">
                <StatusPill value={student.status} />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
            <StatCard label={t('app.attendance.rate')} value={`${attendanceRate}%`} icon="ri-calendar-check-line" tone="primary" />
            <StatCard label={t('app.portal.subjectsScored')} value={myResults.length} icon="ri-bar-chart-grouped-line" tone="secondary" />
            <StatCard label={t('app.portal.billed')} value={formatMoney(billed)} icon="ri-receipt-line" tone="accent" />
            <StatCard label={t('app.portal.outstanding')} value={formatMoney(outstanding)} icon="ri-alarm-warning-line" tone="danger" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
            <Card className="lg:col-span-2">
              <CardHeader
                title={t('app.portal.latestResults')}
                action={
                  <Link
                    to="/app/reports"
                    className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 cursor-pointer"
                  >
                    {t('app.common.view')}
                  </Link>
                }
              />
              {myResults.length === 0 ? (
                <EmptyState icon="ri-bar-chart-grouped-line" label={t('app.portal.noResults')} />
              ) : (
                <TableWrap>
                  <thead className="bg-background-100 border-b border-background-200">
                    <tr>
                      <Th>{t('app.lms.subject')}</Th>
                      <Th>{t('app.portal.marks')}</Th>
                      <Th>{t('app.portal.score')}</Th>
                      <Th>{t('app.portal.grade')}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {myResults.map((row) => (
                      <Row key={row.id}>
                        <Td className="text-sm font-medium text-foreground-950 truncate max-w-[200px]">{row.subject}</Td>
                        <Td className="text-xs tabular-nums whitespace-nowrap">
                          {row.marks} / {row.max}
                        </Td>
                        <Td className="w-40">
                          <ProgressRow value={row.percentage} />
                        </Td>
                        <Td>
                          <Badge tone="neutral">{row.grade ?? '—'}</Badge>
                        </Td>
                      </Row>
                    ))}
                  </tbody>
                </TableWrap>
              )}
            </Card>

            <div className="flex flex-col gap-3 md:gap-4">
              <Card>
                <CardHeader title={t('app.portal.attendanceSummary')} />
                <div className="p-4 flex flex-col gap-3">
                  <ProgressRow value={attendanceRate} />
                  <div className="flex items-center justify-between text-[11px] text-foreground-600">
                    <span>{t('app.portal.records', { count: myAttendance.length })}</span>
                    <span>
                      {t('app.attendance.absent')}:{' '}
                      <b className="text-foreground-900">
                        {myAttendance.filter((record) => record.status === 'absent').length}
                      </b>
                    </span>
                  </div>
                  <Link
                    to="/app/attendance"
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary-600 hover:text-primary-700 cursor-pointer"
                  >
                    <i className="ri-calendar-check-line" />
                    {t('app.nav.attendance')}
                  </Link>
                </div>
              </Card>

              <Card>
                <CardHeader title={t('app.portal.invoices')} />
                <div className="p-2">
                  {myInvoices.length === 0 && <EmptyState icon="ri-receipt-line" />}
                  {myInvoices.slice(0, 5).map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between gap-2 px-2 py-2.5 border-b border-background-100 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground-900 truncate">{invoice.invoice_no}</p>
                        <p className="text-[11px] text-foreground-500">
                          {formatDate(invoice.issue_date, i18n.language)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs font-semibold tabular-nums">{formatMoney(invoice.total)}</span>
                        <StatusPill value={invoice.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  );
}