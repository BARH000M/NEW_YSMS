import { supabase } from './supabaseClient';
import { fetchInstitution } from './college';

export type DiscountType = 'fixed' | 'percent';

export interface FeeDiscount {
  id: string;
  institution_id: string;
  name: string;
  code: string | null;
  discount_type: DiscountType;
  amount: number | string;
  description: string | null;
  is_active: boolean;
}

export interface FeeDiscountInput {
  name: string;
  code?: string;
  discountType: DiscountType;
  amount: number;
  description?: string;
}

export interface DiscountAllotment {
  id: string;
  discount_id: string;
  student_id: string;
  academic_year_id: string | null;
  amount: number | string | null;
  note: string | null;
  created_at: string;
  students: {
    id: string;
    student_no: string | null;
    first_name: string;
    last_name: string | null;
    sections: { name: string; classes: { name: string } | null } | null;
  } | null;
  fee_discounts: { id: string; name: string; code: string | null; discount_type: DiscountType; amount: number | string } | null;
}

const fail = (message: string): never => {
  throw new Error(message);
};

export async function fetchFeeDiscounts(): Promise<FeeDiscount[]> {
  const { data, error } = await supabase
    .from('fee_discounts')
    .select('*')
    .order('name', { ascending: true });
  if (error) return fail(error.message);
  return (data ?? []) as FeeDiscount[];
}

export async function createFeeDiscount(input: FeeDiscountInput): Promise<void> {
  const institution = await fetchInstitution();
  if (!institution) throw new Error('Institution is not configured');
  const { error } = await supabase.from('fee_discounts').insert({
    institution_id: institution.id,
    name: input.name.trim(),
    code: input.code?.trim() || null,
    discount_type: input.discountType,
    amount: input.amount,
    description: input.description?.trim() || null,
    is_active: true,
  });
  if (error) throw new Error(error.message);
}

export async function updateFeeDiscount(id: string, input: FeeDiscountInput): Promise<void> {
  const { error } = await supabase
    .from('fee_discounts')
    .update({
      name: input.name.trim(),
      code: input.code?.trim() || null,
      discount_type: input.discountType,
      amount: input.amount,
      description: input.description?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setFeeDiscountActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('fee_discounts').update({ is_active: active }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchDiscountAllotments(): Promise<DiscountAllotment[]> {
  const { data, error } = await supabase
    .from('fee_discount_allotments')
    .select(
      'id, discount_id, student_id, academic_year_id, amount, note, created_at, students(id, student_no, first_name, last_name, sections(name, classes(name))), fee_discounts(id, name, code, discount_type, amount)',
    )
    .order('created_at', { ascending: false });
  if (error) return fail(error.message);
  return (data ?? []) as DiscountAllotment[];
}

export interface AllotInput {
  discountId: string;
  studentIds: string[];
  academicYearId?: string | null;
  note?: string;
}

/**
 * Allocates one discount to many students in a single statement.
 * `ignoreDuplicates` means re-allotting the same student never fails or duplicates.
 */
export async function allotDiscount(input: AllotInput): Promise<number> {
  if (input.studentIds.length === 0) return 0;
  const institution = await fetchInstitution();
  if (!institution) throw new Error('Institution is not configured');

  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('fee_discount_allotments')
    .upsert(
      input.studentIds.map((studentId) => ({
        institution_id: institution.id,
        discount_id: input.discountId,
        student_id: studentId,
        academic_year_id: input.academicYearId || null,
        note: input.note?.trim() || null,
        created_by: userData.user?.id ?? null,
      })),
      { onConflict: 'discount_id,student_id', ignoreDuplicates: true },
    )
    .select('id');
  if (error) throw new Error(error.message);
  return (data ?? []).length;
}

export async function revokeAllotment(id: string): Promise<void> {
  const { error } = await supabase.from('fee_discount_allotments').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Money value of a discount against a given base amount (percent resolves against the base). */
export function discountValue(
  discount: { discount_type: DiscountType; amount: number | string },
  base: number,
  override?: number | string | null,
): number {
  const value = Number(override ?? discount.amount ?? 0);
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (discount.discount_type === 'percent') return Math.round(((base * value) / 100) * 100) / 100;
  return Math.min(value, base);
}