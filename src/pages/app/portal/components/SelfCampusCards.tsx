import { useTranslation } from 'react-i18next';
import type { SelfHostel, SelfTransport } from '@/api/portal';
import { formatMoney } from '@/utils/money';
import { Badge, Card, CardHeader, EmptyState } from '@/components/app/ui';

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-background-100 last:border-b-0">
      <span className="w-7 h-7 rounded-md bg-background-100 text-foreground-600 flex items-center justify-center shrink-0">
        <i className={`${icon} text-sm`} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-500">{label}</p>
        <p className="text-xs font-medium text-foreground-900 break-words">{value}</p>
      </div>
    </div>
  );
}

export default function SelfCampusCards({
  transport,
  hostel,
}: {
  transport: SelfTransport | null;
  hostel: SelfHostel | null;
}) {
  const { t } = useTranslation();

  const route = transport?.transport_routes ?? null;
  const stop = transport?.transport_route_stops ?? null;
  const vehicle = route?.transport_vehicles ?? null;
  const room = hostel?.hostel_rooms ?? null;
  const roomType = room?.hostel_room_types ?? null;
  const building = room?.hostels ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mt-3 md:mt-4">
      <Card>
        <CardHeader
          title={t('app.portal.myTransport')}
          action={vehicle?.vehicle_no ? <Badge tone="secondary">{vehicle.vehicle_no}</Badge> : undefined}
        />
        {!route ? (
          <EmptyState icon="ri-bus-2-line" label={t('app.portal.noTransport')} />
        ) : (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-9 h-9 rounded-lg bg-secondary-100 text-secondary-900 flex items-center justify-center shrink-0">
                <i className="ri-bus-2-line" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground-950 truncate">{route.name}</p>
                <p className="text-[11px] text-foreground-500 truncate">
                  {[route.start_point, route.end_point].filter(Boolean).join(' → ') || '—'}
                </p>
              </div>
            </div>
            <div className="mt-2">
              <DetailRow icon="ri-map-pin-line" label={t('app.portal.stop')} value={stop?.stop_name ?? '—'} />
              <DetailRow icon="ri-sun-line" label={t('app.portal.pickup')} value={stop?.pickup_time ?? '—'} />
              <DetailRow icon="ri-moon-line" label={t('app.portal.drop')} value={stop?.drop_time ?? '—'} />
              <DetailRow
                icon="ri-user-star-line"
                label={t('app.portal.driver')}
                value={
                  vehicle?.driver_name
                    ? `${vehicle.driver_name}${vehicle.driver_phone ? ` · ${vehicle.driver_phone}` : ''}`
                    : '—'
                }
              />
              <DetailRow icon="ri-money-rupee-circle-line" label={t('app.portal.fare')} value={formatMoney(route.fare ?? 0)} />
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title={t('app.portal.myHostel')}
          action={room?.room_no ? <Badge tone="accent">{`${t('app.portal.room')} ${room.room_no}`}</Badge> : undefined}
        />
        {!room ? (
          <EmptyState icon="ri-building-4-line" label={t('app.portal.noHostel')} />
        ) : (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-9 h-9 rounded-lg bg-accent-100 text-accent-900 flex items-center justify-center shrink-0">
                <i className="ri-building-4-line" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground-950 truncate">{building?.name ?? '—'}</p>
                <p className="text-[11px] text-foreground-500 truncate">
                  {t('app.portal.room')} {room.room_no}
                  {room.floor ? ` · ${room.floor}` : ''}
                </p>
              </div>
            </div>
            <div className="mt-2">
              <DetailRow icon="ri-hotel-bed-line" label={t('app.portal.roomType')} value={roomType?.name ?? '—'} />
              <DetailRow
                icon="ri-money-rupee-circle-line"
                label={t('app.portal.monthlyFee')}
                value={formatMoney(roomType?.monthly_fee ?? 0)}
              />
              <DetailRow
                icon="ri-user-star-line"
                label={t('app.portal.warden')}
                value={
                  building?.warden_name
                    ? `${building.warden_name}${building.warden_phone ? ` · ${building.warden_phone}` : ''}`
                    : '—'
                }
              />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}