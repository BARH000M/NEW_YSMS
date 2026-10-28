import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { fetchStudents } from '@/api/college';
import {
  fetchRoutes,
  fetchStops,
  fetchTransportAllocations,
  fetchVehicles,
  releaseTransport,
  setVehicleActive,
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
  Row,
  SearchBox,
  StatCard,
  TableWrap,
  Tabs,
  Td,
  Th,
} from '@/components/app/ui';
import { AllocationModal, RouteModal, StopModal, VehicleModal } from './components/TransportModals';
import { TransportRouteCards, TransportVehicleCards } from './components/TransportMobileCards';
import { ALL_ROUTES, TransportBoardingGroups } from './components/TransportBoarding';

type ModalKind = 'vehicle' | 'route' | 'stop' | 'allocation' | null;

export default function TransportPage() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState('vehicles');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<ModalKind>(null);
  const [boardingRoute, setBoardingRoute] = useState<string>(ALL_ROUTES);

  const state = useAsync(async () => {
    const [vehicles, routes, stops, allocations, students] = await Promise.all([
      fetchVehicles(),
      fetchRoutes(),
      fetchStops(),
      fetchTransportAllocations(),
      fetchStudents(),
    ]);
    return { vehicles, routes, stops, allocations, students };
  }, []);

  if (state.loading) return <LoadingBlock />;
  if (state.error || !state.data) return <ErrorState message={state.error ?? 'No data'} onRetry={state.reload} />;

  const { vehicles, routes, stops, allocations, students } = state.data;
  const term = query.trim().toLowerCase();
  const active = allocations.filter((row) => row.is_active);

  const visibleVehicles = vehicles.filter(
    (row) =>
      !term ||
      row.vehicle_no.toLowerCase().includes(term) ||
      (row.driver_name ?? '').toLowerCase().includes(term) ||
      (row.model ?? '').toLowerCase().includes(term),
  );
  const visibleRoutes = routes.filter(
    (row) =>
      !term ||
      row.name.toLowerCase().includes(term) ||
      (row.start_point ?? '').toLowerCase().includes(term) ||
      (row.end_point ?? '').toLowerCase().includes(term),
  );
  const visibleAllocations = active.filter(
    (row) =>
      !term ||
      `${row.students?.first_name ?? ''} ${row.students?.last_name ?? ''}`.toLowerCase().includes(term) ||
      (row.students?.student_no ?? '').toLowerCase().includes(term) ||
      (row.transport_routes?.name ?? '').toLowerCase().includes(term),
  );

  const monthly = active.reduce((sum, row) => sum + toNumber(row.transport_routes?.fare), 0);
  const seats = vehicles.reduce((sum, row) => sum + row.capacity, 0);

  // Boarding register: one route at a time, ordered stop by stop along the run.
  const stopOrder = new Map(stops.map((stop) => [stop.id, stop.sort_order]));
  const boardingRows = (
    boardingRoute === ALL_ROUTES
      ? visibleAllocations
      : visibleAllocations.filter((row) => row.route_id === boardingRoute)
  )
    .slice()
    .sort((a, b) => {
      if (a.route_id !== b.route_id) {
        return (a.transport_routes?.name ?? '').localeCompare(b.transport_routes?.name ?? '');
      }
      return (stopOrder.get(a.stop_id ?? '') ?? 9999) - (stopOrder.get(b.stop_id ?? '') ?? 9999);
    });

  const vehicleLabel = (id: string | null) =>
    vehicles.find((vehicle) => vehicle.id === id)?.vehicle_no ?? '—';

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
      <PageHeader title={t('app.transport.title')} subtitle={t('app.transport.subtitle')} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <StatCard label={t('app.transport.vehicles')} value={vehicles.length} icon="ri-bus-2-line" tone="primary" />
        <StatCard label={t('app.transport.routes')} value={routes.length} icon="ri-route-line" tone="accent" />
        <StatCard label={t('app.transport.onBoard')} value={active.length} icon="ri-user-location-line" tone="secondary" />
        <StatCard
          label={t('app.transport.monthly')}
          value={formatMoney(monthly)}
          icon="ri-wallet-3-line"
          tone="neutral"
          hint={t('app.transport.seats', { count: seats })}
        />
      </div>

      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { key: 'vehicles', label: t('app.transport.tabVehicles'), count: vehicles.length },
              { key: 'routes', label: t('app.transport.tabRoutes'), count: routes.length },
              { key: 'allocations', label: t('app.transport.tabAllocations'), count: active.length },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <SearchBox value={query} onChange={setQuery} />
            {tab === 'vehicles' && (
              <>
                <ExportBar
                  title={t('app.transport.vehicleList')}
                  fileName="transport-vehicles"
                  columns={[
                    t('app.transport.vehicleNo'),
                    t('app.transport.model'),
                    t('app.transport.capacity'),
                    t('app.transport.driverName'),
                    t('app.common.phone'),
                    t('app.transport.license'),
                    t('app.transport.insurance'),
                  ]}
                  rows={visibleVehicles.map((row) => [
                    row.vehicle_no,
                    row.model ?? '—',
                    row.capacity,
                    row.driver_name ?? '—',
                    row.driver_phone ?? '—',
                    row.driver_license ?? '—',
                    row.insurance_expiry ? formatDate(row.insurance_expiry, i18n.language) : '—',
                  ])}
                  summary={[{ label: t('app.transport.seats', { count: seats }), value: String(seats) }]}
                />
                {addButton(t('app.transport.addVehicle'), 'vehicle')}
              </>
            )}
            {tab === 'routes' && (
              <>
                <ExportBar
                  title={t('app.transport.routeList')}
                  fileName="transport-routes"
                  columns={[
                    t('app.transport.routeName'),
                    t('app.transport.startPoint'),
                    t('app.transport.endPoint'),
                    t('app.transport.distance'),
                    t('app.transport.fare'),
                    t('app.transport.vehicle'),
                    t('app.transport.stops'),
                  ]}
                  rows={visibleRoutes.map((row) => [
                    row.name,
                    row.start_point ?? '—',
                    row.end_point ?? '—',
                    row.distance_km ?? '—',
                    formatMoney(row.fare),
                    vehicleLabel(row.vehicle_id),
                    String(stops.filter((stop) => stop.route_id === row.id).length),
                  ])}
                />
                {addButton(t('app.transport.addStop'), 'stop')}
                {addButton(t('app.transport.addRoute'), 'route')}
              </>
            )}
            {tab === 'allocations' && (
              <>
                <ExportBar
                  title={t('app.transport.allocationList')}
                  fileName="transport-allocations"
                  columns={[
                    t('app.transport.student'),
                    t('app.common.reference'),
                    t('app.transport.route'),
                    t('app.transport.stop'),
                    t('app.transport.pickup'),
                    t('app.transport.fare'),
                    t('app.transport.since'),
                  ]}
                  rows={visibleAllocations.map((row) => [
                    `${row.students?.first_name ?? ''} ${row.students?.last_name ?? ''}`.trim(),
                    row.students?.student_no ?? '',
                    row.transport_routes?.name ?? '',
                    row.transport_route_stops?.stop_name ?? '',
                    row.transport_route_stops?.pickup_time ?? '',
                    formatMoney(row.transport_routes?.fare ?? 0),
                    formatDate(row.allocated_on, i18n.language),
                  ])}
                  summary={[
                    { label: t('app.transport.monthly'), value: formatMoney(monthly) },
                    { label: t('app.transport.students'), value: String(visibleAllocations.length) },
                  ]}
                />
                {addButton(t('app.transport.assignStudent'), 'allocation')}
              </>
            )}
          </div>
        </div>
      </Card>

      {tab === 'vehicles' && (
        <Card>
          <TransportVehicleCards
            rows={visibleVehicles}
            routes={routes}
            onToggle={async (vehicle) => {
              await setVehicleActive(vehicle.id, !vehicle.is_active);
              state.reload();
            }}
          />
          {visibleVehicles.length === 0 ? (
            <EmptyState icon="ri-bus-2-line" />
          ) : (
            <TableWrap className="hidden md:block">
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.transport.vehicleNo')}</Th>
                  <Th>{t('app.transport.model')}</Th>
                  <Th>{t('app.transport.capacity')}</Th>
                  <Th>{t('app.transport.driver')}</Th>
                  <Th>{t('app.transport.insurance')}</Th>
                  <Th>{t('app.transport.assignedRoutes')}</Th>
                  <Th>{t('app.common.status')}</Th>
                </tr>
              </thead>
              <tbody>
                {visibleVehicles.map((row) => {
                  const assigned = routes.filter((route) => route.vehicle_id === row.id);
                  return (
                    <Row key={row.id}>
                      <Td>
                        <p className="text-sm font-semibold text-foreground-950">{row.vehicle_no}</p>
                        <p className="text-[11px] text-foreground-500">{row.notes ?? '—'}</p>
                      </Td>
                      <Td className="text-xs text-foreground-700 whitespace-nowrap">{row.model ?? '—'}</Td>
                      <Td className="text-xs tabular-nums">{row.capacity}</Td>
                      <Td className="text-xs">
                        <p className="text-foreground-900">{row.driver_name ?? '—'}</p>
                        <p className="text-[11px] tabular-nums text-foreground-500" dir="ltr">
                          {row.driver_phone ?? '—'}
                        </p>
                      </Td>
                      <Td className="text-xs whitespace-nowrap text-foreground-600">
                        {row.insurance_expiry ? formatDate(row.insurance_expiry, i18n.language) : '—'}
                      </Td>
                      <Td className="text-xs">
                        {assigned.length === 0 ? (
                          <span className="text-foreground-400">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {assigned.map((route) => (
                              <Badge key={route.id} tone="secondary">
                                {route.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </Td>
                      <Td>
                        <button
                          type="button"
                          onClick={async () => {
                            await setVehicleActive(row.id, !row.is_active);
                            state.reload();
                          }}
                          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                            row.is_active
                              ? 'border-secondary-300 text-secondary-900 bg-secondary-100'
                              : 'border-background-300 text-foreground-600'
                          }`}
                        >
                          <i className={row.is_active ? 'ri-checkbox-circle-line' : 'ri-forbid-line'} />
                          {row.is_active ? t('app.common.active') : t('app.common.inactive')}
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

      {tab === 'routes' && (
        <Card>
          <TransportRouteCards
            rows={visibleRoutes}
            stops={stops}
            active={active}
            vehicleLabel={vehicleLabel}
          />
          {visibleRoutes.length === 0 ? (
            <EmptyState icon="ri-route-line" />
          ) : (
            <TableWrap className="hidden md:block">
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.transport.routeName')}</Th>
                  <Th>{t('app.transport.startPoint')}</Th>
                  <Th>{t('app.transport.endPoint')}</Th>
                  <Th>{t('app.transport.distance')}</Th>
                  <Th>{t('app.transport.fare')}</Th>
                  <Th>{t('app.transport.vehicle')}</Th>
                  <Th>{t('app.transport.stops')}</Th>
                  <Th>{t('app.transport.onBoard')}</Th>
                </tr>
              </thead>
              <tbody>
                {visibleRoutes.map((row) => {
                  const routeStops = stops.filter((stop) => stop.route_id === row.id);
                  const riders = active.filter((item) => item.route_id === row.id).length;
                  return (
                    <Row key={row.id}>
                      <Td>
                        <p className="text-sm font-medium text-foreground-950">{row.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1 max-w-[260px]">
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
                          {routeStops.length === 0 && <span className="text-[11px] text-foreground-400">—</span>}
                        </div>
                      </Td>
                      <Td className="text-xs whitespace-nowrap">{row.start_point ?? '—'}</Td>
                      <Td className="text-xs whitespace-nowrap">{row.end_point ?? '—'}</Td>
                      <Td className="text-xs tabular-nums whitespace-nowrap">
                        {row.distance_km ? `${row.distance_km} km` : '—'}
                      </Td>
                      <Td className="text-xs tabular-nums font-semibold whitespace-nowrap">{formatMoney(row.fare)}</Td>
                      <Td className="text-xs whitespace-nowrap">{vehicleLabel(row.vehicle_id)}</Td>
                      <Td className="text-xs tabular-nums">{routeStops.length}</Td>
                      <Td>
                        <Badge tone={riders > 0 ? 'accent' : 'neutral'}>{riders}</Badge>
                      </Td>
                    </Row>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </Card>
      )}

      {tab === 'allocations' && (
        <Card>
          <TransportBoardingGroups
            rows={boardingRows}
            routes={routes}
            stops={stops}
            vehicles={vehicles}
            routeId={boardingRoute}
            onRouteChange={setBoardingRoute}
            onRelease={async (id) => {
              await releaseTransport(id);
              state.reload();
            }}
          />
          {visibleAllocations.length === 0 ? (
            <EmptyState icon="ri-user-location-line" />
          ) : (
            <TableWrap className="hidden md:block">
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <Th>{t('app.transport.student')}</Th>
                  <Th>{t('app.transport.route')}</Th>
                  <Th>{t('app.transport.stop')}</Th>
                  <Th>{t('app.transport.pickup')}</Th>
                  <Th>{t('app.transport.fare')}</Th>
                  <Th>{t('app.transport.since')}</Th>
                  <Th>{t('app.common.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {boardingRows.map((row) => {
                  const name = `${row.students?.first_name ?? ''} ${row.students?.last_name ?? ''}`.trim();
                  return (
                    <Row key={row.id}>
                      <Td>
                        <p className="text-sm font-medium text-foreground-950">{name || '—'}</p>
                        <p className="text-[11px] text-foreground-500 tabular-nums">{row.students?.student_no ?? '—'}</p>
                      </Td>
                      <Td>
                        <Badge tone="secondary">{row.transport_routes?.name ?? '—'}</Badge>
                      </Td>
                      <Td className="text-xs whitespace-nowrap">{row.transport_route_stops?.stop_name ?? '—'}</Td>
                      <Td className="text-xs tabular-nums whitespace-nowrap" dir="ltr">
                        {row.transport_route_stops?.pickup_time ?? '—'}
                      </Td>
                      <Td className="text-xs tabular-nums whitespace-nowrap">
                        {formatMoney(row.transport_routes?.fare ?? 0)}
                      </Td>
                      <Td className="text-xs whitespace-nowrap text-foreground-600">
                        {formatDate(row.allocated_on, i18n.language)}
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1.5">
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
                            onClick={async () => {
                              await releaseTransport(row.id);
                              state.reload();
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-background-300 px-2.5 py-1.5 text-[11px] font-semibold text-foreground-700 hover:border-primary-400 whitespace-nowrap cursor-pointer"
                          >
                            <i className="ri-logout-circle-line" />
                            {t('app.transport.release')}
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

      {modal === 'vehicle' && (
        <VehicleModal
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            state.reload();
          }}
        />
      )}
      {modal === 'route' && (
        <RouteModal
          vehicles={vehicles}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            state.reload();
          }}
        />
      )}
      {modal === 'stop' && (
        <StopModal
          routes={routes}
          activeRouteId={routes[0]?.id ?? ''}
          nextOrder={stops.length + 1}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            state.reload();
          }}
        />
      )}
      {modal === 'allocation' && (
        <AllocationModal
          students={students}
          routes={routes}
          stops={stops}
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