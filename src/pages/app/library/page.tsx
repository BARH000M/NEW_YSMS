import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { fetchStaff, fetchStudents } from '@/api/college';
import {
  fetchBooks,
  fetchLibraryIssues,
  fetchLibraryMembers,
  returnBook,
  setBookActive,
} from '@/api/campus';
import { formatDate } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import ExportBar from '@/components/app/ExportBar';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Row,
  SearchBox,
  StatCard,
  TableWrap,
  Tabs,
  Td,
  Th,
} from '@/components/app/ui';
import { BookModal, IssueModal, MemberModal } from './components/LibraryModals';

export default function LibraryPage() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState('books');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<'book' | 'issue' | 'member' | null>(null);

  const state = useAsync(async () => {
    const [books, members, issues, students, staff] = await Promise.all([
      fetchBooks(),
      fetchLibraryMembers(),
      fetchLibraryIssues(),
      fetchStudents(),
      fetchStaff(),
    ]);
    return { books, members, issues, students, staff };
  }, []);

  if (state.loading) return <LoadingBlock />;
  if (state.error || !state.data) return <ErrorState message={state.error ?? 'No data'} onRetry={state.reload} />;

  const { books, members, issues, students, staff } = state.data;

  return (
    <LibraryContent
      tab={tab}
      setTab={setTab}
      query={query}
      setQuery={setQuery}
      modal={modal}
      setModal={setModal}
      books={books}
      members={members}
      issues={issues}
      students={students}
      staff={staff}
      reload={state.reload}
      language={i18n.language}
    />
  );
}

