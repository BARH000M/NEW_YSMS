import { useTranslation } from 'react-i18next';
import type { RouteRow, StopRow, TransportAllocation, Vehicle } from '@/api/campusOps';
import { formatDate } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import { Badge } from '@/components/app/ui';
import RecordPrintButton from '@/components/app/RecordPrintButton';
import { isOverfull, vehicleCapacity } from './routeGroups';

/*
  Phone registers for transport. Every list is a vertical card stack so the
  columns never have to be dragged sideways on a narrow screen.
*/

interface VehicleCardsProps {
  rows: Vehicle[];
  routes: RouteRow[];
  onToggle: (vehicle: Vehicle) => void;
}

export function TransportVehicleCards({ rows, routes, onToggle }: VehicleCardsProps) {
  const { t, i18n } = useTranslation();
  if (rows.length === 0) return null;

  return (
    <div className="md:hidden divide-y divide-background-100">
      {rows.map((row) => {
        const assigned = routes.filter((route) => route.vehicle_id === row.id);
        return (
          <div key={row.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground-950 truncate">{row.vehicle_no}</p>
                <p className="text-[11px] text-foreground-500 truncate">{row.model ?? '—'}</p>
              </div>
              <Badge tone={row.is_active ? 'secondary' : 'neutral'}>
                {row.is_active ? t('app.common.active') : t('app.common.inactive')}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-foreground-600">
              <span className="inline-flex items-center gap-1">
                <i className="ri-group-line text-foreground-400" />
                {t('app.transport.capacity')}: <span className="tabular-nums font-medium text-foreground-800">{row.capacity}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <i className="ri-calendar-event-line text-foreground-400" />
                {row.insurance_expiry ? formatDate(row.insurance_expiry, i18n.language) : '—'}
              </span>
            </div>

            <p className="text-[11px] text-foreground-600 mt-1.5 truncate">
              <i className="ri-steering-2-line text-foreground-400 me-1" />
              {row.driver_name ?? '—'}
              {row.driver_phone ? (
                <span dir="ltr" className="tabular-nums text-foreground-500"> · {row.driver_phone}</span>
              ) : null}
            </p>

            {assigned.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-2">
                {assigned.map((route) => (
                  <Badge key={route.id} tone="secondary">
                    {route.name}
                  </Badge>
                ))}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => onToggle(row)}
              className={`mt-2.5 inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                row.is_active
                  ? 'border-secondary-300 text-secondary-900 bg-secondary-100'
                  : 'border-background-300 text-foreground-600'
              }`}
            >
              <i className={row.is_active ? 'ri-checkbox-circle-line' : 'ri-forbid-line'} />
              {row.is_active ? t('app.common.active') : t('app.common.inactive')}
            </button>
          </div>
        );
      })}
    </div>
  );
}

interface RouteCardsProps {
  rows: RouteRow[];
  stops: StopRow[];
  active: TransportAllocation[];
  vehicles: Vehicle[];
  vehicleLabel: (id: string | null) => string;
}

export function TransportRouteCards({ rows, stops, active, vehicles, vehicleLabel }: RouteCardsProps) {
  const { t } = useTranslation();
  if (rows.length === 0) return null;

  return (
    <div className="md:hidden divide-y divide-background-100">
      {rows.map((row) => {
        const routeStops = stops.filter((stop) => stop.route_id === row.id);
        const riders = active.filter((item) => item.route_id === row.id).length;
        const capacity = vehicleCapacity(row, vehicles);
        const over = isOverfull(riders, capacity);
        return (
          <div key={row.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground-950 truncate">{row.name}</p>
                <p className="text-[11px] text-foreground-500 truncate">
                  {row.start_point ?? '—'} → {row.end_point ?? '—'}
                </p>
              </div>
              <p className="text-sm font-bold text-foreground-950 tabular-nums shrink-0">{formatMoney(row.fare)}</p>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-foreground-600">
              <span className="inline-flex items-center gap-1">
                <i className="ri-route-line text-foreground-400" />
                {row.distance_km ? `${row.distance_km} km` : '—'}
              </span>
              <span className="inline-flex items-center gap-1 truncate">
                <i className="ri-bus-2-line text-foreground-400" />
                {vehicleLabel(row.vehicle_id)}
              </span>
              <Badge tone={riders > 0 ? 'accent' : 'neutral'}>
                {riders} {t('app.transport.students')}
              </Badge>
              {over ? (
                <Badge tone="danger">
                  <i className="ri-error-warning-line" />
                  {t('app.transport.overfull')} · {riders}/{capacity}
                </Badge>
              ) : null}
            </div>

            {routeStops.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-2">
                {routeStops.map((stop) => (
                  <span
                    key={stop.id}
                    className="inline-flex items-center gap-1 rounded-full bg-background-100 border border-background-200 px-2 py-0.5 text-[10px] text-foreground-700"
                  >
                    <i className="ri-map-pin-line text-[10px]" />
                    {stop.stop_name}
                    {stop.pickup_time ? <span className="tabular-nums opacity-70">{stop.pickup_time}</span> : null}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

interface AllocationCardsProps {
  rows: TransportAllocation[];
  onRelease: (id: string) => void;
}

export function TransportAllocationCards({ rows, onRelease }: AllocationCardsProps) {
  const { t, i18n } = useTranslation();
  if (rows.length === 0) return null;

  return (
    <div className="md:hidden divide-y divide-background-100">
      {rows.map((row) => {
        const name = `${row.students?.first_name ?? ''} ${row.students?.last_name ?? ''}`.trim();
        return (
          <div key={row.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground-950 truncate">{name || '—'}</p>
                <p className="text-[11px] text-foreground-500 tabular-nums">{row.students?.student_no ?? '—'}</p>
              </div>
              <p className="text-sm font-bold text-foreground-950 tabular-nums shrink-0">
                {formatMoney(row.transport_routes?.fare ?? 0)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <Badge tone="secondary">{row.transport_routes?.name ?? '—'}</Badge>
              <span className="text-[11px] text-foreground-600 truncate">
                {row.transport_route_stops?.stop_name ?? '—'}
              </span>
              {row.transport_route_stops?.pickup_time ? (
                <span className="text-[11px] tabular-nums text-foreground-500" dir="ltr">
                  {row.transport_route_stops.pickup_time}
                </span>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-2 mt-2.5">
              <p className="text-[11px] text-foreground-500 tabular-nums truncate">
                {t('app.transport.since')}: {formatDate(row.allocated_on, i18n.language)}
              </p>
              <div className="flex items-center gap-1.5 shrink-0">
                <RecordPrintButton
                  title={`${t('app.transport.title')} — ${name}`}
                  columns={[
                    t('app.transport.student'),
                    t('app.common.reference'),
                    t('app.transport.route'),
                    t('app.transport.stop'),
                    t('app.transport.pickup'),
                    t('app.transport.fare'),
                    t('app.transport.since'),
                  ]}
                  values={[
                    name,
                    row.students?.student_no ?? '',
                    row.transport_routes?.name ?? '',
                    row.transport_route_stops?.stop_name ?? '',
                    row.transport_route_stops?.pickup_time ?? '',
                    formatMoney(row.transport_routes?.fare ?? 0),
                    formatDate(row.allocated_on, i18n.language),
                  ]}
                />
                <button
                  type="button"
                  onClick={() => onRelease(row.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-background-300 px-2.5 py-1.5 text-[11px] font-semibold text-foreground-700 whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-logout-circle-line" />
                  {t('app.transport.release')}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}