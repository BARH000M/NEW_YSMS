import { supabase } from './supabaseClient';
import type { AppRole } from './types';

export interface LinkRecord {
  id: string;
  code: string | null;
  name: string;
  meta: string | null;
  profileId: string | null;
}

export interface LinkAccount {
  userId: string;
  email: string;
  fullName: string | null;
  role: string | null;
}

export interface LinkDirectory {
  accounts: LinkAccount[];
  staff: LinkRecord[];
  students: LinkRecord[];
  guardians: LinkRecord[];
  callerRole: string;
  assignableRoles: string[];
}

export type LinkEntity = 'staff' | 'student' | 'guardian';

/** Every write goes through the server function — the browser never touches auth tables. */
async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('account-links', { body });

  if (error) {
    const context = (error as { context?: Response }).context;
    let message = error.message;
    if (context && typeof context.json === 'function') {
      try {
        const payload = (await context.json()) as { error?: string };
        if (payload?.error) message = payload.error;
      } catch {
        // keep the original message
      }
    }
    throw new Error(message);
  }

  if (data && typeof data === 'object' && 'error' in data) {
    const maybeError = (data as { error?: unknown }).error;
    if (maybeError) throw new Error(String(maybeError));
  }

  return data as T;
}

export function listLinkDirectory(): Promise<LinkDirectory> {
  return invoke<LinkDirectory>({ action: 'list' });
}

export function linkAccount(input: {
  entity: LinkEntity;
  recordId: string;
  email: string;
  role?: AppRole | string;
  fullName?: string;
}): Promise<{ ok: boolean; userId: string; role: string; email: string }> {
  return invoke({ action: 'link', ...input });
}

/** Creates the login with a one-time temporary password the admin hands over. */
export function provisionAccount(input: {
  entity: LinkEntity;
  recordId: string;
  email: string;
  fullName: string;
  role?: AppRole | string;
}): Promise<{ ok: boolean; userId: string; role: string; email: string; tempPassword: string | null }> {
  return invoke({ action: 'provision', ...input });
}

export function unlinkRecord(input: { entity: LinkEntity; recordId: string }): Promise<{ ok: boolean }> {
  return invoke({ action: 'unlink', ...input });
}

export const ENTITY_DEFAULT_ROLE: Record<LinkEntity, AppRole> = {
  staff: 'teacher',
  student: 'student',
  guardian: 'parent',
};