import { useTranslation } from 'react-i18next';
import type { HostelAllocation, HostelRow, RoomRow, RoomTypeRow } from '@/api/campusOps';
import { formatDate } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import { Badge, ProgressRow } from '@/components/app/ui';
import RecordPrintButton from '@/components/app/RecordPrintButton';

/*
  Phone registers for the hostel block — one card per row instead of a wide
  table, so nothing has to be scrolled sideways with a thumb.
*/

interface HostelCardsProps {
  rows: HostelRow[];
  rooms: RoomRow[];
  occupiedByRoom: Map<string, number>;
}

export function HostelCards({ rows, rooms, occupiedByRoom }: HostelCardsProps) {
  const { t } = useTranslation();
  if (rows.length === 0) return null;

  return (
    <div className="md:hidden divide-y divide-background-100">
      {rows.map((row) => {
        const hostelRooms = rooms.filter((room) => room.hostel_id === row.id);
        const beds = hostelRooms.reduce((sum, room) => sum + room.beds, 0);
        const used = hostelRooms.reduce((sum, room) => sum + (occupiedByRoom.get(room.id) ?? 0), 0);
        const rate = beds > 0 ? (used / beds) * 100 : 0;
        return (
          <div key={row.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground-950 truncate">{row.name}</p>
                <p className="text-[11px] text-foreground-500 truncate">{row.address ?? '—'}</p>
              </div>
              <Badge tone={row.hostel_type === 'girls' ? 'accent' : 'secondary'}>
                {row.hostel_type === 'girls' ? t('app.hostel.girls') : t('app.hostel.boys')}
              </Badge>
            </div>

            <p className="text-[11px] text-foreground-600 mt-1.5 truncate">
              <i className="ri-user-star-line text-foreground-400 me-1" />
              {row.warden_name ?? '—'}
              {row.warden_phone ? (
                <span dir="ltr" className="tabular-nums text-foreground-500"> · {row.warden_phone}</span>
              ) : null}
            </p>

            <div className="flex items-center justify-between gap-3 mt-2">
              <p className="text-[11px] text-foreground-500 tabular-nums shrink-0">
                {hostelRooms.length} {t('app.hostel.rooms')} · {used}/{beds}
              </p>
              <div className="flex-1 min-w-0 max-w-[160px]">
                <ProgressRow value={rate} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface RoomTypeCardsProps {
  rows: RoomTypeRow[];
  rooms: RoomRow[];
}

export function RoomTypeCards({ rows, rooms }: RoomTypeCardsProps) {
  const { t } = useTranslation();
  if (rows.length === 0) return null;

  return (
    <div className="md:hidden divide-y divide-background-100">
      {rows.map((row) => (
        <div key={row.id} className="p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground-950 truncate">{row.name}</p>
            <p className="text-[11px] text-foreground-500 mt-0.5">
              {row.beds} {t('app.hostel.beds')} · {rooms.filter((room) => room.room_type_id === row.id).length}{' '}
              {t('app.hostel.rooms')}
            </p>
          </div>
          <p className="text-sm font-bold text-foreground-950 tabular-nums shrink-0">{formatMoney(row.monthly_fee)}</p>
        </div>
      ))}
    </div>
  );
}

interface RoomCardsProps {
  rows: RoomRow[];
  occupiedByRoom: Map<string, number>;
}

export function RoomCards({ rows, occupiedByRoom }: RoomCardsProps) {
  const { t } = useTranslation();
  if (rows.length === 0) return null;

  return (
    <div className="md:hidden divide-y divide-background-100">
      {rows.map((row) => {
        const used = occupiedByRoom.get(row.id) ?? 0;
        const rate = row.beds > 0 ? (used / row.beds) * 100 : 0;
        return (
          <div key={row.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground-950 truncate">{row.room_no}</p>
                <p className="text-[11px] text-foreground-500 truncate">
                  {row.hostels?.name ?? '—'} · {row.hostel_room_types?.name ?? '—'}
                  {row.floor ? ` · ${t('app.hostel.floor')} ${row.floor}` : ''}
                </p>
              </div>
              <p className="text-sm font-bold text-foreground-950 tabular-nums shrink-0">
                {formatMoney(row.hostel_room_types?.monthly_fee ?? 0)}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 mt-2">
              <p className="text-[11px] text-foreground-500 tabular-nums shrink-0">
                {used}/{row.beds}
              </p>
              <div className="flex-1 min-w-0 max-w-[160px]">
                <ProgressRow value={rate} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface BoarderCardsProps {
  rows: HostelAllocation[];
  rooms: RoomRow[];
  onVacate: (id: string) => void;
}

export function BoarderCards({ rows, rooms, onVacate }: BoarderCardsProps) {
  const { t, i18n } = useTranslation();
  if (rows.length === 0) return null;

  return (
    <div className="md:hidden divide-y divide-background-100">
      {rows.map((row) => {
        const name = `${row.students?.first_name ?? ''} ${row.students?.last_name ?? ''}`.trim();
        const room = rooms.find((item) => item.id === row.room_id);
        const fee = room?.hostel_room_types?.monthly_fee ?? 0;
        return (
          <div key={row.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground-950 truncate">{name || '—'}</p>
                <p className="text-[11px] text-foreground-500 tabular-nums">{row.students?.student_no ?? '—'}</p>
              </div>
              <p className="text-sm font-bold text-foreground-950 tabular-nums shrink-0">{formatMoney(fee)}</p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <Badge tone="accent">{row.hostel_rooms?.room_no ?? '—'}</Badge>
              <span className="text-[11px] text-foreground-600 truncate">{row.hostel_rooms?.hostels?.name ?? '—'}</span>
            </div>

            <div className="flex items-center justify-between gap-2 mt-2.5">
              <p className="text-[11px] text-foreground-500 tabular-nums truncate">
                {t('app.hostel.since')}: {formatDate(row.allocated_on, i18n.language)}
              </p>
              <div className="flex items-center gap-1.5 shrink-0">
                <RecordPrintButton
                  title={`${t('app.hostel.title')} — ${name}`}
                  columns={[
                    t('app.hostel.student'),
                    t('app.common.reference'),
                    t('app.hostel.hostelName'),
                    t('app.hostel.roomNo'),
                    t('app.hostel.since'),
                    t('app.hostel.monthlyFee'),
                  ]}
                  values={[
                    name,
                    row.students?.student_no ?? '',
                    row.hostel_rooms?.hostels?.name ?? '',
                    row.hostel_rooms?.room_no ?? '',
                    formatDate(row.allocated_on, i18n.language),
                    formatMoney(fee),
                  ]}
                />
                <button
                  type="button"
                  onClick={() => onVacate(row.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-background-300 px-2.5 py-1.5 text-[11px] font-semibold text-foreground-700 whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-logout-circle-line" />
                  {t('app.hostel.vacate')}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}