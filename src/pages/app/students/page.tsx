import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { fetchClasses, fetchGuardianLinks, fetchInstitution, fetchInvoices, fetchSections, fetchStudents } from '@/api/college';
import type { StudentRow } from '@/api/college';
import PrintSheet from '@/components/app/PrintSheet';
import ExportBar from '@/components/app/ExportBar';
import {
  Avatar,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Row,
  SearchBox,
  StatusPill,
  TableWrap,
  Td,
  Th,
} from '@/components/app/ui';
import AddStudentModal from './components/AddStudentModal';
import StudentIdCard from './components/StudentIdCard';
import StudentProfileModal from './components/StudentProfileModal';

const WRITE_ROLES = ['super_admin', 'admin'];
const FAMILY_ROLES = ['super_admin', 'admin', 'receptionist', 'accountant'];

export default function StudentsPage() {
  const { t } = useTranslation();
  const { role } = useAuth();
  const canWrite = role ? WRITE_ROLES.includes(role) : false;
  const canSeeFamily = role ? FAMILY_ROLES.includes(role) : false;
  const [query, setQuery] = useState('');
  const [searchParams] = useSearchParams();

  // Arriving from the phone header search: seed the box with that term.
  useEffect(() => {
    const seed = searchParams.get('q');
    if (seed !== null) setQuery(seed);
  }, [searchParams]);
  const [classFilter, setClassFilter] = useState('all');
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [cardFor, setCardFor] = useState<StudentRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const state = useAsync(async () => {
    const [students, links, classes, sections, institution, invoices] = await Promise.all([
      fetchStudents(),
      fetchGuardianLinks(),
      fetchClasses(),
      fetchSections(),
      fetchInstitution(),
      fetchInvoices(),
    ]);
    return { students, links, classes, sections, institution, invoices };
  }, []);

  const guardianByStudent = useMemo(() => {
    const map = new Map<string, { name: string; phone: string | null; relation: string }>();
    (state.data?.links ?? []).forEach((link) => {
      if (link.guardians) {
        map.set(link.student_id, {
          name: link.guardians.full_name,
          phone: link.guardians.phone,
          relation: link.guardians.relation,
        });
      }
    });
    return map;
  }, [state.data]);

  const rows = useMemo(() => {
    const list = state.data?.students ?? [];
    const needle = query.trim().toLowerCase();
    return list.filter((student) => {
      const fullName = `${student.first_name} ${student.last_name ?? ''} ${student.first_name_ar ?? ''}`.toLowerCase();
      const matchesQuery =
        !needle || fullName.includes(needle) || (student.student_no ?? '').toLowerCase().includes(needle);
      const matchesClass = classFilter === 'all' || student.sections?.classes?.id === classFilter;
      return matchesQuery && matchesClass;
    });
  }, [state.data, query, classFilter]);

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  const classes = state.data?.classes ?? [];

  return (
    <>
      <PageHeader
        title={t('app.students.title')}
        subtitle={`${rows.length} ${t('app.students.count')} · ${t('app.students.subtitle')}`}
        action={
          <>
            <ExportBar
              title={`${t('app.students.title')} — ${t('app.nav.brand')}`}
              fileName="student-register"
              columns={[
                t('app.common.name'),
                t('app.students.studentNo'),
                t('app.students.classCol'),
                t('app.students.sectionCol'),
                t('app.students.guardianCol'),
                t('app.students.guardianPhone'),
                t('app.common.status'),
              ]}
              rows={rows.map((student) => {
                const guardian = guardianByStudent.get(student.id);
                return [
                  `${student.first_name} ${student.last_name ?? ''}`.trim(),
                  student.student_no ?? '',
                  student.sections?.classes?.name ?? '',
                  student.sections?.name ?? '',
                  guardian?.name ?? '',
                  guardian?.phone ?? '',
                  t(`app.status.${student.status}`, { defaultValue: student.status }),
                ];
              })}
              summary={[{ label: t('app.students.count'), value: String(rows.length) }]}
            />
            {canWrite ? (
              <button
                type="button"
                onClick={() => {
                  setNotice(null);
                  setAddOpen(true);
                }}
                className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
              >
                <i className="ri-user-add-line" />
                {t('app.students.addStudent')}
              </button>
            ) : null}
          </>
        }
      />

      {notice && (
        <div className="mb-3 rounded-md border border-secondary-200 bg-secondary-100 px-3 py-2 text-xs text-secondary-900">
          {notice}
        </div>
      )}

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <SearchBox value={query} onChange={setQuery} />
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setClassFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer border transition-colors ${
                classFilter === 'all'
                  ? 'bg-primary-500 text-background-50 border-primary-500'
                  : 'bg-background-50 text-foreground-700 border-background-300 hover:border-primary-400'
              }`}
            >
              {t('app.common.all')}
            </button>
            {classes.map((klass) => (
              <button
                key={klass.id}
                type="button"
                onClick={() => setClassFilter(klass.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer border transition-colors ${
                  classFilter === klass.id
                    ? 'bg-primary-500 text-background-50 border-primary-500'
                    : 'bg-background-50 text-foreground-700 border-background-300 hover:border-primary-400'
                }`}
              >
                {klass.name}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon="ri-user-search-line" />
        </Card>
      ) : (
        <>
          {/* Phones: one tidy card per student instead of a sideways-scrolling table. */}
          <Card className="md:hidden overflow-hidden">
            <ul>
              {rows.map((student) => {
                const displayName = `${student.first_name} ${student.last_name ?? ''}`.trim();
                const guardian = guardianByStudent.get(student.id);
                return (
                  <li key={student.id} className="border-b border-background-100 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setSelected(student)}
                      className="w-full flex items-start gap-2.5 p-3 text-start cursor-pointer active:bg-background-100"
                    >
                      <Avatar name={displayName} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-foreground-950 truncate">
                          {displayName}
                        </span>
                        <span className="block text-[11px] text-foreground-500 truncate">
                          {student.first_name_ar} {student.last_name_ar}
                        </span>
                        <span className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="text-[11px] font-medium text-foreground-700 tabular-nums">
                            {student.student_no ?? '—'}
                          </span>
                          <StatusPill value={student.status} />
                          {student.sections ? (
                            <span className="text-[11px] text-foreground-600 truncate">
                              {student.sections.classes?.name ?? ''} / {student.sections.name}
                            </span>
                          ) : null}
                        </span>
                        {guardian ? (
                          <span className="block text-[11px] text-foreground-500 mt-1 truncate">
                            {guardian.name}
                            {guardian.phone ? ` · ${guardian.phone}` : ''}
                          </span>
                        ) : null}
                      </span>
                      <span className="w-6 h-6 shrink-0 flex items-center justify-center text-foreground-400">
                        <i className="ri-arrow-right-s-line rtl:rotate-180" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="hidden md:block">
            <TableWrap>
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.common.name')}</Th>
                  <Th>{t('app.students.studentNo')}</Th>
                  <Th>{t('app.students.sectionCol')}</Th>
                  <Th>{t('app.students.guardianCol')}</Th>
                  <Th>{t('app.common.status')}</Th>
                  <Th className="text-end">{t('app.common.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((student) => {
                  const guardian = guardianByStudent.get(student.id);
                  const displayName = `${student.first_name} ${student.last_name ?? ''}`.trim();
                  return (
                    <Row key={student.id}>
                      <Td>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={displayName} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground-950 truncate">{displayName}</p>
                            <p className="text-[11px] text-foreground-500 truncate">
                              {student.first_name_ar} {student.last_name_ar}
                            </p>
                          </div>
                        </div>
                      </Td>
                      <Td className="tabular-nums text-xs">{student.student_no ?? '—'}</Td>
                      <Td className="text-xs">
                        {student.sections?.classes?.name ?? '—'}
                        {student.sections ? ` / ${student.sections.name}` : ''}
                      </Td>
                      <Td className="text-xs">
                        {guardian ? (
                          <span className="block">
                            <span className="block truncate max-w-[160px]">{guardian.name}</span>
                            <span dir="ltr" className="block text-[11px] text-foreground-500">
                              {guardian.phone ?? '—'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-foreground-400">{t('app.students.noGuardians')}</span>
                        )}
                      </Td>
                      <Td>
                        <StatusPill value={student.status} />
                      </Td>
                      <Td className="text-end">
                        <button
                          type="button"
                          onClick={() => setSelected(student)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
                        >
                          <i className="ri-eye-line" />
                          {t('app.common.view')}
                        </button>
                      </Td>
                    </Row>
                  );
                })}
              </tbody>
            </TableWrap>
          </Card>
        </>
      )}

      {selected && (
        <StudentProfileModal
          student={selected}
          students={state.data?.students ?? []}
          links={state.data?.links ?? []}
          invoices={state.data?.invoices ?? []}
          institution={state.data?.institution ?? null}
          canSeeFamily={canSeeFamily}
          canWrite={canWrite}
          onClose={() => setSelected(null)}
          onPrint={() => {
            setCardFor(selected);
            setSelected(null);
          }}
        />
      )}

      {cardFor && (
        <PrintSheet
          title={t('app.print.idCard')}
          hint={t('app.print.idCardHint')}
          onClose={() => setCardFor(null)}
        >
          <StudentIdCard student={cardFor} institution={state.data?.institution ?? null} />
        </PrintSheet>
      )}

      {addOpen && (
        <AddStudentModal
          classes={classes}
          sections={state.data?.sections ?? []}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            setNotice(t('app.students.created'));
            state.reload();
          }}
        />
      )}
    </>
  );
}