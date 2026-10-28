import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import {
  fetchClasses,
  fetchGuardianLinks,
  fetchInstitution,
  fetchInvoices,
  fetchSections,
  fetchStudents,
} from '@/api/college';
import { formatMoney, toNumber } from '@/utils/money';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import ExportBar from '@/components/app/ExportBar';
import PrintSheet from '@/components/app/PrintSheet';
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Row,
  SearchBox,
  StatCard,
  TableWrap,
  Td,
  Th,
} from '@/components/app/ui';
import ReportDocument from '../components/ReportDocument';

const round2 = (value: number) => Math.round(value * 100) / 100;

interface BalanceRow {
  id: string;
  name: string;
  studentNo: string;
  guardian: string;
  classSection: string;
  fees: number;
  discount: number;
  paid: number;
  balance: number;
}

export default function BalanceFeesReportPage() {
  const { t } = useTranslation();

  const [classId, setClassId] = useState('all');
  const [sectionId, setSectionId] = useState('all');
  const [query, setQuery] = useState('');
  const [onlyOwing, setOnlyOwing] = useState(false);
  const [printing, setPrinting] = useState(false);

  const state = useAsync(async () => {
    const [students, invoices, links, classes, sections, institution] = await Promise.all([
      fetchStudents(),
      fetchInvoices(),
      fetchGuardianLinks(),
      fetchClasses(),
      fetchSections(),
      fetchInstitution(),
    ]);
    return { students, invoices, links, classes, sections, institution };
  }, []);

  const students = state.data?.students ?? [];
  const classes = state.data?.classes ?? [];
  const sections = state.data?.sections ?? [];

  useEffect(() => {
    setSectionId('all');
  }, [classId]);

  const sectionOptions = useMemo(
    () => sections.filter((section) => classId === 'all' || section.class_id === classId),
    [sections, classId],
  );

  const guardianByStudent = useMemo(() => {
    const primary = new Map<string, string>();
    const fallback = new Map<string, string>();
    (state.data?.links ?? []).forEach((link) => {
      if (!link.guardians) return;
      if (link.is_primary) primary.set(link.student_id, link.guardians.full_name);
      else if (!fallback.has(link.student_id)) fallback.set(link.student_id, link.guardians.full_name);
    });
    fallback.forEach((name, id) => {
      if (!primary.has(id)) primary.set(id, name);
    });
    return primary;
  }, [state.data]);

  /** One row per student, rolled up from every invoice they hold. */
  const rows = useMemo<BalanceRow[]>(() => {
    const invoices = state.data?.invoices ?? [];
    const byStudent = new Map<string, { fees: number; discount: number; paid: number }>();

    invoices.forEach((invoice) => {
      if (invoice.status === 'void') return;
      const current = byStudent.get(invoice.student_id) ?? { fees: 0, discount: 0, paid: 0 };
      current.fees = round2(current.fees + toNumber(invoice.subtotal));
      current.discount = round2(current.discount + toNumber(invoice.discount));
      current.paid = round2(
        current.paid + (invoice.payments ?? []).reduce((sum, payment) => sum + toNumber(payment.amount), 0),
      );
      byStudent.set(invoice.student_id, current);
    });

    const source = invoices.length > 0 ? students.filter((student) => byStudent.has(student.id)) : students;

    return source
      .filter((student) => {
        if (classId !== 'all' && student.sections?.classes?.id !== classId) return false;
        if (sectionId !== 'all' && student.section_id !== sectionId) return false;
        return true;
      })
      .map((student) => {
        const totals = byStudent.get(student.id) ?? { fees: 0, discount: 0, paid: 0 };
        const balance = round2(totals.fees - totals.discount - totals.paid);
        return {
          id: student.id,
          name: `${student.first_name} ${student.last_name ?? ''}`.trim(),
          studentNo: student.student_no ?? '',
          guardian: guardianByStudent.get(student.id) ?? '',
          classSection: `${student.sections?.classes?.name ?? '—'} / ${student.sections?.name ?? '—'}`,
          fees: totals.fees,
          discount: totals.discount,
          paid: totals.paid,
          balance,
        };
      })
      .filter((row) => {
        if (onlyOwing && row.balance <= 0.5) return false;
        const needle = query.trim().toLowerCase();
        if (!needle) return true;
        return (
          row.name.toLowerCase().includes(needle) ||
          row.studentNo.toLowerCase().includes(needle) ||
          row.guardian.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => b.balance - a.balance);
  }, [state.data, students, classId, sectionId, query, onlyOwing, guardianByStudent]);

  const totals = rows.reduce(
    (acc, row) => ({
      fees: round2(acc.fees + row.fees),
      discount: round2(acc.discount + row.discount),
      paid: round2(acc.paid + row.paid),
      balance: round2(acc.balance + row.balance),
    }),
    { fees: 0, discount: 0, paid: 0, balance: 0 },
  );

  const columns = [
    t('app.fees.student'),
    t('app.students.studentNo'),
    t('app.students.guardianCol'),
    t('app.reports.class'),
    t('app.balFees.totalFees'),
    t('app.fees.discount'),
    t('app.fees.paid'),
    t('app.fees.balance'),
  ];

  const exportRows = rows.map((row) => [
    row.name,
    row.studentNo,
    row.guardian,
    row.classSection,
    row.fees,
    row.discount,
    row.paid,
    row.balance,
  ]);

  const classLabel = classes.find((item) => item.id === classId)?.name ?? t('app.common.all');
  const sectionLabel =
    sectionId === 'all' ? t('app.common.all') : sections.find((item) => item.id === sectionId)?.name ?? '';

  if (state.loading) return <LoadingBlock />;
  if (state.error || !state.data) {
    return <ErrorState message={state.error ?? t('app.common.errorDesc')} onRetry={state.reload} />;
  }

  const table = (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-background-100">
          {columns.map((column, index) => (
            <th
              key={column}
              className={`text-[9px] font-bold uppercase tracking-wide text-foreground-700 px-1.5 py-1.5 border-b border-background-300 whitespace-nowrap ${
                index >= 4 ? 'text-end' : 'text-start'
              }`}
            >
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="px-1.5 py-1 text-[9px] border-b border-background-200 whitespace-nowrap">{row.name}</td>
            <td className="px-1.5 py-1 text-[9px] border-b border-background-200 whitespace-nowrap">{row.studentNo}</td>
            <td className="px-1.5 py-1 text-[9px] border-b border-background-200 whitespace-nowrap">{row.guardian || '—'}</td>
            <td className="px-1.5 py-1 text-[9px] border-b border-background-200 whitespace-nowrap">{row.classSection}</td>
            <td className="px-1.5 py-1 text-[9px] text-end border-b border-background-200 tabular-nums">{row.fees}</td>
            <td className="px-1.5 py-1 text-[9px] text-end border-b border-background-200 tabular-nums">{row.discount}</td>
            <td className="px-1.5 py-1 text-[9px] text-end border-b border-background-200 tabular-nums">{row.paid}</td>
            <td className="px-1.5 py-1 text-[9px] text-end border-b border-background-200 tabular-nums font-semibold">
              {row.balance}
            </td>
          </tr>
        ))}
        <tr>
          <td colSpan={4} className="px-1.5 py-1.5 text-[10px] font-bold border-t border-foreground-900">
            {t('app.common.total')}
          </td>
          <td className="px-1.5 py-1.5 text-[10px] text-end font-bold border-t border-foreground-900 tabular-nums">
            {formatMoney(totals.fees)}
          </td>
          <td className="px-1.5 py-1.5 text-[10px] text-end font-bold border-t border-foreground-900 tabular-nums">
            {formatMoney(totals.discount)}
          </td>
          <td className="px-1.5 py-1.5 text-[10px] text-end font-bold border-t border-foreground-900 tabular-nums">
            {formatMoney(totals.paid)}
          </td>
          <td className="px-1.5 py-1.5 text-[10px] text-end font-bold border-t border-foreground-900 tabular-nums">
            {formatMoney(totals.balance)}
          </td>
        </tr>
      </tbody>
    </table>
  );

  return (
    <>
      <PageHeader
        title={t('app.balFees.title')}
        subtitle={t('app.balFees.subtitle')}
        action={
          <>
            <ExportBar
              title={`${t('app.balFees.title')} — ${classLabel}`}
              fileName={`balance-fees-${classLabel}`}
              columns={columns}
              rows={exportRows}
              hint={`${classLabel} · ${sectionLabel}`}
              summary={[
                { label: t('app.balFees.totalFees'), value: formatMoney(totals.fees) },
                { label: t('app.fees.paid'), value: formatMoney(totals.paid) },
                { label: t('app.fees.balance'), value: formatMoney(totals.balance) },
              ]}
            />
            <button
              type="button"
              onClick={() => setPrinting(true)}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-printer-line" />
              {t('app.print.printRecord')}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.balFees.totalFees')} value={formatMoney(totals.fees)} icon="ri-receipt-line" tone="primary" />
        <StatCard label={t('app.fees.discount')} value={formatMoney(totals.discount)} icon="ri-coupon-2-line" tone="accent" />
        <StatCard label={t('app.fees.paid')} value={formatMoney(totals.paid)} icon="ri-hand-coin-line" tone="secondary" />
        <StatCard label={t('app.fees.balance')} value={formatMoney(totals.balance)} icon="ri-alarm-warning-line" tone="danger" />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="bal-class">
              {t('app.reports.class')}
            </label>
            <select
              id="bal-class"
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              className={inputClass}
            >
              <option value="all">{t('app.common.all')}</option>
              {classes.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="bal-section">
              {t('app.reports.section')}
            </label>
            <select
              id="bal-section"
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
            <label className={labelClass} htmlFor="bal-search">
              {t('app.common.search')}
            </label>
            <div id="bal-search">
              <SearchBox value={query} onChange={setQuery} />
            </div>
          </div>

          <div className="flex items-end min-w-0">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground-800 cursor-pointer pb-3">
              <input
                type="checkbox"
                checked={onlyOwing}
                onChange={(event) => setOnlyOwing(event.target.checked)}
                className="w-4 h-4 rounded border-background-400 text-primary-500 focus:ring-primary-400 cursor-pointer"
              />
              {t('app.balFees.onlyOwing')}
            </label>
          </div>
        </div>
      </Card>

      <Card>
        {rows.length === 0 ? (
          <EmptyState label={t('app.balFees.empty')} icon="ri-checkbox-circle-line" />
        ) : (
          <TableWrap>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th>{t('app.fees.student')}</Th>
                <Th>{t('app.students.studentNo')}</Th>
                <Th>{t('app.students.guardianCol')}</Th>
                <Th>{t('app.reports.class')}</Th>
                <Th>{t('app.balFees.totalFees')}</Th>
                <Th>{t('app.fees.discount')}</Th>
                <Th>{t('app.fees.paid')}</Th>
                <Th>{t('app.fees.balance')}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Row key={row.id}>
                  <Td>
                    <p className="text-sm font-medium text-foreground-950 truncate max-w-[180px]">{row.name}</p>
                  </Td>
                  <Td className="text-xs tabular-nums whitespace-nowrap">{row.studentNo || '—'}</Td>
                  <Td className="text-xs truncate max-w-[160px]">{row.guardian || '—'}</Td>
                  <Td className="text-xs whitespace-nowrap">{row.classSection}</Td>
                  <Td className="text-xs tabular-nums whitespace-nowrap">{formatMoney(row.fees)}</Td>
                  <Td className="text-xs tabular-nums whitespace-nowrap text-accent-800">{formatMoney(row.discount)}</Td>
                  <Td className="text-xs tabular-nums whitespace-nowrap text-secondary-700">{formatMoney(row.paid)}</Td>
                  <Td className="text-xs font-semibold tabular-nums whitespace-nowrap">{formatMoney(row.balance)}</Td>
                </Row>
              ))}
              <tr className="bg-background-100 border-t-2 border-background-300">
                <Td className="text-xs font-bold" />
                <Td className="text-xs font-bold" />
                <Td className="text-xs font-bold" />
                <Td className="text-xs font-bold">{t('app.common.total')}</Td>
                <Td className="text-xs font-bold tabular-nums">{formatMoney(totals.fees)}</Td>
                <Td className="text-xs font-bold tabular-nums">{formatMoney(totals.discount)}</Td>
                <Td className="text-xs font-bold tabular-nums">{formatMoney(totals.paid)}</Td>
                <Td className="text-xs font-bold tabular-nums">{formatMoney(totals.balance)}</Td>
              </tr>
            </tbody>
          </TableWrap>
        )}
      </Card>

      {printing && (
        <PrintSheet
          title={t('app.balFees.title')}
          hint={`${classLabel} · ${sectionLabel}`}
          onClose={() => setPrinting(false)}
        >
          <ReportDocument
            institution={state.data.institution}
            title={t('app.balFees.docTitle')}
            subtitle={t('app.balFees.docSubtitle')}
            meta={[
              { label: t('app.reports.class'), value: classLabel },
              { label: t('app.reports.section'), value: sectionLabel },
              { label: t('app.balFees.students'), value: String(rows.length) },
              { label: t('app.fees.balance'), value: formatMoney(totals.balance) },
            ]}
          >
            {table}
          </ReportDocument>
        </PrintSheet>
      )}
    </>
  );
}