import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { allotDiscount, revokeAllotment } from '@/api/fees';
import type { DiscountAllotment, FeeDiscount } from '@/api/fees';
import type { AcademicYear, SchoolClass, Section, Student } from '@/api/types';
import { formatMoney } from '@/utils/money';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  SearchBox,
  TableWrap,
  Td,
  Th,
  Row,
} from '@/components/app/ui';

interface AllotmentPanelProps {
  discounts: FeeDiscount[];
  students: Student[];
  classes: SchoolClass[];
  sections: Section[];
  years: AcademicYear[];
  allotments: DiscountAllotment[];
  onChanged: () => void;
}

export default function AllotmentPanel({
  discounts,
  students,
  classes,
  sections,
  years,
  allotments,
  onChanged,
}: AllotmentPanelProps) {
  const { t } = useTranslation();
  const [discountId, setDiscountId] = useState(discounts[0]?.id ?? '');
  const [scope, setScope] = useState<'section' | 'student'>('section');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [yearId, setYearId] = useState(years.find((year) => year.is_current)?.id ?? '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);

  const sectionsForClass = useMemo(
    () => sections.filter((section) => !classId || section.class_id === classId),
    [sections, classId],
  );

  const scopeStudents = useMemo(() => {
    if (scope === 'student') return students.filter((student) => student.id === studentId);
    return students.filter((student) => (sectionId ? student.section_id === sectionId : false));
  }, [scope, students, sectionId, studentId]);

  const filteredAllotments = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return allotments;
    return allotments.filter((row) => {
      const name = `${row.students?.first_name ?? ''} ${row.students?.last_name ?? ''}`.toLowerCase();
      return (
        name.includes(needle) ||
        (row.students?.student_no ?? '').toLowerCase().includes(needle) ||
        (row.fee_discounts?.name ?? '').toLowerCase().includes(needle)
      );
    });
  }, [allotments, query]);

  const submit = async () => {
    setError(null);
    setMessage(null);
    if (!discountId) {
      setError(t('app.discounts.pickDiscount'));
      return;
    }
    if (scopeStudents.length === 0) {
      setError(scope === 'student' ? t('app.discounts.pickStudent') : t('app.discounts.pickSection'));
      return;
    }
    setBusy(true);
    try {
      const created = await allotDiscount({
        discountId,
        studentIds: scopeStudents.map((student) => student.id),
        academicYearId: yearId || null,
        note,
      });
      setMessage(t('app.discounts.allotSuccess', { count: created }));
      setNote('');
      onChanged();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    setRevoking(id);
    try {
      await revokeAllotment(id);
      onChanged();
    } finally {
      setRevoking(null);
    }
  };

  const selectedDiscount = discounts.find((discount) => discount.id === discountId) ?? null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)] gap-3 md:gap-4">
      <Card className="p-4 h-fit">
        <h2 className="text-sm font-semibold text-foreground-900 mb-3">{t('app.discounts.allotTitle')}</h2>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="allot-discount">
              {t('app.discounts.discount')}
            </label>
            <select
              id="allot-discount"
              value={discountId}
              onChange={(event) => setDiscountId(event.target.value)}
              className={inputClass}
            >
              {discounts.map((discount) => (
                <option key={discount.id} value={discount.id}>
                  {discount.name} —{' '}
                  {discount.discount_type === 'percent'
                    ? `${Number(discount.amount)}%`
                    : formatMoney(discount.amount)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>{t('app.discounts.scope')}</span>
            <div className="inline-flex items-center gap-1 p-1 bg-background-100 border border-background-200 rounded-full">
              <button
                type="button"
                onClick={() => setScope('section')}
                className={`flex-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer ${
                  scope === 'section' ? 'bg-primary-500 text-background-50' : 'text-foreground-700'
                }`}
              >
                {t('app.discounts.scopeSection')}
              </button>
              <button
                type="button"
                onClick={() => setScope('student')}
                className={`flex-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer ${
                  scope === 'student' ? 'bg-primary-500 text-background-50' : 'text-foreground-700'
                }`}
              >
                {t('app.discounts.scopeStudent')}
              </button>
            </div>
          </div>

          {scope === 'section' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className={labelClass} htmlFor="allot-class">
                  {t('app.reports.class')}
                </label>
                <select
                  id="allot-class"
                  value={classId}
                  onChange={(event) => {
                    setClassId(event.target.value);
                    setSectionId('');
                  }}
                  className={inputClass}
                >
                  <option value="">—</option>
                  {classes.map((klass) => (
                    <option key={klass.id} value={klass.id}>
                      {klass.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className={labelClass} htmlFor="allot-section">
                  {t('app.reports.section')}
                </label>
                <select
                  id="allot-section"
                  value={sectionId}
                  onChange={(event) => setSectionId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">—</option>
                  {sectionsForClass.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="allot-student">
                {t('app.fees.student')}
              </label>
              <select
                id="allot-student"
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                className={inputClass}
              >
                <option value="">—</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.first_name} {student.last_name ?? ''} — {student.student_no ?? ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="allot-year">
              {t('app.enroll.year')}
            </label>
            <select
              id="allot-year"
              value={yearId}
              onChange={(event) => setYearId(event.target.value)}
              className={inputClass}
            >
              <option value="">{t('app.common.optional')}</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="allot-note">
              {t('app.common.notes')}
            </label>
            <input
              id="allot-note"
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={inputClass}
            />
          </div>

          <p className="text-[11px] text-foreground-600 bg-background-100 border border-background-200 rounded-md px-3 py-2">
            {t('app.discounts.willApply', {
              count: scopeStudents.length,
              name: selectedDiscount?.name ?? '—',
            })}
          </p>

          {error && (
            <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          {message && (
            <p className="text-xs text-secondary-900 bg-secondary-100 border border-secondary-200 rounded-md px-3 py-2">
              {message}
            </p>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="inline-flex items-center justify-center gap-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-4 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
          >
            <i className="ri-gift-line" />
            {busy ? t('app.common.saving') : t('app.discounts.allot')}
          </button>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={t('app.discounts.allottedList', { count: allotments.length })}
          action={
            <div className="w-full sm:w-64">
              <SearchBox value={query} onChange={setQuery} />
            </div>
          }
        />
        {/* Phones: one card per holder instead of the wide table. */}
        {filteredAllotments.length > 0 ? (
          <div className="md:hidden divide-y divide-background-100">
            {filteredAllotments.map((row) => (
              <div key={row.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground-950 truncate">
                      {row.students?.first_name} {row.students?.last_name ?? ''}
                    </p>
                    <p className="text-[11px] text-foreground-500 tabular-nums truncate">
                      {row.students?.student_no ?? '—'} · {row.students?.sections?.classes?.name ?? '—'} /{' '}
                      {row.students?.sections?.name ?? '—'}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-foreground-950 tabular-nums shrink-0 whitespace-nowrap">
                    {row.fee_discounts?.discount_type === 'percent'
                      ? `${Number(row.amount ?? row.fee_discounts?.amount ?? 0)}%`
                      : formatMoney(row.amount ?? row.fee_discounts?.amount ?? 0)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <Badge tone="accent">{row.fee_discounts?.name ?? '—'}</Badge>
                  <button
                    type="button"
                    disabled={revoking === row.id}
                    onClick={() => void revoke(row.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-background-300 px-2.5 py-1.5 text-[11px] font-semibold text-primary-700 whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    <i className="ri-delete-bin-line text-sm" />
                    {t('app.common.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {filteredAllotments.length === 0 ? (
          <EmptyState icon="ri-gift-line" label={t('app.discounts.noAllotments')} />
        ) : (
          <TableWrap className="hidden md:block">
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th>{t('app.fees.student')}</Th>
                <Th>{t('app.discounts.discount')}</Th>
                <Th>{t('app.reports.section')}</Th>
                <Th>{t('app.discounts.value')}</Th>
                <Th>{t('app.common.actions')}</Th>
              </tr>
            </thead>
            <tbody>
              {filteredAllotments.map((row) => (
                <Row key={row.id}>
                  <Td className="whitespace-nowrap">
                    <p className="text-sm font-medium text-foreground-950">
                      {row.students?.first_name} {row.students?.last_name ?? ''}
                    </p>
                    <p className="text-[11px] text-foreground-500">{row.students?.student_no ?? '—'}</p>
                  </Td>
                  <Td>
                    <Badge tone="accent">{row.fee_discounts?.name ?? '—'}</Badge>
                  </Td>
                  <Td className="text-xs whitespace-nowrap">
                    {row.students?.sections?.classes?.name ?? '—'} / {row.students?.sections?.name ?? '—'}
                  </Td>
                  <Td className="text-xs font-semibold tabular-nums whitespace-nowrap">
                    {row.fee_discounts?.discount_type === 'percent'
                      ? `${Number(row.amount ?? row.fee_discounts?.amount ?? 0)}%`
                      : formatMoney(row.amount ?? row.fee_discounts?.amount ?? 0)}
                  </Td>
                  <Td>
                    <button
                      type="button"
                      disabled={revoking === row.id}
                      onClick={() => void revoke(row.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-md border border-background-300 text-primary-700 hover:border-primary-400 disabled:opacity-50 cursor-pointer"
                      aria-label={t('app.common.delete')}
                    >
                      <i className="ri-delete-bin-line text-sm" />
                    </button>
                  </Td>
                </Row>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}