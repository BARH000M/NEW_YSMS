import { supabase } from './supabaseClient';
import { fetchInstitution } from './college';

const fail = (message: string): never => {
  throw new Error(message);
};

async function run<T>(promise: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  try {
    const { data, error } = await promise;
    if (error) return fail(error.message);
    return (data ?? []) as T;
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unknown backend error');
  }
}

const today = () => new Date().toISOString().slice(0, 10);

/* ------------------------------- Transport ------------------------------- */

export interface Vehicle {
  id: string;
  vehicle_no: string;
  model: string | null;
  capacity: number;
  driver_name: string | null;
  driver_phone: string | null;
  driver_license: string | null;
  insurance_expiry: string | null;
  notes: string | null;
  is_active: boolean;
}

export const fetchVehicles = () =>
  run<Vehicle[]>(
    supabase
      .from('transport_vehicles')
      .select('id, vehicle_no, model, capacity, driver_name, driver_phone, driver_license, insurance_expiry, notes, is_active')
      .order('vehicle_no', { ascending: true }),
  );

export interface RouteRow {
  id: string;
  name: string;
  start_point: string | null;
  end_point: string | null;
  distance_km: number | null;
  fare: number;
  vehicle_id: string | null;
  is_active: boolean;
}

export const fetchRoutes = () =>
  run<RouteRow[]>(
    supabase
      .from('transport_routes')
      .select('id, name, start_point, end_point, distance_km, fare, vehicle_id, is_active')
      .order('name', { ascending: true }),
  );

export interface StopRow {
  id: string;
  route_id: string;
  stop_name: string;
  pickup_time: string | null;
  drop_time: string | null;
  sort_order: number;
}

export const fetchStops = () =>
  run<StopRow[]>(
    supabase
      .from('transport_route_stops')
      .select('id, route_id, stop_name, pickup_time, drop_time, sort_order')
      .order('sort_order', { ascending: true }),
  );

export interface TransportAllocation {
  id: string;
  student_id: string;
  route_id: string;
  stop_id: string | null;
  allocated_on: string;
  is_active: boolean;
  students: { id: string; first_name: string; last_name: string | null; student_no: string | null } | null;
  transport_routes: { id: string; name: string; fare: number } | null;
  transport_route_stops: { id: string; stop_name: string; pickup_time: string | null } | null;
}

export const fetchTransportAllocations = () =>
  run<TransportAllocation[]>(
    supabase
      .from('transport_allocations')
      .select(
        'id, student_id, route_id, stop_id, allocated_on, is_active, students(id, first_name, last_name, student_no), transport_routes(id, name, fare), transport_route_stops(id, stop_name, pickup_time)',
      )
      .order('allocated_on', { ascending: false }),
  );

export async function createVehicle(input: {
  vehicleNo: string;
  model?: string;
  capacity: number;
  driverName?: string;
  driverPhone?: string;
  driverLicense?: string;
  insuranceExpiry?: string | null;
  notes?: string;
}): Promise<void> {
  const institution = await fetchInstitution();
  const { error } = await supabase.from('transport_vehicles').insert({
    institution_id: institution?.id ?? null,
    vehicle_no: input.vehicleNo.trim() || fail('Vehicle number is required'),
    model: input.model?.trim() || null,
    capacity: input.capacity,
    driver_name: input.driverName?.trim() || null,
    driver_phone: input.driverPhone?.trim() || null,
    driver_license: input.driverLicense?.trim() || null,
    insurance_expiry: input.insuranceExpiry || null,
    notes: input.notes?.trim() || null,
    is_active: true,
  });
  if (error) throw new Error(error.message);
}

