import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { fetchStudents } from '@/api/college';
import {
  fetchHostelAllocations,
  fetchHostels,
  fetchRoomTypes,
  fetchRooms,
  vacateHostel,
} from '@/api/campusOps';
import { formatDate } from '@/utils/date';
import { formatMoney, toNumber } from '@/utils/money';
import ExportBar from '@/components/app/ExportBar';
import RecordPrintButton from '@/components/app/RecordPrintButton';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  ProgressRow,
  Row,
  SearchBox,
  StatCard,
  TableWrap,
  Tabs,
  Td,
  Th,
} from '@/components/app/ui';
import { BoarderModal, HostelModal, RoomModal, RoomTypeModal } from './components/HostelModals';
import { BoarderCards, HostelCards, RoomCards, RoomTypeCards } from './components/HostelMobileCards';

type ModalKind = 'hostel' | 'roomType' | 'room' | 'boarder' | null;

export default function HostelPage() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState('hostels');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<ModalKind>(null);

  const state = useAsync(async () => {
    const [hostels, roomTypes, rooms, allocations, students] = await Promise.all([
      fetchHostels(),
      fetchRoomTypes(),
      fetchRooms(),
      fetchHostelAllocations(),
      fetchStudents(),
    ]);
    return { hostels, roomTypes, rooms, allocations, students };
  }, []);

  if (state.loading) return <LoadingBlock />;
  if (state.error || !state.data) return <ErrorState message={state.error ?? 'No data'} onRetry={state.reload} />;

  const { hostels, roomTypes, rooms, allocations, students } = state.data;
  const term = query.trim().toLowerCase();
  const active = allocations.filter((row) => row.status === 'active');

  const occupiedByRoom = new Map<string, number>();
  active.forEach((row) => occupiedByRoom.set(row.room_id, (occupiedByRoom.get(row.room_id) ?? 0) + 1));

  const totalBeds = rooms.reduce((sum, room) => sum + room.beds, 0);
  const monthlyRevenue = active.reduce((sum, row) => {
    const room = rooms.find((item) => item.id === row.room_id);
    return sum + toNumber(room?.hostel_room_types?.monthly_fee);
  }, 0);

  const visibleHostels = hostels.filter((row) => !term || row.name.toLowerCase().includes(term));
  const visibleRooms = rooms.filter(
    (row) =>
      !term ||
      row.room_no.toLowerCase().includes(term) ||
      (row.hostels?.name ?? '').toLowerCase().includes(term) ||
      (row.hostel_room_types?.name ?? '').toLowerCase().includes(term),
  );
  const visibleBoarders = active.filter(
    (row) =>
      !term ||
      `${row.students?.first_name ?? ''} ${row.students?.last_name ?? ''}`.toLowerCase().includes(term) ||
      (row.students?.student_no ?? '').toLowerCase().includes(term),
  );

  const addButton = (label: string, kind: Exclude<ModalKind, null>) => (
    <button
      type="button"
      onClick={() => setModal(kind)}
      className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
    >
      <i className="ri-add-line" />
      {label}
    </button>
  );

  return (
    <>
      <PageHeader title={t('app.hostel.title')} subtitle={t('app.hostel.subtitle')} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.hostel.hostels')} value={hostels.length} icon="ri-building-4-line" tone="primary" />
        <StatCard label={t('app.hostel.rooms')} value={rooms.length} icon="ri-door-closed-line" tone="accent" />
        <StatCard
          label={t('app.hostel.boarders')}
          value={active.length}
          icon="ri-user-heart-line"
          tone="secondary"
          hint={t('app.hostel.bedsTotal', { count: totalBeds })}
        />
        <StatCard label={t('app.hostel.monthly')} value={formatMoney(monthlyRevenue)} icon="ri-wallet-3-line" tone="neutral" />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { key: 'hostels', label: t('app.hostel.tabHostels'), count: hostels.length },
              { key: 'roomTypes', label: t('app.hostel.tabRoomTypes'), count: roomTypes.length },
              { key: 'rooms', label: t('app.hostel.tabRooms'), count: rooms.length },
              { key: 'boarders', label: t('app.hostel.tabBoarders'), count: active.length },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <SearchBox value={query} onChange={setQuery} />
            {tab === 'hostels' && (
              <>
                <ExportBar
                  title={t('app.hostel.hostelList')}
                  fileName="hostels"
                  columns={[
                    t('app.hostel.hostelName'),
                    t('app.hostel.type'),
                    t('app.hostel.warden'),
                    t('app.common.phone'),
                    t('app.hostel.address'),
                    t('app.hostel.rooms'),
                  ]}
                  rows={visibleHostels.map((row) => [
                    row.name,
                    row.hostel_type === 'girls' ? t('app.hostel.girls') : t('app.hostel.boys'),
                    row.warden_name ?? '—',
                    row.warden_phone ?? '—',
                    row.address ?? '—',
                    String(rooms.filter((room) => room.hostel_id === row.id).length),
                  ])}
                />
                {addButton(t('app.hostel.addHostel'), 'hostel')}
              </>
            )}
            {tab === 'roomTypes' && (
              <>
                <ExportBar
                  title={t('app.hostel.roomTypeList')}
                  fileName="hostel-room-types"
                  columns={[t('app.hostel.roomType'), t('app.hostel.beds'), t('app.hostel.monthlyFee')]}
                  rows={roomTypes.map((row) => [row.name, row.beds, formatMoney(row.monthly_fee)])}
                />
                {addButton(t('app.hostel.addRoomType'), 'roomType')}
              </>
            )}
            {tab === 'rooms' && (
              <>
                <ExportBar
                  title={t('app.hostel.roomList')}
                  fileName="hostel-rooms"
                  columns={[
                    t('app.hostel.roomNo'),
                    t('app.hostel.hostelName'),
                    t('app.hostel.roomType'),
                    t('app.hostel.floor'),
                    t('app.hostel.beds'),
                    t('app.hostel.occupied'),
                  ]}
                  rows={visibleRooms.map((row) => [
                    row.room_no,
                    row.hostels?.name ?? '—',
                    row.hostel_room_types?.name ?? '—',
                    row.floor ?? '—',
                    row.beds,
                    occupiedByRoom.get(row.id) ?? 0,
                  ])}
                  summary={[
                    { label: t('app.hostel.bedsTotal', { count: totalBeds }), value: String(totalBeds) },
                    { label: t('app.hostel.occupied'), value: String(active.length) },
                  ]}
                />
                {addButton(t('app.hostel.addRoom'), 'room')}
              </>
            )}
            {tab === 'boarders' && (
              <>
                <ExportBar
                  title={t('app.hostel.boarderList')}
                  fileName="hostel-boarders"
                  columns={[
                    t('app.hostel.student'),
                    t('app.common.reference'),
                    t('app.hostel.hostelName'),
                    t('app.hostel.roomNo'),
                    t('app.hostel.since'),
                    t('app.hostel.monthlyFee'),
                  ]}
                  rows={visibleBoarders.map((row) => {
                    const room = rooms.find((item) => item.id === row.room_id);
                    return [
                      `${row.students?.first_name ?? ''} ${row.students?.last_name ?? ''}`.trim(),
                      row.students?.student_no ?? '',
                      row.hostel_rooms?.hostels?.name ?? '',
                      row.hostel_rooms?.room_no ?? '',
                      formatDate(row.allocated_on, i18n.language),
                      formatMoney(room?.hostel_room_types?.monthly_fee ?? 0),
                    ];
                  })}
                  summary={[
                    { label: t('app.hostel.boarders'), value: String(visibleBoarders.length) },
                    { label: t('app.hostel.monthly'), value: formatMoney(monthlyRevenue) },
                  ]}
                />
                {addButton(t('app.hostel.addBoarder'), 'boarder')}
              </>
            )}
          </div>
        </div>
      </Card>

      {tab === 'hostels' && (
        <Card>
          <HostelCards rows={visibleHostels} rooms={rooms} occupiedByRoom={occupiedByRoom} />
          {visibleHostels.length === 0 ? (
            <EmptyState icon="ri-building-4-line" />
          ) : (
            <TableWrap className="hidden md:block">
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.hostel.hostelName')}</Th>
                  <Th>{t('app.hostel.type')}</Th>
                  <Th>{t('app.hostel.warden')}</Th>
                  <Th>{t('app.hostel.address')}</Th>
                  <Th>{t('app.hostel.rooms')}</Th>
                  <Th>{t('app.hostel.occupancy')}</Th>
                </tr>
              </thead>
              <tbody>
                {visibleHostels.map((row) => {
                  const hostelRooms = rooms.filter((room) => room.hostel_id === row.id);
                  const beds = hostelRooms.reduce((sum, room) => sum + room.beds, 0);
                  const used = hostelRooms.reduce((sum, room) => sum + (occupiedByRoom.get(room.id) ?? 0), 0);
                  const rate = beds > 0 ? (used / beds) * 100 : 0;
                  return (
                    <Row key={row.id}>
                      <Td className="text-sm font-medium text-foreground-950 whitespace-nowrap">{row.name}</Td>
                      <Td>
                        <Badge tone={row.hostel_type === 'girls' ? 'accent' : 'secondary'}>
                          {row.hostel_type === 'girls' ? t('app.hostel.girls') : t('app.hostel.boys')}
                        </Badge>
                      </Td>
                      <Td className="text-xs">
                        <p className="text-foreground-900">{row.warden_name ?? '—'}</p>
                        <p className="text-[11px] tabular-nums text-foreground-500" dir="ltr">
                          {row.warden_phone ?? '—'}
                        </p>
                      </Td>
                      <Td className="text-xs text-foreground-600">
                        <span className="block max-w-[220px] truncate">{row.address ?? '—'}</span>
                      </Td>
                      <Td className="text-xs tabular-nums">{hostelRooms.length}</Td>
                      <Td className="min-w-[130px]">
                        <ProgressRow value={rate} />
                      </Td>
                    </Row>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </Card>
      )}

      {tab === 'roomTypes' && (
        <Card>
          <RoomTypeCards rows={roomTypes} rooms={rooms} />
          {roomTypes.length === 0 ? (
            <EmptyState icon="ri-layout-grid-line" />
          ) : (
            <TableWrap className="hidden md:block">
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.hostel.roomType')}</Th>
                  <Th>{t('app.hostel.beds')}</Th>
                  <Th>{t('app.hostel.monthlyFee')}</Th>
                  <Th>{t('app.hostel.rooms')}</Th>
                </tr>
              </thead>
              <tbody>
                {roomTypes.map((row) => (
                  <Row key={row.id}>
                    <Td className="text-sm font-medium text-foreground-950">{row.name}</Td>
                    <Td className="text-xs tabular-nums">{row.beds}</Td>
                    <Td className="text-xs tabular-nums font-semibold">{formatMoney(row.monthly_fee)}</Td>
                    <Td className="text-xs tabular-nums">
                      {rooms.filter((room) => room.room_type_id === row.id).length}
                    </Td>
                  </Row>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      )}

      {tab === 'rooms' && (
        <Card>
          <RoomCards rows={visibleRooms} occupiedByRoom={occupiedByRoom} />
          {visibleRooms.length === 0 ? (
            <EmptyState icon="ri-door-closed-line" />
          ) : (
            <TableWrap className="hidden md:block">
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.hostel.roomNo')}</Th>
                  <Th>{t('app.hostel.hostelName')}</Th>
                  <Th>{t('app.hostel.roomType')}</Th>
                  <Th>{t('app.hostel.floor')}</Th>
                  <Th>{t('app.hostel.beds')}</Th>
                  <Th>{t('app.hostel.monthlyFee')}</Th>
                  <Th>{t('app.hostel.occupancy')}</Th>
                </tr>
              </thead>
              <tbody>
                {visibleRooms.map((row) => {
                  const used = occupiedByRoom.get(row.id) ?? 0;
                  const rate = row.beds > 0 ? (used / row.beds) * 100 : 0;
                  return (
                    <Row key={row.id}>
                      <Td>
                        <Badge tone="neutral">{row.room_no}</Badge>
                      </Td>
                      <Td className="text-xs whitespace-nowrap">{row.hostels?.name ?? '—'}</Td>
                      <Td className="text-xs whitespace-nowrap">{row.hostel_room_types?.name ?? '—'}</Td>
                      <Td className="text-xs whitespace-nowrap">{row.floor ?? '—'}</Td>
                      <Td className="text-xs tabular-nums">
                        {used} / {row.beds}
                      </Td>
                      <Td className="text-xs tabular-nums">{formatMoney(row.hostel_room_types?.monthly_fee ?? 0)}</Td>
                      <Td className="min-w-[130px]">
                        <ProgressRow value={rate} />
                      </Td>
                    </Row>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </Card>
      )}

      {tab === 'boarders' && (
        <Card>
          <BoarderCards
            rows={visibleBoarders}
            rooms={rooms}
            onVacate={async (id) => {
              await vacateHostel(id);
              state.reload();
            }}
          />
          {visibleBoarders.length === 0 ? (
            <EmptyState icon="ri-user-heart-line" />
          ) : (
            <TableWrap className="hidden md:block">
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.hostel.student')}</Th>
                  <Th>{t('app.hostel.hostelName')}</Th>
                  <Th>{t('app.hostel.roomNo')}</Th>
                  <Th>{t('app.hostel.since')}</Th>
                  <Th>{t('app.hostel.monthlyFee')}</Th>
                  <Th>{t('app.common.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {visibleBoarders.map((row) => {
                  const name = `${row.students?.first_name ?? ''} ${row.students?.last_name ?? ''}`.trim();
                  const room = rooms.find((item) => item.id === row.room_id);
                  const fee = room?.hostel_room_types?.monthly_fee ?? 0;
                  return (
                    <Row key={row.id}>
                      <Td>
                        <p className="text-sm font-medium text-foreground-950">{name || '—'}</p>
                        <p className="text-[11px] text-foreground-500 tabular-nums">{row.students?.student_no ?? '—'}</p>
                      </Td>
                      <Td className="text-xs whitespace-nowrap">{row.hostel_rooms?.hostels?.name ?? '—'}</Td>
                      <Td>
                        <Badge tone="accent">{row.hostel_rooms?.room_no ?? '—'}</Badge>
                      </Td>
                      <Td className="text-xs whitespace-nowrap text-foreground-600">
                        {formatDate(row.allocated_on, i18n.language)}
                      </Td>
                      <Td className="text-xs tabular-nums whitespace-nowrap">{formatMoney(fee)}</Td>
                      <Td>
                        <div className="flex items-center gap-1.5">
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
                            onClick={async () => {
                              await vacateHostel(row.id);
                              state.reload();
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-background-300 px-2.5 py-1.5 text-[11px] font-semibold text-foreground-700 hover:border-primary-400 whitespace-nowrap cursor-pointer"
                          >
                            <i className="ri-logout-circle-line" />
                            {t('app.hostel.vacate')}
                          </button>
                        </div>
                      </Td>
                    </Row>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </Card>
      )}

      {modal === 'hostel' && (
        <HostelModal
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            state.reload();
          }}
        />
      )}
      {modal === 'roomType' && (
        <RoomTypeModal
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            state.reload();
          }}
        />
      )}
      {modal === 'room' && (
        <RoomModal
          hostels={hostels}
          roomTypes={roomTypes}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            state.reload();
          }}
        />
      )}
      {modal === 'boarder' && (
        <BoarderModal
          students={students}
          rooms={rooms}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            state.reload();
          }}
        />
      )}
    </>
  );
}