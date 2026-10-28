import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import type { StudentRow } from '@/api/college';
import type { RouteRow, StopRow, Vehicle } from '@/api/campusOps';
import { allocateTransport, createRoute, createStop, createVehicle } from '@/api/campusOps';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className={labelClass}>{label}</span>
      {children}
    </div>
  );
}

function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">{message}</p>
  );
}

function Actions({ busy, onCancel, label }: { busy: boolean; onCancel: () => void; label: string }) {
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

export function VehicleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    vehicleNo: '',
    model: '',
    capacity: '26',
    driverName: '',
    driverPhone: '',
    driverLicense: '',
    insuranceExpiry: '',
    notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createVehicle({
        vehicleNo: form.vehicleNo,
        model: form.model,
        capacity: Number(form.capacity) || 0,
        driverName: form.driverName,
        driverPhone: form.driverPhone,
        driverLicense: form.driverLicense,
        insuranceExpiry: form.insuranceExpiry || null,
        notes: form.notes,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.transport.addVehicle')} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('app.transport.vehicleNo')}>
            <input
              className={inputClass}
              value={form.vehicleNo}
              onChange={(e) => setForm({ ...form, vehicleNo: e.target.value })}
              required
              placeholder="BUS-1024"
            />
          </Field>
          <Field label={t('app.transport.model')}>
            <input
              className={inputClass}
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
          </Field>
          <Field label={t('app.transport.capacity')}>
            <input
              className={inputClass}
              type="number"
              min={1}
              dir="ltr"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
          </Field>
          <Field label={t('app.transport.insurance')}>
            <input
              className={inputClass}
              type="date"
              value={form.insuranceExpiry}
              onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })}
            />
          </Field>
        </div>

        <div className="rounded-md border border-background-200 bg-background-100 p-3">
          <p className="text-[11px] font-semibold text-foreground-800 mb-2.5">{t('app.transport.driver')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('app.transport.driverName')}>
              <input
                className={inputClass}
                value={form.driverName}
                onChange={(e) => setForm({ ...form, driverName: e.target.value })}
              />
            </Field>
            <Field label={t('app.common.phone')}>
              <input
                className={inputClass}
                dir="ltr"
                value={form.driverPhone}
                onChange={(e) => setForm({ ...form, driverPhone: e.target.value })}
              />
            </Field>
            <Field label={t('app.transport.license')}>
              <input
                className={inputClass}
                dir="ltr"
                value={form.driverLicense}
                onChange={(e) => setForm({ ...form, driverLicense: e.target.value })}
              />
            </Field>
            <Field label={t('app.common.notes')}>
              <input
                className={inputClass}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
          </div>
        </div>

        <ErrorNote message={error} />
        <Actions busy={busy} onCancel={onClose} label={t('app.common.save')} />
      </form>
    </Modal>
  );
}

export function RouteModal({
  vehicles,
  onClose,
  onSaved,
}: {
  vehicles: Vehicle[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: '',
    startPoint: '',
    endPoint: '',
    distanceKm: '',
    fare: '0',
    vehicleId: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createRoute({
        name: form.name,
        startPoint: form.startPoint,
        endPoint: form.endPoint,
        distanceKm: form.distanceKm ? Number(form.distanceKm) : null,
        fare: Number(form.fare) || 0,
        vehicleId: form.vehicleId || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.transport.addRoute')} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label={t('app.transport.routeName')}>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('app.transport.startPoint')}>
            <input
              className={inputClass}
              value={form.startPoint}
              onChange={(e) => setForm({ ...form, startPoint: e.target.value })}
            />
          </Field>
          <Field label={t('app.transport.endPoint')}>
            <input
              className={inputClass}
              value={form.endPoint}
              onChange={(e) => setForm({ ...form, endPoint: e.target.value })}
            />
          </Field>
          <Field label={t('app.transport.distance')}>
            <input
              className={inputClass}
              type="number"
              min={0}
              step="0.1"
              dir="ltr"
              value={form.distanceKm}
              onChange={(e) => setForm({ ...form, distanceKm: e.target.value })}
            />
          </Field>
          <Field label={t('app.transport.fare')}>
            <input
              className={inputClass}
              type="number"
              min={0}
              dir="ltr"
              value={form.fare}
              onChange={(e) => setForm({ ...form, fare: e.target.value })}
            />
          </Field>
        </div>
        <Field label={t('app.transport.vehicle')}>
          <select
            className={inputClass}
            value={form.vehicleId}
            onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
          >
            <option value="">{t('app.common.unknown')}</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.vehicle_no} · {vehicle.driver_name ?? '—'}
              </option>
            ))}
          </select>
        </Field>
        <ErrorNote message={error} />
        <Actions busy={busy} onCancel={onClose} label={t('app.common.save')} />
      </form>
    </Modal>
  );
}