export async function setVehicleActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('transport_vehicles').update({ is_active: active }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function createRoute(input: {
  name: string;
  startPoint?: string;
  endPoint?: string;
  distanceKm?: number | null;
  fare: number;
  vehicleId?: string | null;
}): Promise<void> {
  const institution = await fetchInstitution();
  const { error } = await supabase.from('transport_routes').insert({
    institution_id: institution?.id ?? null,
    name: input.name.trim() || fail('Route name is required'),
    start_point: input.startPoint?.trim() || null,
    end_point: input.endPoint?.trim() || null,
    distance_km: input.distanceKm ?? null,
    fare: input.fare,
    vehicle_id: input.vehicleId || null,
    is_active: true,
  });
  if (error) throw new Error(error.message);
}

export async function createStop(input: {
  routeId: string;
  stopName: string;
  pickupTime?: string;
  dropTime?: string;
  sortOrder: number;
}): Promise<void> {
  const { error } = await supabase.from('transport_route_stops').insert({
    route_id: input.routeId,
    stop_name: input.stopName.trim() || fail('Stop name is required'),
    pickup_time: input.pickupTime?.trim() || null,
    drop_time: input.dropTime?.trim() || null,
    sort_order: input.sortOrder,
  });
  if (error) throw new Error(error.message);
}

export async function deleteStop(id: string): Promise<void> {
  const { error } = await supabase.from('transport_route_stops').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function allocateTransport(input: {
  studentId: string;
  routeId: string;
  stopId?: string | null;
}): Promise<void> {
  const institution = await fetchInstitution();
  const { error } = await supabase.from('transport_allocations').insert({
    institution_id: institution?.id ?? null,
    student_id: input.studentId,
    route_id: input.routeId,
    stop_id: input.stopId || null,
    allocated_on: today(),
    is_active: true,
  });
  if (error) throw new Error(error.message);
}

export async function releaseTransport(id: string): Promise<void> {
  const { error } = await supabase.from('transport_allocations').update({ is_active: false }).eq('id', id);
  if (error) throw new Error(error.message);
}

/* -------------------------------- Hostel -------------------------------- */

export interface HostelRow {
  id: string;
  name: string;
  hostel_type: string;
  address: string | null;
  warden_name: string | null;
  warden_phone: string | null;
  is_active: boolean;
}

export const fetchHostels = () =>
  run<HostelRow[]>(
    supabase
      .from('hostels')
      .select('id, name, hostel_type, address, warden_name, warden_phone, is_active')
      .order('name', { ascending: true }),
  );

export interface RoomTypeRow {
  id: string;
  name: string;
  beds: number;
  monthly_fee: number;
}

export const fetchRoomTypes = () =>
  run<RoomTypeRow[]>(
    supabase.from('hostel_room_types').select('id, name, beds, monthly_fee').order('beds', { ascending: true }),
  );

export interface RoomRow {
  id: string;
  hostel_id: string;
  room_type_id: string | null;
  room_no: string;
  floor: string | null;
  beds: number;
  is_active: boolean;
  hostels: { id: string; name: string } | null;
  hostel_room_types: { id: string; name: string; monthly_fee: number } | null;
}

export const fetchRooms = () =>
  run<RoomRow[]>(
    supabase
      .from('hostel_rooms')
      .select('id, hostel_id, room_type_id, room_no, floor, beds, is_active, hostels(id, name), hostel_room_types(id, name, monthly_fee)')
      .order('room_no', { ascending: true }),
  );

export interface HostelAllocation {
  id: string;
  student_id: string;
  room_id: string;
  allocated_on: string;
  vacated_on: string | null;
  status: string;
  students: { id: string; first_name: string; last_name: string | null; student_no: string | null } | null;
  hostel_rooms: { id: string; room_no: string; hostels: { id: string; name: string } | null } | null;
}

export const fetchHostelAllocations = () =>
  run<HostelAllocation[]>(
    supabase
      .from('hostel_allocations')
      .select('id, student_id, room_id, allocated_on, vacated_on, status, students(id, first_name, last_name, student_no), hostel_rooms(id, room_no, hostels(id, name))')
      .order('allocated_on', { ascending: false }),
  );

export async function createHostel(input: {
  name: string;
  hostelType: string;
  address?: string;
  wardenName?: string;
  wardenPhone?: string;
}): Promise<void> {
  const institution = await fetchInstitution();
  const { error } = await supabase.from('hostels').insert({
    institution_id: institution?.id ?? null,
    name: input.name.trim() || fail('Hostel name is required'),
    hostel_type: input.hostelType,
    address: input.address?.trim() || null,
    warden_name: input.wardenName?.trim() || null,
    warden_phone: input.wardenPhone?.trim() || null,
    is_active: true,
  });
  if (error) throw new Error(error.message);
}

export async function createRoomType(input: {
  name: string;
  beds: number;
  monthlyFee: number;
}): Promise<void> {
  const institution = await fetchInstitution();
  const { error } = await supabase.from('hostel_room_types').insert({
    institution_id: institution?.id ?? null,
    name: input.name.trim() || fail('Room type name is required'),
    beds: input.beds,
    monthly_fee: input.monthlyFee,
  });
  if (error) throw new Error(error.message);
}

export async function createRoom(input: {
  hostelId: string;
  roomTypeId?: string | null;
  roomNo: string;
  floor?: string;
  beds: number;
}): Promise<void> {
  const { error } = await supabase.from('hostel_rooms').insert({
    hostel_id: input.hostelId,
    room_type_id: input.roomTypeId || null,
    room_no: input.roomNo.trim() || fail('Room number is required'),
    floor: input.floor?.trim() || null,
    beds: input.beds,
    is_active: true,
  });
  if (error) throw new Error(error.message);
}

export async function allocateHostel(input: {
  studentId: string;
  roomId: string;
  notes?: string;
}): Promise<void> {
  const institution = await fetchInstitution();
  const { error } = await supabase.from('hostel_allocations').insert({
    institution_id: institution?.id ?? null,
    student_id: input.studentId,
    room_id: input.roomId,
    allocated_on: today(),
    status: 'active',
    notes: input.notes?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function vacateHostel(id: string): Promise<void> {
  const { error } = await supabase
    .from('hostel_allocations')
    .update({ status: 'vacated', vacated_on: today() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/* ----------------------------- Other income ----------------------------- */

export interface IncomeHead {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
}

export const fetchIncomeHeads = () =>
  run<IncomeHead[]>(
    supabase
      .from('income_heads')
      .select('id, name, code, description, is_active')
      .order('name', { ascending: true }),
  );

export interface OtherIncome {
  id: string;
  head_id: string | null;
  title: string;
  amount: number;
  received_on: string;
  method: string;
  reference: string | null;
  receipt_url: string | null;
  receipt_name: string | null;
  notes: string | null;
  income_heads: { id: string; name: string; code: string | null } | null;
}

export const fetchOtherIncomes = () =>
  run<OtherIncome[]>(
    supabase
      .from('other_incomes')
      .select('id, head_id, title, amount, received_on, method, reference, receipt_url, receipt_name, notes, income_heads(id, name, code)')
      .order('received_on', { ascending: false }),
  );

export async function createIncomeHead(input: { name: string; code?: string; description?: string }): Promise<void> {
  const institution = await fetchInstitution();
  const { error } = await supabase.from('income_heads').insert({
    institution_id: institution?.id ?? null,
    name: input.name.trim() || fail('Head name is required'),
    code: input.code?.trim() || null,
    description: input.description?.trim() || null,
    is_active: true,
  });
  if (error) throw new Error(error.message);
}

export async function setIncomeHeadActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('income_heads').update({ is_active: active }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function createOtherIncome(input: {
  headId?: string | null;
  title: string;
  amount: number;
  receivedOn: string;
  method: string;
  reference?: string;
  notes?: string;
  receiptPath?: string | null;
  receiptName?: string | null;
}): Promise<void> {
  const institution = await fetchInstitution();
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from('other_incomes').insert({
    institution_id: institution?.id ?? null,
    head_id: input.headId || null,
    title: input.title.trim() || fail('Income title is required'),
    amount: input.amount,
    received_on: input.receivedOn || today(),
    method: input.method,
    reference: input.reference?.trim() || null,
    notes: input.notes?.trim() || null,
    receipt_url: input.receiptPath || null,
    receipt_name: input.receiptName || null,
    created_by: userData.user?.id ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function deleteOtherIncome(id: string): Promise<void> {
  const { error } = await supabase.from('other_incomes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Private bucket: store only the object path, hand out short-lived signed links. */
export async function uploadReceipt(file: File): Promise<{ path: string; name: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Sign in again to attach a receipt.');

  const cleaned = file.name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-60);
  const fileName = `${Date.now()}-${cleaned || 'receipt'}`;
  const path = `${userId}/${fileName}`;

  const { error } = await supabase.storage
    .from('receipts')
    .upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
  if (error) throw new Error(error.message);

  return { path, name: file.name };
}

export async function receiptUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, 600);
  if (error) throw new Error(error.message);
  return (data as { signedUrl: string }).signedUrl;
}

/* --------------------------- Student 360 extras -------------------------- */

export interface StudentExtras {
  student_id: string;
  caste: string | null;
  religion: string | null;
  rte: boolean;
  skill_ability: string | null;
  mother_tongue: string | null;
  national_id: string | null;
  father_name: string | null;
  mother_name: string | null;
  guardian_occupation: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  prev_school_name: string | null;
  prev_school_class: string | null;
  prev_school_tc_no: string | null;
}

export const fetchStudentExtras = () =>
  run<StudentExtras[]>(
    supabase
      .from('student_profile_extras')
      .select('student_id, caste, religion, rte, skill_ability, mother_tongue, national_id, father_name, mother_name, guardian_occupation, city, state, postal_code, prev_school_name, prev_school_class, prev_school_tc_no'),
  );

export async function saveStudentExtras(input: Partial<StudentExtras> & { student_id: string }): Promise<void> {
  const { error } = await supabase.from('student_profile_extras').upsert(
    { ...input, updated_at: new Date().toISOString() },
    { onConflict: 'student_id' },
  );
  if (error) throw new Error(error.message);
}

export interface SiblingRow {
  id: string;
  student_id: string;
  sibling_name: string;
  relation: string | null;
  class_name: string | null;
}

export const fetchSiblings = () =>
  run<SiblingRow[]>(
    supabase
      .from('student_siblings')
      .select('id, student_id, sibling_name, relation, class_name')
      .order('created_at', { ascending: true }),
  );

export async function createSibling(input: {
  studentId: string;
  siblingName: string;
  relation?: string;
  className?: string;
}): Promise<void> {
  const institution = await fetchInstitution();
  const { error } = await supabase.from('student_siblings').insert({
    institution_id: institution?.id ?? null,
    student_id: input.studentId,
    sibling_name: input.siblingName.trim() || fail('Sibling name is required'),
    relation: input.relation?.trim() || null,
    class_name: input.className?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function deleteSibling(id: string): Promise<void> {
  const { error } = await supabase.from('student_siblings').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* -------------------------- Admission extra detail ------------------------ */

export interface AdmissionDetailsPayload {
  middle_name?: string;
  dob?: string | null;
  gender?: string;
  blood_group?: string;
  nationality?: string;
  mother_tongue?: string;
  religion?: string;
  caste?: string;
  category?: string;
  rte?: boolean;
  national_id?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  father_name?: string;
  father_occupation?: string;
  mother_name?: string;
  mother_occupation?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_relation?: string;
  annual_income?: string;
  prev_school_name?: string;
  prev_school_class?: string;
  prev_school_tc_no?: string;
  prev_school_percentage?: string;
  transport_required?: boolean;
  hostel_required?: boolean;
  siblings?: { name: string; relation: string; className: string }[];
  documents?: string[];
  medical_notes?: string;
}

export async function saveAdmissionDetails(
  admissionId: string,
  details: AdmissionDetailsPayload,
): Promise<void> {
  const { error } = await supabase
    .from('admission_details')
    .upsert({ admission_id: admissionId, ...details }, { onConflict: 'admission_id' });
  if (error) throw new Error(error.message);
}