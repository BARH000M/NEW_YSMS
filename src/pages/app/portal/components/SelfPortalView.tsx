import { useTranslation } from 'react-i18next';
import { attendanceRate, fullName } from '@/api/portal';
import type { SelfStudent } from '@/api/portal';
import { formatMoney } from '@/utils/money';
import { formatDate } from '@/utils/date';
import {
  Avatar,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ProgressRow,
  Row,
  StatCard,
  StatusPill,
  TableWrap,
  Td,
  Th,
} from '@/components/app/ui';

interface SelfPortalViewProps {
  student: SelfStudent;
}

export default function SelfPortalView({ student }: SelfPortalViewProps) {
  const { t, i18n } = useTranslation();
  const arabic = i18n.language === 'ar';
  const rate = attendanceRate(student.attendance);
  const className = `${student.sections?.classes?.name ?? '—'} / ${student.sections?.name ?? '—'}`;

  return (
    <>
      <Card className="p-4 mb-3 md:mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar name={fullName(student, arabic)} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground-950 truncate">{fullName(student, arabic)}</p>
            <p className="text-[11px] text-foreground-500 truncate">
              {student.student_no ?? '—'} · {className}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 ms-auto">
            <StatusPill value={student.status} />
            <Badge tone="accent">{t('app.portal.ownProfile')}</Badge>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.attendance.rate')} value={`${rate}%`} icon="ri-calendar-check-line" tone="primary" />
        <StatCard
          label={t('app.portal.subjectsScored')}
          value={student.results.length}
          icon="ri-bar-chart-grouped-line"
          tone="secondary"
        />
        <StatCard label={t('app.portal.billed')} value={formatMoney(student.finance.billed)} icon="ri-receipt-line" tone="accent" />
        <StatCard
          label={t('app.portal.outstanding')}
          value={formatMoney(student.finance.outstanding)}
          icon="ri-alarm-warning-line"
          tone="danger"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title={t('app.portal.latestResults')} />
          {student.results.length === 0 ? (
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
                {student.results.slice(0, 10).map((row) => (
                  <Row key={row.id}>
                    <Td className="text-sm font-medium text-foreground-950 truncate max-w-[220px]">
                      {arabic && row.subject_ar ? row.subject_ar : row.subject || '—'}
                    </Td>
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
              <ProgressRow value={rate} />
              <div className="grid grid-cols-2 gap-2 text-[11px] text-foreground-600">
                <span>
                  {t('app.attendance.present')}: <b className="text-foreground-900">{student.attendance.present}</b>
                </span>
                <span>
                  {t('app.attendance.absent')}: <b className="text-foreground-900">{student.attendance.absent}</b>
                </span>
                <span>
                  {t('app.attendance.late')}: <b className="text-foreground-900">{student.attendance.late}</b>
                </span>
                <span>
                  {t('app.attendance.excused')}: <b className="text-foreground-900">{student.attendance.excused}</b>
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title={t('app.portal.discounts')} />
            <div className="p-2">
              {student.discounts.length === 0 && <EmptyState icon="ri-coupon-2-line" label={t('app.portal.noDiscounts')} />}
              {student.discounts.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-2 px-2 py-2.5 border-b border-background-100 last:border-b-0"
                >
                  <span className="text-xs font-medium text-foreground-900 truncate">
                    {row.fee_discounts?.name ?? '—'}
                  </span>
                  <Badge tone="accent">
                    {row.fee_discounts?.discount_type === 'percent'
                      ? `${Number(row.amount ?? row.fee_discounts?.amount ?? 0)}%`
                      : formatMoney(row.amount ?? row.fee_discounts?.amount ?? 0)}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mt-3 md:mt-4">
        <Card>
          <CardHeader title={t('app.portal.invoices')} />
          <div className="p-2">
            {student.invoices.length === 0 && <EmptyState icon="ri-receipt-line" />}
            {student.invoices.slice(0, 6).map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between gap-2 px-2 py-2.5 border-b border-background-100 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground-900 truncate">{invoice.invoice_no}</p>
                  <p className="text-[11px] text-foreground-500">{formatDate(invoice.issue_date, i18n.language)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs font-semibold tabular-nums">{formatMoney(invoice.total)}</span>
                  <StatusPill value={invoice.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title={t('app.portal.yearHistory')} />
          <div className="p-2">
            {student.enrollments.length === 0 && <EmptyState icon="ri-history-line" label={t('app.enroll.empty')} />}
            {student.enrollments.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-2 px-2 py-2.5 border-b border-background-100 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground-900 truncate">
                    {row.academic_years?.name ?? '—'}
                  </p>
                  <p className="text-[11px] text-foreground-500 truncate">
                    {row.classes?.name ?? '—'} / {row.sections?.name ?? '—'}
                  </p>
                </div>
                <Badge tone={row.status === 'enrolled' ? 'accent' : 'neutral'}>
                  {t(`app.enroll.status.${row.status}`, { defaultValue: row.status })}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-3 md:mt-4">
        <CardHeader title={t('app.portal.documentsOnFile', { count: student.documents.length })} />
        <div className="p-4 flex flex-wrap gap-2">
          {student.documents.length === 0 && <EmptyState icon="ri-folder-open-line" label={t('app.docs.empty')} />}
          {student.documents.map((doc) => (
            <span
              key={doc.id}
              className="inline-flex items-center gap-1.5 border border-background-300 rounded-full px-3 py-1 text-[11px] text-foreground-700"
            >
              <i className="ri-file-text-line" />
              {doc.title || t(`app.docs.types.${doc.type}`, { defaultValue: doc.type })}
              {doc.verified ? <i className="ri-verified-badge-line text-secondary-600" /> : null}
            </span>
          ))}
        </div>
      </Card>
    </>
  );
}