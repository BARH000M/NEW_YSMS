import type { RouteRow, TransportAllocation, Vehicle } from '@/api/campusOps';

/*
  One route run with everything a driver or the transport office needs:
  the bus, the driver, the seat count and the riders who board it.
  Shared by the boarding register and the fleet-wide manifest printout so the
  two views can never disagree about who is on which bus.
*/

export interface RouteGroup {
  id: string;
  name: string;
  start: string | null;
  end: string | null;
  vehicleNo: string;
  vehicleModel: string | null;
  driver: string;
  driverPhone: string | null;
  capacity: number;
  fare: number;
  riders: TransportAllocation[];
}

export function buildRouteGroups(
  rows: TransportAllocation[],
  routes: RouteRow[],
  vehicles: Vehicle[],
): RouteGroup[] {
  const byRoute = new Map<string, TransportAllocation[]>();
  rows.forEach((row) => {
    const bucket = byRoute.get(row.route_id);
    if (bucket) bucket.push(row);
    else byRoute.set(row.route_id, [row]);
  });

  const list: RouteGroup[] = Array.from(byRoute.entries()).map(([id, riders]) => {
    const route = routes.find((item) => item.id === id);
    const vehicle = vehicles.find((item) => item.id === route?.vehicle_id);
    return {
      id,
      name: route?.name ?? riders[0]?.transport_routes?.name ?? '—',
      start: route?.start_point ?? null,
      end: route?.end_point ?? null,
      vehicleNo: vehicle?.vehicle_no ?? '—',
      vehicleModel: vehicle?.model ?? null,
      driver: vehicle?.driver_name ?? '—',
      driverPhone: vehicle?.driver_phone ?? null,
      capacity: Number(vehicle?.capacity ?? 0),
      fare: Number(route?.fare ?? riders[0]?.transport_routes?.fare ?? 0),
      riders,
    };
  });

  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export function vehicleCapacity(route: RouteRow, vehicles: Vehicle[]): number {
  return Number(vehicles.find((vehicle) => vehicle.id === route.vehicle_id)?.capacity ?? 0);
}

/** A run is overfull only when a bus is assigned and the riders exceed its seats. */
export function isOverfull(riders: number, capacity: number): boolean {
  return capacity > 0 && riders > capacity;
}