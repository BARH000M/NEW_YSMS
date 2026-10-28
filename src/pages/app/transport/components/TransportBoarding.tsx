import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { RouteRow, StopRow, TransportAllocation, Vehicle } from '@/api/campusOps';
import { formatDate } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import { Badge } from '@/components/app/ui';
import RecordPrintButton from '@/components/app/RecordPrintButton';
import RouteManifestButton from './RouteManifest';
import { buildRouteGroups } from './routeGroups';
import type { RouteGroup } from './routeGroups';

/*
  Boarding register grouped by route, then by stop. A driver picks their route
  once and only ever sees their own run, ordered the way they drive it.
  Each run also carries a seat-fill bar and a printable driver manifest.
*/

export const ALL_ROUTES = 'all';

interface BoardingProps {
  rows: TransportAllocation[];
  routes: RouteRow[];
  stops: StopRow[];
  vehicles: Vehicle[];
  routeId: string;
  onRouteChange: (id: string) => void;
  onRelease: (id: string) => void;
}

export function TransportBoardingGroups({
  rows,
  routes,
  stops,
  vehicles,
  routeId,
  onRouteChange,
  onRelease,
}: BoardingProps) {
  const { t, i18n } = useTranslation();

  const groups = useMemo<RouteGroup[]>(() => buildRouteGroups(rows, routes, vehicles), [rows, routes, vehicles]);

  const selected = routeId === ALL_ROUTES ? groups : groups.filter((group) => group.id === routeId);

  const routeStops = (groupId: string) =>
    stops.filter((stop) => stop.route_id === groupId).sort((a, b) => a.sort_order - b.sort_order);

  const totalRiders = rows.length;
  const totalFare = rows.reduce((sum, row) => sum + Number(row.transport_routes?.fare ?? 0), 0);

  if (rows.length === 0 && routeId === ALL_ROUTES) return null;

  return (
    <>
      {/* Route picker: swipeable on a phone, wrapping on a wider screen. */}
      <div className="-mx-1 px-1 pt-3 pb-1 overflow-x-auto md:overflow-visible">
        <div className="flex items-center gap-1.5 md:flex-wrap min-w-max md:min-w-0">
          <button
            type="button"
            onClick={() => onRouteChange(ALL_ROUTES)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              routeId === ALL_ROUTES
                ? 'bg-primary-500 text-background-50'
                : 'bg-background-100 text-foreground-700 border border-background-200'
            }`}
          >
            <i className="ri-list-check-2 text-sm" />
            {t('app.common.all')}
            <span className="tabular-nums opacity-70">{totalRiders}</span>
          </button>
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => onRouteChange(group.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                routeId === group.id
                  ? 'bg-primary-500 text-background-50'
                  : 'bg-background-100 text-foreground-700 border border-background-200'
              }`}
            >
              <i className="ri-route-line text-sm" />
              {group.name}
              <span className="tabular-nums opacity-70">{group.riders.length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="md:hidden mt-2 divide-y divide-background-100">
        {selected.map((group) => {
          const groupStops = routeStops(group.id);

          const stopBuckets = groupStops
            .map((stop) => ({
              stop,
              riders: group.riders.filter((row) => row.stop_id === stop.id),
            }))
            .filter((bucket) => bucket.riders.length > 0);

          const knownStopIds = new Set(groupStops.map((stop) => stop.id));
          const floaters = group.riders.filter((row) => !row.stop_id || !knownStopIds.has(row.stop_id));

          return (
            <section key={group.id} className="py-3">
              <header className="px-4 pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground-950 truncate">{group.name}</p>
                    <p className="text-[11px] text-foreground-500 truncate">
                      {group.start ?? '—'} → {group.end ?? '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge tone="accent">
                      {group.riders.length} {t('app.transport.students')}
                    </Badge>
                    <RouteManifestButton
                      routeName={group.name}
                      start={group.start}
                      end={group.end}
                      vehicleNo={group.vehicleNo}
                      vehicleModel={group.vehicleModel}
                      driverName={group.driver}
                      driverPhone={group.driverPhone}
                      capacity={group.capacity}
                      stops={groupStops}
                      riders={group.riders}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-foreground-600">
                  <span className="inline-flex items-center gap-1">
                    <i className="ri-bus-2-line text-foreground-400" />
                    {group.vehicleNo}
                  </span>
                  <span className="inline-flex items-center gap-1 truncate">
                    <i className="ri-steering-2-line text-foreground-400" />
                    {group.driver}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <i className="ri-wallet-3-line text-foreground-400" />
                    {formatMoney(group.fare * group.riders.length)}
                  </span>
                </div>

                <SeatFillBar riders={group.riders.length} capacity={group.capacity} />
              </header>

              <div className="px-4 flex flex-col gap-2.5">
                {stopBuckets.map(({ stop, riders }) => (
                  <div key={stop.id} className="rounded-lg border border-background-200 bg-background-50 overflow-hidden">
                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-background-100 border-b border-background-200">
                      <span className="inline-flex items-center gap-1.5 min-w-0 text-[11px] font-semibold text-foreground-800">
                        <i className="ri-map-pin-2-line text-primary-600" />
                        <span className="truncate">{stop.stop_name}</span>
                        {stop.pickup_time ? (
                          <span className="tabular-nums text-foreground-500" dir="ltr">
                            {stop.pickup_time}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-[11px] tabular-nums text-foreground-600 shrink-0">
                        {riders.length} {t('app.transport.students')}
                      </span>
                    </div>
                    <div className="divide-y divide-background-100">
                      {riders.map((row) => (
                        <BoardingRow key={row.id} row={row} onRelease={onRelease} language={i18n.language} />
                      ))}
                    </div>
                  </div>
                ))}

                {floaters.length > 0 ? (
                  <div className="rounded-lg border border-dashed border-background-300 overflow-hidden">
                    <div className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-foreground-600">
                      <i className="ri-map-pin-line" />
                      {t('app.transport.stop')}: —
                    </div>
                    <div className="divide-y divide-background-100">
                      {floaters.map((row) => (
                        <BoardingRow key={row.id} row={row} onRelease={onRelease} language={i18n.language} />
                      ))}
                    </div>
                  </div>
                ) : null}

                {stopBuckets.length === 0 && floaters.length === 0 ? (
                  <p className="text-[11px] text-foreground-500 py-2">{t('app.common.noData')}</p>
                ) : null}
              </div>
            </section>
          );
        })}

        {selected.length === 0 ? (
          <p className="px-4 py-8 text-center text-[11px] text-foreground-500">{t('app.common.noData')}</p>
        ) : null}
      </div>

      {/* Wider screens keep one manifest row per run above the register. */}
      <div className="hidden md:block pt-3 px-2">
        <p className="text-[11px] text-foreground-500">
          {selected.length} {t('app.transport.routes')} · {totalRiders} {t('app.transport.students')} ·{' '}
          {formatMoney(totalFare)}
        </p>
        <div className="mt-2 flex flex-col gap-1.5">
          {selected.map((group) => (
            <div
              key={group.id}
              className="flex items-center gap-3 rounded-md border border-background-200 bg-background-50 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground-950 truncate">{group.name}</p>
                <p className="text-[10px] text-foreground-500 truncate">
                  {group.start ?? '—'} → {group.end ?? '—'} · {group.vehicleNo} · {group.driver}
                </p>
              </div>
              <SeatFillBar riders={group.riders.length} capacity={group.capacity} compact />
              <RouteManifestButton
                routeName={group.name}
                start={group.start}
                end={group.end}
                vehicleNo={group.vehicleNo}
                vehicleModel={group.vehicleModel}
                driverName={group.driver}
                driverPhone={group.driverPhone}
                capacity={group.capacity}
                stops={routeStops(group.id)}
                riders={group.riders}
                size="md"
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* Seats against riders — turns a group header into an instant overfull check. */
function SeatFillBar({
  riders,
  capacity,
  compact = false,
}: {
  riders: number;
  capacity: number;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const hasBus = capacity > 0;
  const ratio = hasBus ? riders / capacity : 0;
  const over = hasBus && riders > capacity;
  const near = hasBus && !over && ratio >= 0.9;
  const pct = hasBus ? Math.min(100, Math.round(ratio * 100)) : 0;

  return (
    <div className={compact ? 'shrink-0 w-[170px]' : 'mt-2'}>
      <div className="flex items-center justify-between gap-2 text-[10px] font-semibold">
        <span className={`inline-flex items-center gap-1 ${over ? 'text-primary-700' : 'text-foreground-600'}`}>
          <i className="ri-user-3-line" />
          {hasBus
            ? t('app.transport.seatFill', { riders, capacity })
            : `${riders} ${t('app.transport.students')}`}
        </span>
        <span className={`tabular-nums ${over ? 'text-primary-700' : 'text-foreground-500'}`}>
          {hasBus ? (over ? t('app.transport.overfull') : `${pct}%`) : t('app.transport.noVehicle')}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-background-200 overflow-hidden mt-1">
        <div
          className={`h-full rounded-full ${over ? 'bg-primary-600' : near ? 'bg-accent-500' : 'bg-secondary-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function BoardingRow({
  row,
  onRelease,
  language,
}: {
  row: TransportAllocation;
  onRelease: (id: string) => void;
  language: string;
}) {
  const { t } = useTranslation();
  const name = `${row.students?.first_name ?? ''} ${row.students?.last_name ?? ''}`.trim();

  return (
    <div className="px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground-950 truncate">{name || '—'}</p>
          <p className="text-[11px] text-foreground-500 tabular-nums truncate">
            {row.students?.student_no ?? '—'}
          </p>
        </div>
        <p className="text-xs font-bold text-foreground-950 tabular-nums shrink-0 whitespace-nowrap">
          {formatMoney(row.transport_routes?.fare ?? 0)}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 mt-1.5">
        <p className="text-[11px] text-foreground-500 tabular-nums truncate">
          {t('app.transport.since')}: {formatDate(row.allocated_on, language)}
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
              formatDate(row.allocated_on, language),
            ]}
          />
          <button
            type="button"
            onClick={() => onRelease(row.id)}
            className="inline-flex items-center gap-1 rounded-md border border-background-300 px-2 py-1.5 text-[11px] font-semibold text-foreground-700 whitespace-nowrap cursor-pointer"
            aria-label={t('app.transport.release')}
          >
            <i className="ri-logout-circle-line" />
          </button>
        </div>
      </div>
    </div>
  );
}