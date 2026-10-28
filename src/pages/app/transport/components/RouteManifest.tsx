import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TransportAllocation } from '@/api/campusOps';
import PrintSheet from '@/components/app/PrintSheet';
import { formatMoney } from '@/utils/money';

/**
 * Driver manifest. One sheet per run: the route header, the bus and driver
 * details, then every stop in driving order with the students boarding there.
 * A driver takes this out of the office and works from it all morning.
 */

export interface ManifestStop {
  id: string;
  stop_name: string;
  pickup_time: string | null;
}

export interface RouteManifestProps {
  routeName: string;
  start: string | null;
  end: string | null;
  vehicleNo: string;
  vehicleModel?: string | null;
  driverName: string;
  driverPhone?: string | null;
  capacity: number;
  stops: ManifestStop[];
  riders: TransportAllocation[];
  size?: 'sm' | 'md';
}

export default function RouteManifestButton({
  routeName,
  start,
  end,
  vehicleNo,
  vehicleModel,
  driverName,
  driverPhone,
  capacity,
  stops,
  riders,
  size = 'sm',
}: RouteManifestProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const sections = useMemo(() => {
    // Stops arrive already ordered along the run — keep that driving order.
    const ordered = stops
      .map((stop) => ({
        stop,
        riders: riders.filter((row) => row.stop_id === stop.id),
      }))
      .filter((bucket) => bucket.riders.length > 0);

    const known = new Set(stops.map((stop) => stop.id));
    const floaters = riders.filter((row) => !row.stop_id || !known.has(row.stop_id));

    if (floaters.length > 0) {
      ordered.push({
        stop: { id: '__none__', stop_name: t('app.transport.stop'), pickup_time: null },
        riders: floaters,
      });
    }

    return ordered;
  }, [stops, riders, t]);

  const totalFare = riders.reduce((sum, row) => sum + Number(row.transport_routes?.fare ?? 0), 0);
  const stamp = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t('app.transport.manifest')}
        aria-label={t('app.transport.manifest')}
        className={`${size === 'sm' ? 'w-8 h-8' : 'w-9 h-9'} shrink-0 inline-flex items-center justify-center rounded-md border border-background-300 text-foreground-700 hover:border-primary-400 whitespace-nowrap cursor-pointer`}
      >
        <i className="ri-file-list-3-line text-sm" />
      </button>

      {open && (
        <PrintSheet
          title={`${t('app.transport.manifest')} — ${routeName}`}
          hint={t('app.transport.manifestHint')}
          onClose={() => setOpen(false)}
        >
          <div className="p-6 md:p-8">
            <div className="flex items-start justify-between gap-4 border-b-2 border-foreground-900 pb-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground-500">
                  {t('app.transport.manifest')}
                </p>
                <h2 className="font-heading text-xl text-foreground-950 mt-1">{routeName}</h2>
                <p className="text-[11px] text-foreground-700 mt-1">
                  {start ?? '—'} <span className="text-foreground-400">→</span> {end ?? '—'}
                </p>
              </div>
              <div className="text-end shrink-0">
                <p className="text-[10px] uppercase tracking-wide text-foreground-500">{t('app.print.generated')}</p>
                <p className="text-[11px] font-semibold text-foreground-900 tabular-nums">{stamp}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4">
              <p className="text-[11px] text-foreground-800">
                <span className="font-semibold">{t('app.transport.vehicleNo')}:</span> {vehicleNo || '—'}
              </p>
              <p className="text-[11px] text-foreground-800">
                <span className="font-semibold">{t('app.transport.model')}:</span> {vehicleModel || '—'}
              </p>
              <p className="text-[11px] text-foreground-800">
                <span className="font-semibold">{t('app.transport.driver')}:</span> {driverName || '—'}
              </p>
              <p className="text-[11px] text-foreground-800" dir="ltr">
                <span className="font-semibold">{t('app.common.phone')}:</span> {driverPhone || '—'}
              </p>
              <p className="text-[11px] text-foreground-800">
                <span className="font-semibold">{t('app.transport.capacity')}:</span> {capacity || '—'}
              </p>
              <p className="text-[11px] text-foreground-800">
                <span className="font-semibold">{t('app.transport.students')}:</span> {riders.length}
              </p>
            </div>

            {sections.length === 0 ? (
              <p className="mt-6 text-[11px] text-foreground-500">{t('app.common.noData')}</p>
            ) : (
              <div className="mt-5 flex flex-col gap-4">
                {sections.map(({ stop, riders: stopRiders }, index) => (
                  <div key={stop.id} className="border border-background-300 rounded-md overflow-hidden">
                    <div className="flex items-center justify-between gap-3 bg-background-100 px-3 py-2 border-b border-background-300">
                      <p className="text-[11px] font-bold text-foreground-900">
                        <span className="inline-flex w-4 h-4 items-center justify-center me-1.5 rounded-full bg-foreground-900 text-background-50 text-[9px] tabular-nums">
                          {index + 1}
                        </span>
                        {stop.stop_name}
                      </p>
                      <p className="text-[10px] text-foreground-600 tabular-nums whitespace-nowrap">
                        {stop.pickup_time ? `${t('app.transport.pickup')} ${stop.pickup_time}` : '—'} ·{' '}
                        {stopRiders.length} {t('app.transport.students')}
                      </p>
                    </div>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-background-50">
                          <th className="text-start text-[9px] font-bold uppercase tracking-wide text-foreground-600 px-3 py-1.5 border-b border-background-200 w-8">
                            #
                          </th>
                          <th className="text-start text-[9px] font-bold uppercase tracking-wide text-foreground-600 px-3 py-1.5 border-b border-background-200">
                            {t('app.transport.student')}
                          </th>
                          <th className="text-start text-[9px] font-bold uppercase tracking-wide text-foreground-600 px-3 py-1.5 border-b border-background-200">
                            {t('app.common.reference')}
                          </th>
                          <th className="text-end text-[9px] font-bold uppercase tracking-wide text-foreground-600 px-3 py-1.5 border-b border-background-200">
                            {t('app.transport.fare')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {stopRiders.map((row, rowIndex) => {
                          const name = `${row.students?.first_name ?? ''} ${row.students?.last_name ?? ''}`.trim();
                          return (
                            <tr key={row.id} className="border-b border-background-100 last:border-b-0">
                              <td className="px-3 py-1.5 text-[10px] text-foreground-500 tabular-nums">
                                {rowIndex + 1}
                              </td>
                              <td className="px-3 py-1.5 text-[11px] text-foreground-900">{name || '—'}</td>
                              <td className="px-3 py-1.5 text-[10px] text-foreground-600 tabular-nums">
                                {row.students?.student_no ?? '—'}
                              </td>
                              <td className="px-3 py-1.5 text-[10px] text-foreground-800 tabular-nums text-end">
                                {formatMoney(row.transport_routes?.fare ?? 0)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-4 border-t border-background-300 pt-2">
              <p className="text-[10px] text-foreground-600">
                {t('app.transport.seatFill', { riders: riders.length, capacity: capacity || '—' })}
              </p>
              <p className="text-[11px] font-semibold text-foreground-900 tabular-nums">{formatMoney(totalFare)}</p>
            </div>

            <div className="mt-10 flex items-center justify-between gap-6 text-[11px] text-foreground-600">
              <span className="border-t border-background-300 pt-1 w-40">{t('app.transport.driverSign')}</span>
              <span className="border-t border-background-300 pt-1 w-40 text-end">{t('app.transport.officerSign')}</span>
            </div>
            <p className="mt-4 text-[10px] text-foreground-500">{t('app.print.docFooter')}</p>
          </div>
        </PrintSheet>
      )}
    </>
  );
}