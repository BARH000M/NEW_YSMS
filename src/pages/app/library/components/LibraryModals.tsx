import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import { createBook, createLibraryMember, issueBook } from '@/api/campus';
import type { LibraryBook, LibraryMember } from '@/api/campus';
import type { Staff, StudentRow } from '@/api/college';

function Footer({
  busy,
  onCancel,
  onSave,
  label,
}: {
  busy: boolean;
  onCancel: () => void;
  onSave: () => void;
  label: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-end gap-2 pt-1">
      <button
        type="button"
        onClick={onCancel}
        className="px-3.5 py-2.5 rounded-md border border-background-300 text-xs font-semibold text-foreground-700 whitespace-nowrap cursor-pointer"
      >
        {t('app.common.cancel')}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onSave}
        className="px-4 py-2.5 rounded-md bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold whitespace-nowrap cursor-pointer"
      >
        {busy ? t('app.common.saving') : label}
      </button>
    </div>
  );
}

export function BookModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    title: '',
    isbn: '',
    author: '',
    publisher: '',
    subject: '',
    rackNo: '',
    quantity: '1',
    price: '0',
    postDate: new Date().toISOString().slice(0, 10),
    description: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!form.title.trim()) {
      setError(t('app.library.titleRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createBook({
        title: form.title,
        isbn: form.isbn,
        author: form.author,
        publisher: form.publisher,
        subject: form.subject,
        rackNo: form.rackNo,
        quantity: Number(form.quantity) || 1,
        price: Number(form.price) || 0,
        postDate: form.postDate,
        description: form.description,
      });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.library.addBook')} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(
            [
              ['title', t('app.library.bookTitle')],
              ['isbn', t('app.library.isbn')],
              ['author', t('app.library.author')],
              ['publisher', t('app.library.publisher')],
              ['subject', t('app.library.subject')],
              ['rackNo', t('app.library.rackNo')],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex flex-col gap-1.5 min-w-0">
              <label className={labelClass} htmlFor={`bk-${key}`}>
                {label}
              </label>
              <input
                id={`bk-${key}`}
                type="text"
                dir={key === 'title' || key === 'subject' ? undefined : 'ltr'}
                value={form[key]}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                className={inputClass}
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="bk-qty">
              {t('app.library.quantity')}
            </label>
            <input
              id="bk-qty"
              type="number"
              min={1}
              dir="ltr"
              value={form.quantity}
              onChange={(event) => setForm({ ...form, quantity: event.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="bk-price">
              {t('app.library.price')}
            </label>
            <input
              id="bk-price"
              type="number"
              min={0}
              step="0.01"
              dir="ltr"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="bk-post">
              {t('app.library.postDate')}
            </label>
            <input
              id="bk-post"
              type="date"
              value={form.postDate}
              onChange={(event) => setForm({ ...form, postDate: event.target.value })}
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="bk-desc">
            {t('app.library.description')}
          </label>
          <textarea
            id="bk-desc"
            rows={3}
            maxLength={500}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className={inputClass}
          />
        </div>
        {error && (
          <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}
        <Footer busy={busy} onCancel={onClose} onSave={() => void submit()} label={t('app.library.saveBook')} />
      </div>
    </Modal>
  );
}

export function IssueModal({
  books,
  members,
  onClose,
  onSaved,
}: {
  books: LibraryBook[];
  members: LibraryMember[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const due = new Date();
  due.setDate(due.getDate() + 14);
  const [bookId, setBookId] = useState(books[0]?.id ?? '');
  const [memberId, setMemberId] = useState(members[0]?.id ?? '');
  const [dueOn, setDueOn] = useState(due.toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!bookId || !memberId) {
      setError(t('app.library.pickBookMember'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await issueBook({ bookId, memberId, dueOn, notes });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.library.issueBook')} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="is-book">
            {t('app.library.bookTitle')}
          </label>
          <select id="is-book" value={bookId} onChange={(event) => setBookId(event.target.value)} className={inputClass}>
            {books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="is-member">
            {t('app.library.member')}
          </label>
          <select
            id="is-member"
            value={memberId}
            onChange={(event) => setMemberId(event.target.value)}
            className={inputClass}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} · {member.card_no ?? '—'}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="is-due">
            {t('app.library.dueOn')}
          </label>
          <input
            id="is-due"
            type="date"
            value={dueOn}
            onChange={(event) => setDueOn(event.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="is-notes">
            {t('app.common.notes')}
          </label>
          <input
            id="is-notes"
            type="text"
            maxLength={200}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={inputClass}
          />
        </div>
        {error && (
          <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}
        <Footer busy={busy} onCancel={onClose} onSave={() => void submit()} label={t('app.library.issueBook')} />
      </div>
    </Modal>
  );
}

export function MemberModal({
  students,
  staff,
  onClose,
  onSaved,
}: {
  students: StudentRow[];
  staff: Staff[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [memberType, setMemberType] = useState<'student' | 'teacher'>('student');
  const [studentId, setStudentId] = useState(students[0]?.id ?? '');
  const [staffId, setStaffId] = useState(staff[0]?.id ?? '');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const student = students.find((row) => row.id === studentId);
    const member = staff.find((row) => row.id === staffId);
    const name =
      memberType === 'student'
        ? `${student?.first_name ?? ''} ${student?.last_name ?? ''}`.trim()
        : member?.full_name ?? '';
    if (!name) {
      setError(t('app.library.pickRecord'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createLibraryMember({
        memberType,
        studentId: memberType === 'student' ? studentId : null,
        staffId: memberType === 'student' ? null : staffId,
        name,
        phone,
      });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.library.addMember')} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="mb-type">
            {t('app.library.memberType')}
          </label>
          <select
            id="mb-type"
            value={memberType}
            onChange={(event) => setMemberType(event.target.value as 'student' | 'teacher')}
            className={inputClass}
          >
            <option value="student">{t('app.library.typeStudent')}</option>
            <option value="teacher">{t('app.library.typeTeacher')}</option>
          </select>
        </div>
        {memberType === 'student' ? (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="mb-student">
              {t('app.library.student')}
            </label>
            <select
              id="mb-student"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              className={inputClass}
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {`${student.first_name} ${student.last_name ?? ''}`.trim()} · {student.student_no ?? '—'}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="mb-staff">
              {t('app.acad.teacher')}
            </label>
            <select id="mb-staff" value={staffId} onChange={(event) => setStaffId(event.target.value)} className={inputClass}>
              {staff.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.full_name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="mb-phone">
            {t('app.common.phone')}
          </label>
          <input
            id="mb-phone"
            type="tel"
            dir="ltr"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={inputClass}
          />
        </div>
        {error && (
          <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}
        <Footer busy={busy} onCancel={onClose} onSave={() => void submit()} label={t('app.library.addMember')} />
      </div>
    </Modal>
  );
}