import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import type { StudentRow } from '@/api/college';
import type { HostelRow, RoomRow, RoomTypeRow } from '@/api/campusOps';
import { allocateHostel, createHostel, createRoom, createRoomType } from '@/api/campusOps';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className={labelClass}>{label}</span>
      {children}
    </div>
  );
}

function Footer({ busy, onCancel, label }: { busy: boolean; onCancel: () => void; label: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col sm:flex-row gap-2 pt-1">
      <button
        type="submit"
        disabled={busy}
        className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-4 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
      >
        {busy ? t('app.common.saving') : label}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 border border-background-300 text-foreground-800 text-xs font-semibold px-4 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
      >
        {t('app.common.cancel')}
      </button>
    </div>
  );
}

export function HostelModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: '',
    hostelType: 'boys',
    address: '',
    wardenName: '',
    wardenPhone: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createHostel(form);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.hostel.addHostel')} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label={t('app.hostel.hostelName')}>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('app.hostel.type')}>
            <select
              className={inputClass}
              value={form.hostelType}
              onChange={(e) => setForm({ ...form, hostelType: e.target.value })}
            >
              <option value="boys">{t('app.hostel.boys')}</option>
              <option value="girls">{t('app.hostel.girls')}</option>
            </select>
          </Field>
          <Field label={t('app.hostel.warden')}>
            <input
              className={inputClass}
              value={form.wardenName}
              onChange={(e) => setForm({ ...form, wardenName: e.target.value })}
            />
          </Field>
          <Field label={t('app.common.phone')}>
            <input
              className={inputClass}
              dir="ltr"
              value={form.wardenPhone}
              onChange={(e) => setForm({ ...form, wardenPhone: e.target.value })}
            />
          </Field>
          <Field label={t('app.hostel.address')}>
            <input
              className={inputClass}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
        </div>
        {error && (
          <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">{error}</p>
        )}
        <Footer busy={busy} onCancel={onClose} label={t('app.common.save')} />
      </form>
    </Modal>
  );
}

export function RoomTypeModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', beds: '2', monthlyFee: '0' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createRoomType({
        name: form.name,
        beds: Number(form.beds) || 1,
        monthlyFee: Number(form.monthlyFee) || 0,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.hostel.addRoomType')} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label={t('app.hostel.roomType')}>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('app.hostel.beds')}>
            <input
              className={inputClass}
              type="number"
              min={1}
              dir="ltr"
              value={form.beds}
              onChange={(e) => setForm({ ...form, beds: e.target.value })}
            />
          </Field>
          <Field label={t('app.hostel.monthlyFee')}>
            <input
              className={inputClass}
              type="number"
              min={0}
              dir="ltr"
              value={form.monthlyFee}
              onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })}
            />
          </Field>
        </div>
        {error && (
          <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">{error}</p>
        )}
        <Footer busy={busy} onCancel={onClose} label={t('app.common.save')} />
      </form>
    </Modal>
  );
}

export function RoomModal({
  hostels,
  roomTypes,
  onClose,
  onSaved,
}: {
  hostels: HostelRow[];
  roomTypes: RoomTypeRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    hostelId: hostels[0]?.id ?? '',
    roomTypeId: roomTypes[0]?.id ?? '',
    roomNo: '',
    floor: '',
    beds: String(roomTypes[0]?.beds ?? 2),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createRoom({
        hostelId: form.hostelId,
        roomTypeId: form.roomTypeId || null,
        roomNo: form.roomNo,
        floor: form.floor,
        beds: Number(form.beds) || 1,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.hostel.addRoom')} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('app.hostel.hostelName')}>
            <select
              className={inputClass}
              value={form.hostelId}
              onChange={(e) => setForm({ ...form, hostelId: e.target.value })}
              required
            >
              {hostels.map((hostel) => (
                <option key={hostel.id} value={hostel.id}>
                  {hostel.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('app.hostel.roomType')}>
            <select
              className={inputClass}
              value={form.roomTypeId}
              onChange={(e) => {
                const type = roomTypes.find((item) => item.id === e.target.value);
                setForm({ ...form, roomTypeId: e.target.value, beds: String(type?.beds ?? form.beds) });
              }}
            >
              <option value="">{t('app.common.unknown')}</option>
              {roomTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('app.hostel.roomNo')}>
            <input
              className={inputClass}
              value={form.roomNo}
              onChange={(e) => setForm({ ...form, roomNo: e.target.value })}
              required
              placeholder="A-101"
            />
          </Field>
          <Field label={t('app.hostel.floor')}>
            <input
              className={inputClass}
              value={form.floor}
              onChange={(e) => setForm({ ...form, floor: e.target.value })}
              placeholder="Ground"
            />
          </Field>
          <Field label={t('app.hostel.beds')}>
            <input
              className={inputClass}
              type="number"
              min={1}
              dir="ltr"
              value={form.beds}
              onChange={(e) => setForm({ ...form, beds: e.target.value })}
            />
          </Field>
        </div>
        {error && (
          <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">{error}</p>
        )}
        <Footer busy={busy} onCancel={onClose} label={t('app.common.save')} />
      </form>
    </Modal>
  );
}

export function BoarderModal({
  students,
  rooms,
  onClose,
  onSaved,
}: {
  students: StudentRow[];
  rooms: RoomRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [studentId, setStudentId] = useState('');
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? '');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!studentId || !roomId) {
      setError(t('app.hostel.pickStudent'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await allocateHostel({ studentId, roomId, notes });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.hostel.addBoarder')} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label={t('app.hostel.student')}>
          <select className={inputClass} value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
            <option value="">{t('app.hostel.pickStudent')}</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.student_no ?? '—'} · {student.first_name} {student.last_name ?? ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('app.hostel.room')}>
          <select className={inputClass} value={roomId} onChange={(e) => setRoomId(e.target.value)} required>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.hostels?.name ?? '—'} / {room.room_no} · {room.beds} {t('app.hostel.beds')}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('app.common.notes')}>
          <textarea
            className={inputClass}
            rows={2}
            maxLength={300}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        {error && (
          <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">{error}</p>
        )}
        <Footer busy={busy} onCancel={onClose} label={t('app.hostel.assign')} />
      </form>
    </Modal>
  );
}