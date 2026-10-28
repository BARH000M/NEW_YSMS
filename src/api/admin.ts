import { supabase } from './supabaseClient';
import type { AcademicYear } from './types';

export interface InstitutionPatch {
  name?: string;
  name_ar?: string | null;
  code?: string | null;
  logo_url?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  timezone?: string;
  currency?: string;
}

/** Institution identity — the letterhead every printed document uses. */
export async function updateInstitution(id: string, patch: InstitutionPatch): Promise<void> {
  const { error } = await supabase.from('institutions').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export interface GeneralPreferences {
  currency_symbol?: string;
  date_format?: string;
  session_start_month?: string;
  language?: string;
  font_size?: string;
  week_start?: string;
}

/** One JSON row per settings group ("general", "branding", …). */
export async function saveSetting(
  key: string,
  value: Record<string, unknown>,
  institutionId: string | null,
): Promise<void> {
  const { data, error } = await supabase.from('settings').select('id').eq('key', key).limit(1).maybeSingle();
  if (error) throw new Error(error.message);

  if (data && (data as { id: string }).id) {
    const { error: updateError } = await supabase
      .from('settings')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('id', (data as { id: string }).id);
    if (updateError) throw new Error(updateError.message);
    return;
  }

  const { error: insertError } = await supabase
    .from('settings')
    .insert({ key, value, institution_id: institutionId });
  if (insertError) throw new Error(insertError.message);
}

export interface AcademicYearInput {
  name: string;
  startDate: string | null;
  endDate: string | null;
}

export async function createAcademicYear(
  input: AcademicYearInput,
  institutionId: string | null,
): Promise<void> {
  const { error } = await supabase.from('academic_years').insert({
    institution_id: institutionId,
    name: input.name.trim(),
    start_date: input.startDate || null,
    end_date: input.endDate || null,
    is_current: false,
  });
  if (error) throw new Error(error.message);
}

export async function updateAcademicYear(id: string, input: AcademicYearInput): Promise<void> {
  const { error } = await supabase
    .from('academic_years')
    .update({
      name: input.name.trim(),
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Only one session can be current — every other year is cleared first. */
export async function setCurrentAcademicYear(years: AcademicYear[], id: string): Promise<void> {
  const others = years.filter((year) => year.id !== id && year.is_current);
  for (const year of others) {
    const { error } = await supabase
      .from('academic_years')
      .update({ is_current: false, updated_at: new Date().toISOString() })
      .eq('id', year.id);
    if (error) throw new Error(error.message);
  }
  const { error } = await supabase
    .from('academic_years')
    .update({ is_current: true, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteAcademicYear(id: string): Promise<void> {
  const { error } = await supabase.from('academic_years').delete().eq('id', id);
  if (error) throw new Error(error.message);
}