export function StopModal({
  routes,
  activeRouteId,
  nextOrder,
  onClose,
  onSaved,
}: {
  routes: RouteRow[];
  activeRouteId: string;
  nextOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    routeId: activeRouteId || routes[0]?.id || '',
    stopName: '',
    pickupTime: '',
    dropTime: '',
    sortOrder: String(nextOrder),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createStop({
        routeId: form.routeId,
        stopName: form.stopName,
        pickupTime: form.pickupTime,
        dropTime: form.dropTime,
        sortOrder: Number(form.sortOrder) || 1,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.transport.addStop')} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label={t('app.transport.route')}>
          <select
            className={inputClass}
            value={form.routeId}
            onChange={(e) => setForm({ ...form, routeId: e.target.value })}
            required
          >
            {routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('app.transport.stopName')}>
          <input
            className={inputClass}
            value={form.stopName}
            onChange={(e) => setForm({ ...form, stopName: e.target.value })}
            required
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label={t('app.transport.pickup')}>
            <input
              className={inputClass}
              dir="ltr"
              placeholder="06:40"
              value={form.pickupTime}
              onChange={(e) => setForm({ ...form, pickupTime: e.target.value })}
            />
          </Field>
          <Field label={t('app.transport.drop')}>
            <input
              className={inputClass}
              dir="ltr"
              placeholder="14:10"
              value={form.dropTime}
              onChange={(e) => setForm({ ...form, dropTime: e.target.value })}
            />
          </Field>
          <Field label={t('app.transport.order')}>
            <input
              className={inputClass}
              type="number"
              min={1}
              dir="ltr"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            />
          </Field>
        </div>
        <ErrorNote message={error} />
        <Actions busy={busy} onCancel={onClose} label={t('app.common.save')} />
      </form>
    </Modal>
  );
}

export function AllocationModal({
  students,
  routes,
  stops,
  onClose,
  onSaved,
}: {
  students: StudentRow[];
  routes: RouteRow[];
  stops: StopRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [studentId, setStudentId] = useState('');
  const [routeId, setRouteId] = useState(routes[0]?.id ?? '');
  const [stopId, setStopId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const routeStops = stops.filter((stop) => stop.route_id === routeId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!studentId || !routeId) {
      setError(t('app.transport.pickStudent'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await allocateTransport({ studentId, routeId, stopId: stopId || null });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.transport.assignStudent')} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label={t('app.transport.student')}>
          <select
            className={inputClass}
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
          >
            <option value="">{t('app.transport.pickStudent')}</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.student_no ?? '—'} · {student.first_name} {student.last_name ?? ''}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('app.transport.route')}>
            <select
              className={inputClass}
              value={routeId}
              onChange={(e) => {
                setRouteId(e.target.value);
                setStopId('');
              }}
              required
            >
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('app.transport.stop')}>
            <select
              className={inputClass}
              value={stopId}
              onChange={(e) => setStopId(e.target.value)}
              disabled={routeStops.length === 0}
            >
              <option value="">{t('app.common.unknown')}</option>
              {routeStops.map((stop) => (
                <option key={stop.id} value={stop.id}>
                  {stop.stop_name}
                  {stop.pickup_time ? ` · ${stop.pickup_time}` : ''}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <ErrorNote message={error} />
        <Actions busy={busy} onCancel={onClose} label={t('app.transport.assign')} />
      </form>
    </Modal>
  );
}