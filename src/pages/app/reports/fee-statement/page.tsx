import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import {
  fetchClasses,
  fetchFeeHeads,
  fetchGuardianLinks,
  fetchInstitution,
  fetchInvoiceItems,
  fetchInvoices,
  fetchPayments,
  fetchSections,
  fetchStudents,
} from '@/api/college';
import type { StudentRow } from '@/api/college';
import { formatMoney, toNumber } from '@/utils/money';
import { formatDate } from '@/utils/date';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import ExportBar from '@/components/app/ExportBar';
import PrintSheet from '@/components/app/PrintSheet';
import {
  Card,
  CardHeader,
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
import ReportDocument from '../components/ReportDocument';

const round2 = (value: number) => Math.round(value * 100) / 100;

interface StatementRow {
  key: string;
  feeGroup: string;
  feeCode: string;
  dueDate: string | null;
  status: string;
  amount: number;
  paymentRef: string;
  method: string;
  paidOn: string;
  discount: number;
  paid: number;
  balance: number;
}

export default function FeeStatementReportPage() {
  const { t, i18n } = useTranslation();

  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('all');
  const [studentId, setStudentId] = useState('');
  const [printing, setPrinting] = useState(false);

  const state = useAsync(async () => {
    const [students, invoices, items, payments, heads, links, classes, sections, institution] =
      await Promise.all([
        fetchStudents(),
        fetchInvoices(),
        fetchInvoiceItems(),
        fetchPayments(),
        fetchFeeHeads(),
        fetchGuardianLinks(),
        fetchClasses(),
        fetchSections(),
        fetchInstitution(),
      ]);
    return { students, invoices, items, payments, heads, links, classes, sections, institution };
  }, []);

  const students = state.data?.students ?? [];
  const classes = state.data?.classes ?? [];
  const sections = state.data?.sections ?? [];

  // Land on the first class once the data arrives.
  useEffect(() => {
    if (classId || classes.length === 0) return;
    setClassId(classes[0].id);
  }, [classes, classId]);

  const sectionOptions = useMemo(
    () => sections.filter((section) => !classId || section.class_id === classId),
    [sections, classId],
  );

  const scopeStudents = useMemo(
    () =>
      students.filter((student) => {
        if (classId && student.sections?.classes?.id !== classId) return false;
        if (sectionId !== 'all' && student.section_id !== sectionId) return false;
        return true;
      }),
    [students, classId, sectionId],
  );

  // Keep a valid student selected for the current class / section.
  useEffect(() => {
    if (scopeStudents.length === 0) {
      if (studentId) setStudentId('');
      return;
    }
    if (!scopeStudents.some((student) => student.id === studentId)) {
      setStudentId(scopeStudents[0].id);
    }
  }, [scopeStudents, studentId]);

  const student: StudentRow | null = useMemo(
    () => students.find((item) => item.id === studentId) ?? null,
    [students, studentId],
  );

  const guardian = useMemo(() => {
    const links = (state.data?.links ?? []).filter((link) => link.student_id === studentId);
    const father = links.find((link) => link.guardians?.relation === 'father');
    const primary = links.find((link) => link.is_primary);
    return father?.guardians ?? primary?.guardians ?? links[0]?.guardians ?? null;
  }, [state.data, studentId]);

  const feeHeadMap = useMemo(
    () => new Map((state.data?.heads ?? []).map((head) => [head.id, head])),
    [state.data],
  );

  /** Item-level statement rows: one line per billable item on every invoice. */
  const statement = useMemo(() => {
    const invoices = (state.data?.invoices ?? []).filter((invoice) => invoice.student_id === studentId);
    const items = state.data?.items ?? [];
    const payments = state.data?.payments ?? [];

    const rows: StatementRow[] = invoices.flatMap((invoice) => {
      const invoiceItems = items.filter((item) => item.invoice_id === invoice.id);
      const invoicePayments = payments.filter((payment) => payment.invoice_id === invoice.id);
      const itemsTotal = invoiceItems.reduce((sum, item) => sum + toNumber(item.amount), 0);
      const discountTotal = toNumber(invoice.discount);
      const paidTotal = invoicePayments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
      const firstPayment = invoicePayments[0];

      const lines = invoiceItems.length > 0 ? invoiceItems : [];

      return lines.map((item, index) => {
        const amount = toNumber(item.amount);
        const ratio = itemsTotal > 0 ? amount / itemsTotal : 0;
        const head = item.fee_head_id ? feeHeadMap.get(item.fee_head_id) : null;
        return {
          key: item.id,
          feeGroup: head?.category ?? t('app.feeStmt.otherGroup'),
          feeCode: head?.code || head?.name || item.description,
          dueDate: invoice.due_date,
          status: invoice.status,
          amount: round2(amount),
          paymentRef: index === 0 ? firstPayment?.receipt_no ?? '' : '',
          method: index === 0 ? firstPayment?.method ?? '' : '',
          paidOn: index === 0 ? firstPayment?.paid_at ?? '' : '',
          discount: round2(discountTotal * ratio),
          paid: round2(paidTotal * ratio),
          balance: round2(amount - discountTotal * ratio - paidTotal * ratio),
        };
      });
    });

    return rows;
  }, [state.data, studentId, feeHeadMap, t]);

  const invoiceCount = useMemo(
    () => (state.data?.invoices ?? []).filter((invoice) => invoice.student_id === studentId).length,
    [state.data, studentId],
  );

  const totals = statement.reduce(
    (acc, row) => ({
      amount: round2(acc.amount + row.amount),
      discount: round2(acc.discount + row.discount),
      paid: round2(acc.paid + row.paid),
      balance: round2(acc.balance + row.balance),
    }),
    { amount: 0, discount: 0, paid: 0, balance: 0 },
  );

  const methodLabel = (method: string) =>
    method ? t(`app.expenses.pay.${method}`, { defaultValue: method }) : '—';

  const columns = [
    t('app.feeStmt.feeGroup'),
    t('app.feeStmt.feeCode'),
    t('app.fees.dueDate'),
    t('app.common.status'),
    t('app.fees.amount'),
    t('app.feeStmt.paymentId'),
    t('app.fees.method'),
    t('app.common.date'),
    t('app.fees.discount'),
    t('app.fees.paid'),
    t('app.fees.balance'),
  ];

  const exportRows = statement.map((row) => [
    row.feeGroup,
    row.feeCode,
    row.dueDate ?? '',
    t(`app.status.${row.status}`, { defaultValue: row.status }),
    row.amount,
    row.paymentRef,
    methodLabel(row.method),
    row.paidOn ? row.paidOn.slice(0, 10) : '',
    row.discount,
    row.paid,
    row.balance,
  ]);

  const classLabel = classes.find((item) => item.id === classId)?.name ?? t('app.common.all');
  const sectionLabel =
    sectionId === 'all'
      ? t('app.common.all')
      : sections.find((item) => item.id === sectionId)?.name ?? t('app.common.all');

  const studentName = student ? `${student.first_name} ${student.last_name ?? ''}`.trim() : '—';

  if (state.loading) return <LoadingBlock />;
  if (state.error || !state.data) {
    return <ErrorState message={state.error ?? t('app.common.errorDesc')} onRetry={state.reload} />;
  }

  return (
    <>
      <PageHeader
        title={t('app.feeStmt.title')}
        subtitle={t('app.feeStmt.subtitle')}
        action={
          <>
            <ExportBar
              title={`${t('app.feeStmt.title')} — ${studentName}`}
              fileName={`fee-statement-${student?.student_no ?? 'student'}`}
              columns={columns}
              rows={exportRows}
              hint={`${classLabel} · ${sectionLabel}`}
              summary={[
                { label: t('app.fees.paid'), value: formatMoney(totals.paid) },
                { label: t('app.fees.balance'), value: formatMoney(totals.balance) },
              ]}
            />
            <button
              type="button"
              onClick={() => setPrinting(true)}
              disabled={!student || statement.length === 0}
              className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-printer-line" />
              {t('app.feeStmt.print')}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.feeStmt.invoiced')} value={formatMoney(totals.amount)} icon="ri-receipt-line" tone="primary" />
        <StatCard label={t('app.fees.discount')} value={formatMoney(totals.discount)} icon="ri-coupon-2-line" tone="accent" />
        <StatCard label={t('app.fees.paid')} value={formatMoney(totals.paid)} icon="ri-hand-coin-line" tone="secondary" />
        <StatCard label={t('app.fees.balance')} value={formatMoney(totals.balance)} icon="ri-alarm-warning-line" tone="danger" />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="stmt-class">
              {t('app.reports.class')}
            </label>
            <select
              id="stmt-class"
              value={classId}
              onChange={(event) => {
                setClassId(event.target.value);
                setSectionId('all');
              }}
              className={inputClass}
            >
              {classes.length === 0 && <option value="">{t('app.common.noData')}</option>}
              {classes.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="stmt-section">
              {t('app.reports.section')}
            </label>
            <select
              id="stmt-section"
              value={sectionId}
              onChange={(event) => setSectionId(event.target.value)}
              className={inputClass}
            >
              <option value="all">{t('app.common.all')}</option>
              {sectionOptions.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="stmt-student">
              {t('app.fees.student')}
            </label>
            <select
              id="stmt-student"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              className={inputClass}
            >
              {scopeStudents.length === 0 && <option value="">{t('app.common.noData')}</option>}
              {scopeStudents.map((item) => (
                <option key={item.id} value={item.id}>
                  {`${item.first_name} ${item.last_name ?? ''}`.trim()}
                  {item.student_no ? ` · ${item.student_no}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {!student ? (
        <Card>
          <EmptyState label={t('app.reports.noStudents')} icon="ri-user-search-line" />
        </Card>
      ) : (
        <Card>
          <CardHeader title={`${studentName} · ${student.student_no ?? '—'}`} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 px-4 md:px-5 py-4 border-b border-background-200">
            {[
              { label: t('app.students.studentNo'), value: student.student_no ?? '—' },
              { label: t('app.students.guardianCol'), value: guardian?.full_name ?? '—' },
              { label: t('app.reports.class'), value: `${student.sections?.classes?.name ?? '—'} / ${student.sections?.name ?? '—'}` },
              { label: t('app.common.phone'), value: student.mobile ?? guardian?.phone ?? '—' },
              { label: t('app.students.nationality'), value: student.nationality ?? '—' },
              { label: t('app.feeStmt.category'), value: student.category ?? '—' },
              { label: t('app.feeStmt.admissionDate'), value: student.admission_date ? formatDate(student.admission_date, i18n.language) : '—' },
              { label: t('app.fees.invoices'), value: String(invoiceCount || '—') },
            ].map((item) => (
              <div key={item.label} className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-500">{item.label}</p>
                <p className="text-xs text-foreground-900 mt-0.5 truncate">{item.value}</p>
              </div>
            ))}
          </div>

          {statement.length === 0 ? (
            <EmptyState label={t('app.feeStmt.noInvoices')} icon="ri-receipt-line" />
          ) : (
            <TableWrap>
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  {columns.map((column) => (
                    <Th key={column}>{column}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {statement.map((row) => (
                  <Row key={row.key}>
                    <Td className="text-xs whitespace-nowrap">{row.feeGroup}</Td>
                    <Td className="text-xs whitespace-nowrap">{row.feeCode}</Td>
                    <Td className="text-xs whitespace-nowrap">
                      {row.dueDate ? formatDate(row.dueDate, i18n.language) : '—'}
                    </Td>
                    <Td className="text-xs whitespace-nowrap">
                      {t(`app.status.${row.status}`, { defaultValue: row.status })}
                    </Td>
                    <Td className="text-xs tabular-nums whitespace-nowrap">{formatMoney(row.amount)}</Td>
                    <Td className="text-[11px] text-foreground-500 whitespace-nowrap">{row.paymentRef || '—'}</Td>
                    <Td className="text-xs whitespace-nowrap">{row.method ? methodLabel(row.method) : '—'}</Td>
                    <Td className="text-xs whitespace-nowrap">
                      {row.paidOn ? row.paidOn.slice(0, 10) : '—'}
                    </Td>
                    <Td className="text-xs tabular-nums whitespace-nowrap text-accent-800">{formatMoney(row.discount)}</Td>
                    <Td className="text-xs tabular-nums whitespace-nowrap text-secondary-700">{formatMoney(row.paid)}</Td>
                    <Td className="text-xs tabular-nums whitespace-nowrap font-semibold">{formatMoney(row.balance)}</Td>
                  </Row>
                ))}
                <tr className="bg-background-100 border-t-2 border-background-300">
                  <Td className="text-xs font-bold" />
                  <Td className="text-xs font-bold" />
                  <Td className="text-xs font-bold" />
                  <Td className="text-xs font-bold" />
                  <Td className="text-xs font-bold tabular-nums">{formatMoney(totals.amount)}</Td>
                  <Td className="text-xs font-bold" />
                  <Td className="text-xs font-bold" />
                  <Td className="text-xs font-bold" />
                  <Td className="text-xs font-bold tabular-nums">{formatMoney(totals.discount)}</Td>
                  <Td className="text-xs font-bold tabular-nums">{formatMoney(totals.paid)}</Td>
                  <Td className="text-xs font-bold tabular-nums">{formatMoney(totals.balance)}</Td>
                </tr>
              </tbody>
            </TableWrap>
          )}
        </Card>
      )}

      {printing && student && (
        <PrintSheet title={t('app.feeStmt.print')} hint={t('app.feeStmt.printHint')} onClose={() => setPrinting(false)}>
          <ReportDocument
            institution={state.data.institution}
            title={t('app.feeStmt.docTitle')}
            subtitle={t('app.feeStmt.docSubtitle')}
            meta={[
              { label: t('app.fees.student'), value: studentName },
              { label: t('app.students.studentNo'), value: student.student_no ?? '—' },
              { label: t('app.students.guardianCol'), value: guardian?.full_name ?? '—' },
              {
                label: t('app.reports.class'),
                value: `${student.sections?.classes?.name ?? '—'} / ${student.sections?.name ?? '—'}`,
              },
              { label: t('app.feeStmt.category'), value: student.category ?? '—' },
              { label: t('app.common.phone'), value: student.mobile ?? guardian?.phone ?? '—' },
            ]}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-background-100">
                  {columns.map((column) => (
                    <th
                      key={column}
                      className="text-start text-[9px] font-bold uppercase tracking-wide text-foreground-700 px-1.5 py-1.5 border-b border-background-300 whitespace-nowrap"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {statement.map((row) => (
                  <tr key={row.key}>
                    <td className="px-1.5 py-1 text-[9px] border-b border-background-200 whitespace-nowrap">{row.feeGroup}</td>
                    <td className="px-1.5 py-1 text-[9px] border-b border-background-200 whitespace-nowrap">{row.feeCode}</td>
                    <td className="px-1.5 py-1 text-[9px] border-b border-background-200 whitespace-nowrap">
                      {row.dueDate ?? '—'}
                    </td>
                    <td className="px-1.5 py-1 text-[9px] border-b border-background-200 whitespace-nowrap">
                      {t(`app.status.${row.status}`, { defaultValue: row.status })}
                    </td>
                    <td className="px-1.5 py-1 text-[9px] border-b border-background-200 tabular-nums">{row.amount}</td>
                    <td className="px-1.5 py-1 text-[9px] border-b border-background-200 whitespace-nowrap">
                      {row.paymentRef || '—'}
                    </td>
                    <td className="px-1.5 py-1 text-[9px] border-b border-background-200 whitespace-nowrap">
                      {row.method ? methodLabel(row.method) : '—'}
                    </td>
                    <td className="px-1.5 py-1 text-[9px] border-b border-background-200 whitespace-nowrap">
                      {row.paidOn ? row.paidOn.slice(0, 10) : '—'}
                    </td>
                    <td className="px-1.5 py-1 text-[9px] border-b border-background-200 tabular-nums">{row.discount}</td>
                    <td className="px-1.5 py-1 text-[9px] border-b border-background-200 tabular-nums">{row.paid}</td>
                    <td className="px-1.5 py-1 text-[9px] border-b border-background-200 tabular-nums font-semibold">
                      {row.balance}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4} className="px-1.5 py-1.5 text-[10px] font-bold border-t border-foreground-900">
                    {t('app.common.total')}
                  </td>
                  <td className="px-1.5 py-1.5 text-[10px] font-bold border-t border-foreground-900 tabular-nums">
                    {formatMoney(totals.amount)}
                  </td>
                  <td className="border-t border-foreground-900" colSpan={3} />
                  <td className="px-1.5 py-1.5 text-[10px] font-bold border-t border-foreground-900 tabular-nums">
                    {formatMoney(totals.discount)}
                  </td>
                  <td className="px-1.5 py-1.5 text-[10px] font-bold border-t border-foreground-900 tabular-nums">
                    {formatMoney(totals.paid)}
                  </td>
                  <td className="px-1.5 py-1.5 text-[10px] font-bold border-t border-foreground-900 tabular-nums">
                    {formatMoney(totals.balance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </ReportDocument>
        </PrintSheet>
      )}
    </>
  );
}