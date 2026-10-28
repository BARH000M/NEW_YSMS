import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RouteRow, StopRow, TransportAllocation, Vehicle } from '@/api/campusOps';
import PrintSheet from '@/components/app/PrintSheet';
import { RouteManifestSheet } from './RouteManifest';
import { buildRouteGroups } from './routeGroups';

/*
  Fleet-wide manifest printout: one A4 page per route, in route-name order,
  so the transport office can hand every driver their own sheet in one go.
*/

export default function FleetManifestsButton({
  rows,
  routes,
  stops,
  vehicles,
}: {
  rows: TransportAllocation[];
  routes: RouteRow[];
  stops: StopRow[];
  vehicles: Vehicle[];
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const groups = useMemo(
    () => buildRouteGroups(rows, routes, vehicles).filter((group) => group.riders.length > 0),
    [rows, routes, vehicles],
  );

  const stopsFor = (routeId: string) =>
    stops.filter((stop) => stop.route_id === routeId).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={groups.length === 0}
        className="inline-flex items-center gap-1.5 border border-background-300 bg-background-50 hover:border-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-foreground-800 text-xs font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
      >
        <i className="ri-file-list-3-line" />
        {t('app.transport.printAllManifests')}
        <span className="tabular-nums opacity-60">{groups.length}</span>
      </button>

      {open && (
        <PrintSheet
          title={t('app.transport.printAllManifests')}
          hint={t('app.transport.printAllHint')}
          onClose={() => setOpen(false)}
        >
          <div>
            {groups.map((group, index) => (
              <div key={group.id} className={index < groups.length - 1 ? 'print-page-break' : ''}>
                <RouteManifestSheet
                  routeName={group.name}
                  start={group.start}
                  end={group.end}
                  vehicleNo={group.vehicleNo}
                  vehicleModel={group.vehicleModel}
                  driverName={group.driver}
                  driverPhone={group.driverPhone}
                  capacity={group.capacity}
                  stops={stopsFor(group.id)}
                  riders={group.riders}
                />
              </div>
            ))}
          </div>
        </PrintSheet>
      )}
    </>
  );
}