function LibraryContent({
  tab,
  setTab,
  query,
  setQuery,
  modal,
  setModal,
  books,
  members,
  issues,
  students,
  staff,
  reload,
  language,
}: {
  tab: string;
  setTab: (value: string) => void;
  query: string;
  setQuery: (value: string) => void;
  modal: 'book' | 'issue' | 'member' | null;
  setModal: (value: 'book' | 'issue' | 'member' | null) => void;
  books: ReturnType<typeof fetchBooks> extends Promise<infer T> ? T : never;
  members: ReturnType<typeof fetchLibraryMembers> extends Promise<infer T> ? T : never;
  issues: ReturnType<typeof fetchLibraryIssues> extends Promise<infer T> ? T : never;
  students: ReturnType<typeof fetchStudents> extends Promise<infer T> ? T : never;
  staff: ReturnType<typeof fetchStaff> extends Promise<infer T> ? T : never;
  reload: () => void;
  language: string;
}) {
  const { t } = useTranslation();
  const [overdueOnly, setOverdueOnly] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (issue: { status: string; due_on: string | null }) =>
    issue.status === 'issued' && !!issue.due_on && issue.due_on < today;

  const issuedByBook = useMemo(() => {
    const map = new Map<string, number>();
    issues
      .filter((issue) => issue.status === 'issued')
      .forEach((issue) => map.set(issue.book_id, (map.get(issue.book_id) ?? 0) + 1));
    return map;
  }, [issues]);

  const term = query.trim().toLowerCase();
  const visibleBooks = books.filter(
    (book) =>
      !term ||
      book.title.toLowerCase().includes(term) ||
      (book.author ?? '').toLowerCase().includes(term) ||
      (book.isbn ?? '').toLowerCase().includes(term),
  );
  const visibleIssues = issues
    .filter(
      (issue) =>
        !term ||
        (issue.library_books?.title ?? '').toLowerCase().includes(term) ||
        (issue.library_members?.name ?? '').toLowerCase().includes(term),
    )
    .filter((issue) => !overdueOnly || isOverdue(issue));

  const overdueLoans = issues.filter(isOverdue).length;
  const visibleMembers = members.filter(
    (member) => !term || member.name.toLowerCase().includes(term) || (member.card_no ?? '').toLowerCase().includes(term),
  );

  const addButton = (label: string, kind: 'book' | 'issue' | 'member') => (
    <button
      type="button"
      onClick={() => setModal(kind)}
      className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
    >
      <i className="ri-add-line" />
      {label}
    </button>
  );

  const activeLoans = issues.filter((issue) => issue.status === 'issued');
  const totalCopies = books.reduce((sum, book) => sum + book.quantity, 0);

  return (
    <>
      <PageHeader title={t('app.library.title')} subtitle={t('app.library.subtitle')} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.library.bookTitles')} value={books.length} icon="ri-book-2-line" tone="primary" />
        <StatCard label={t('app.library.copies')} value={totalCopies} icon="ri-stack-line" tone="secondary" />
        <StatCard label={t('app.library.members')} value={members.length} icon="ri-user-3-line" tone="accent" />
        <StatCard label={t('app.library.onLoan')} value={activeLoans.length} icon="ri-arrow-left-right-line" tone="neutral" />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { key: 'books', label: t('app.library.tabBooks'), count: books.length },
              { key: 'issues', label: t('app.library.tabIssues'), count: issues.length },
              { key: 'members', label: t('app.library.tabMembers'), count: members.length },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <SearchBox value={query} onChange={setQuery} />
            {tab === 'books' && (
              <>
                <ExportBar
                  title={t('app.library.bookList')}
                  fileName="library-books"
                  columns={[
                    t('app.library.bookTitle'),
                    t('app.library.isbn'),
                    t('app.library.author'),
                    t('app.library.publisher'),
                    t('app.library.rackNo'),
                    t('app.library.quantity'),
                    t('app.library.price'),
                  ]}
                  rows={visibleBooks.map((book) => [
                    book.title,
                    book.isbn ?? '—',
                    book.author ?? '—',
                    book.publisher ?? '—',
                    book.rack_no ?? '—',
                    book.quantity,
                    formatMoney(Number(book.price)),
                  ])}
                  summary={[
                    { label: t('app.library.bookTitles'), value: String(visibleBooks.length) },
                    {
                      label: t('app.library.stockValue'),
                      value: formatMoney(visibleBooks.reduce((sum, book) => sum + Number(book.price) * book.quantity, 0)),
                    },
                  ]}
                />
                {addButton(t('app.library.addBook'), 'book')}
              </>
            )}
            {tab === 'issues' && (
              <>
                <button
                  type="button"
                  onClick={() => setOverdueOnly((value) => !value)}
                  aria-pressed={overdueOnly}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors border ${
                    overdueOnly
                      ? 'bg-primary-500 border-primary-500 text-background-50'
                      : 'bg-background-50 border-background-300 text-foreground-700 hover:border-primary-400'
                  }`}
                >
                  <i className="ri-alarm-warning-line text-sm" />
                  {t('app.library.overdueOnly')}
                  <span className="tabular-nums opacity-70">{overdueLoans}</span>
                </button>
                <ExportBar
                  title={t('app.library.issueList')}
                  fileName="library-issues"
                  columns={[
                    t('app.library.bookTitle'),
                    t('app.library.member'),
                    t('app.library.issuedOn'),
                    t('app.library.dueOn'),
                    t('app.library.returnedOn'),
                    t('app.common.status'),
                  ]}
                  rows={visibleIssues.map((issue) => [
                    issue.library_books?.title ?? '—',
                    issue.library_members?.name ?? '—',
                    formatDate(issue.issued_on, language),
                    issue.due_on ? formatDate(issue.due_on, language) : '—',
                    issue.returned_on ? formatDate(issue.returned_on, language) : '—',
                    t(`app.library.status.${issue.status}`),
                  ])}
                  summary={[{ label: t('app.library.onLoan'), value: String(activeLoans.length) }]}
                />
                {addButton(t('app.library.issueBook'), 'issue')}
              </>
            )}
            {tab === 'members' && (
              <>
                <ExportBar
                  title={t('app.library.memberList')}
                  fileName="library-members"
                  columns={[
                    t('app.library.cardNo'),
                    t('app.common.name'),
                    t('app.library.memberType'),
                    t('app.common.phone'),
                    t('app.common.status'),
                  ]}
                  rows={visibleMembers.map((member) => [
                    member.card_no ?? '—',
                    member.name,
                    t(`app.library.type.${member.member_type}`, { defaultValue: member.member_type }),
                    member.phone ?? '—',
                    member.is_active ? t('app.common.active') : t('app.common.inactive'),
                  ])}
                />
                {addButton(t('app.library.addMember'), 'member')}
              </>
            )}
          </div>
        </div>
      </Card>

      {tab === 'books' && (
        <Card>
          {visibleBooks.length === 0 ? (
            <EmptyState icon="ri-book-2-line" label={t('app.library.noBooks')} />
          ) : (
            <TableWrap>
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.library.bookTitle')}</Th>
                  <Th>{t('app.library.isbn')}</Th>
                  <Th>{t('app.library.author')}</Th>
                  <Th>{t('app.library.publisher')}</Th>
                  <Th>{t('app.library.rackNo')}</Th>
                  <Th>{t('app.library.qtyAvail')}</Th>
                  <Th>{t('app.library.price')}</Th>
                  <Th>{t('app.library.postDate')}</Th>
                  <Th>{t('app.common.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {visibleBooks.map((book) => {
                  const out = issuedByBook.get(book.id) ?? 0;
                  return (
                    <Row key={book.id}>
                      <Td>
                        <p className="text-sm font-medium text-foreground-950 max-w-[240px] truncate">{book.title}</p>
                        <p className="text-[11px] text-foreground-500 truncate max-w-[240px]">{book.subject ?? '—'}</p>
                      </Td>
                      <Td className="text-xs tabular-nums text-foreground-600">{book.isbn ?? '—'}</Td>
                      <Td className="text-xs text-foreground-600 whitespace-nowrap">{book.author ?? '—'}</Td>
                      <Td className="text-xs text-foreground-600 whitespace-nowrap">{book.publisher ?? '—'}</Td>
                      <Td>
                        <Badge tone="neutral">{book.rack_no ?? '—'}</Badge>
                      </Td>
                      <Td className="text-xs tabular-nums whitespace-nowrap">
                        {book.quantity - out} / {book.quantity}
                      </Td>
                      <Td className="text-xs tabular-nums whitespace-nowrap">{formatMoney(Number(book.price))}</Td>
                      <Td className="text-xs whitespace-nowrap text-foreground-600">
                        {formatDate(book.post_date, language)}
                      </Td>
                      <Td>
                        <button
                          type="button"
                          onClick={async () => {
                            await setBookActive(book.id, !book.is_active);
                            reload();
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-md border border-background-300 text-foreground-700 hover:border-primary-400 cursor-pointer"
                          aria-label={book.is_active ? t('app.common.inactive') : t('app.common.active')}
                        >
                          <i className={`${book.is_active ? 'ri-toggle-fill' : 'ri-toggle-line'} text-base`} />
                        </button>
                      </Td>
                    </Row>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </Card>
      )}

      {tab === 'issues' && (
        <Card>
          {visibleIssues.length === 0 ? (
            <EmptyState
              icon="ri-arrow-left-right-line"
              label={overdueOnly ? t('app.library.noOverdue') : t('app.library.noIssues')}
            />
          ) : (
            <>
              {/* Phones: one card per loan instead of the eight-column register. */}
              <div className="md:hidden divide-y divide-background-100">
                {visibleIssues.map((issue) => {
                  const overdue = isOverdue(issue);
                  return (
                    <div key={issue.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground-950 truncate">
                            {issue.library_books?.title ?? '—'}
                          </p>
                          <p className="text-[11px] text-foreground-500 truncate">
                            {issue.library_members?.name ?? '—'}
                            {issue.library_members?.card_no ? ` · ${issue.library_members.card_no}` : ''}
                          </p>
                        </div>
                        <Badge tone={issue.status === 'returned' ? 'secondary' : overdue ? 'danger' : 'primary'}>
                          {overdue && issue.status === 'issued'
                            ? t('app.library.status.overdue')
                            : t(`app.library.status.${issue.status}`)}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-foreground-600">
                        <span className="inline-flex items-center gap-1">
                          <i className="ri-user-3-line text-foreground-400" />
                          {t(`app.library.type.${issue.library_members?.member_type ?? 'student'}`, {
                            defaultValue: issue.library_members?.member_type ?? '—',
                          })}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <i className="ri-calendar-line text-foreground-400" />
                          {formatDate(issue.issued_on, language)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <i className="ri-calendar-check-line text-foreground-400" />
                          <span className={overdue ? 'text-primary-700 font-semibold' : ''}>
                            {issue.due_on ? formatDate(issue.due_on, language) : '—'}
                          </span>
                        </span>
                        {issue.returned_on ? (
                          <span className="inline-flex items-center gap-1">
                            <i className="ri-arrow-go-back-line text-foreground-400" />
                            {formatDate(issue.returned_on, language)}
                          </span>
                        ) : null}
                      </div>

                      {issue.status === 'issued' ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await returnBook(issue.id);
                            reload();
                          }}
                          className="mt-2.5 inline-flex items-center gap-1 rounded-md border border-background-300 px-2.5 py-1.5 text-[11px] font-semibold text-foreground-700 whitespace-nowrap cursor-pointer"
                        >
                          <i className="ri-arrow-go-back-line" />
                          {t('app.library.markReturned')}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <TableWrap className="hidden md:block">
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.library.bookTitle')}</Th>
                  <Th>{t('app.library.member')}</Th>
                  <Th>{t('app.library.memberType')}</Th>
                  <Th>{t('app.library.issuedOn')}</Th>
                  <Th>{t('app.library.dueOn')}</Th>
                  <Th>{t('app.library.returnedOn')}</Th>
                  <Th>{t('app.common.status')}</Th>
                  <Th>{t('app.common.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {visibleIssues.map((issue) => {
                  const overdue = isOverdue(issue);
                  return (
                    <Row key={issue.id}>
                      <Td className="text-sm text-foreground-950 max-w-[220px] truncate">
                        {issue.library_books?.title ?? '—'}
                      </Td>
                      <Td className="text-xs">
                        <p className="text-foreground-900">{issue.library_members?.name ?? '—'}</p>
                        <p className="text-[11px] text-foreground-500 tabular-nums">
                          {issue.library_members?.card_no ?? '—'}
                        </p>
                      </Td>
                      <Td>
                        <Badge tone="accent">
                          {t(`app.library.type.${issue.library_members?.member_type ?? 'student'}`, {
                            defaultValue: issue.library_members?.member_type ?? '—',
                          })}
                        </Badge>
                      </Td>
                      <Td className="text-xs whitespace-nowrap text-foreground-600">
                        {formatDate(issue.issued_on, language)}
                      </Td>
                      <Td className="text-xs whitespace-nowrap">
                        <span className={overdue ? 'text-primary-700 font-semibold' : 'text-foreground-600'}>
                          {issue.due_on ? formatDate(issue.due_on, language) : '—'}
                        </span>
                      </Td>
                      <Td className="text-xs whitespace-nowrap text-foreground-600">
                        {issue.returned_on ? formatDate(issue.returned_on, language) : '—'}
                      </Td>
                      <Td>
                        <Badge tone={issue.status === 'returned' ? 'secondary' : overdue ? 'danger' : 'primary'}>
                          {overdue && issue.status === 'issued'
                            ? t('app.library.status.overdue')
                            : t(`app.library.status.${issue.status}`)}
                        </Badge>
                      </Td>
                      <Td>
                        {issue.status === 'issued' ? (
                          <button
                            type="button"
                            onClick={async () => {
                              await returnBook(issue.id);
                              reload();
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-background-300 px-2.5 py-1.5 text-[11px] font-semibold text-foreground-700 hover:border-primary-400 whitespace-nowrap cursor-pointer"
                          >
                            <i className="ri-arrow-go-back-line" />
                            {t('app.library.markReturned')}
                          </button>
                        ) : (
                          <span className="text-[11px] text-foreground-400">—</span>
                        )}
                      </Td>
                    </Row>
                  );
                })}
              </tbody>
            </TableWrap>
            </>
          )}
        </Card>
      )}

      {tab === 'members' && (
        <Card>
          {visibleMembers.length === 0 ? (
            <EmptyState icon="ri-user-3-line" label={t('app.library.noMembers')} />
          ) : (
            <TableWrap>
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.library.cardNo')}</Th>
                  <Th>{t('app.common.name')}</Th>
                  <Th>{t('app.library.memberType')}</Th>
                  <Th>{t('app.common.phone')}</Th>
                  <Th>{t('app.library.activeLoans')}</Th>
                  <Th>{t('app.common.status')}</Th>
                </tr>
              </thead>
              <tbody>
                {visibleMembers.map((member) => (
                  <Row key={member.id}>
                    <Td>
                      <Badge tone="neutral">{member.card_no ?? '—'}</Badge>
                    </Td>
                    <Td className="text-sm text-foreground-950">{member.name}</Td>
                    <Td className="text-xs">
                      {t(`app.library.type.${member.member_type}`, { defaultValue: member.member_type })}
                    </Td>
                    <Td className="text-xs tabular-nums text-foreground-600">{member.phone ?? '—'}</Td>
                    <Td className="text-xs tabular-nums">
                      {issues.filter((issue) => issue.member_id === member.id && issue.status === 'issued').length}
                    </Td>
                    <Td>
                      <Badge tone={member.is_active ? 'secondary' : 'neutral'}>
                        {member.is_active ? t('app.common.active') : t('app.common.inactive')}
                      </Badge>
                    </Td>
                  </Row>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      )}

      {modal === 'book' && (
        <BookModal
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            reload();
          }}
        />
      )}
      {modal === 'issue' && (
        <IssueModal
          books={books}
          members={members}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            reload();
          }}
        />
      )}
      {modal === 'member' && (
        <MemberModal
          students={students}
          staff={staff}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            reload();
          }}
        />
      )}
    </>
  );
}