import { supabase } from './supabaseClient';
import type { AppRole } from './types';

export interface AccessUser {
  userId: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: string | null;
  isActive: boolean;
  assignedAt: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  staffId: string | null;
}

export interface AccessStaff {
  id: string;
  staffNo: string | null;
  fullName: string;
  designation: string | null;
  department: string | null;
  profileId: string | null;
  isActive: boolean;
}

export interface AccessList {
  users: AccessUser[];
  staff: AccessStaff[];
  callerRole: string;
  assignableRoles: string[];
}

/** The browser can never write user_roles — every change goes through the server function. */
async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('manage-roles', { body });

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

export function listAccess(): Promise<AccessList> {
  return invoke<AccessList>({ action: 'list' });
}

export function assignRole(
  email: string,
  role: AppRole,
  isActive = true,
  staffId?: string | null,
): Promise<{ ok: boolean }> {
  return invoke<{ ok: boolean }>({ action: 'assign', email, role, isActive, staffId: staffId || null });
}

export function revokeRole(userId: string): Promise<{ ok: boolean }> {
  return invoke<{ ok: boolean }>({ action: 'revoke', userId });
}

export const ASSIGNABLE_ROLES: AppRole[] = [
  'teacher',
  'accountant',
  'receptionist',
  'librarian',
  'student',
  'parent',
  'admin',
];