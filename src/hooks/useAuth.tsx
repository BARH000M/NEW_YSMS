import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/api/supabaseClient';
import { fetchMyProfile, fetchMyRole } from '@/api/college';
import type { AppRole, Profile } from '@/api/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  roleError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ needsConfirm: boolean }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleError, setRoleError] = useState<string | null>(null);

  // Load profile + role OUTSIDE the auth callback so the two never wait on each other.
  const loadIdentity = useCallback(async (userId: string) => {
    setRoleError(null);
    try {
      const myRole = await fetchMyRole();
      setRole(myRole?.role ?? null);
    } catch (error) {
      setRole(null);
      setRoleError(error instanceof Error ? error.message : 'Could not read role');
    }
    try {
      const myProfile = await fetchMyProfile(userId);
      setProfile(myProfile);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!alive) return;
        setSession(data.session ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (alive) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Must stay synchronous — no awaited backend calls inside this callback.
      setSession(nextSession ?? null);
      if (!nextSession?.user) {
        setProfile(null);
        setRole(null);
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setRole(null);
      return;
    }
    void loadIdentity(userId);
  }, [userId, loadIdentity]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw new Error(error.message);
    return { needsConfirm: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
  }, []);

  const refreshRole = useCallback(async () => {
    if (!userId) return;
    await loadIdentity(userId);
  }, [userId, loadIdentity]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role,
      loading,
      roleError,
      signIn,
      signUp,
      signOut,
      refreshRole,
    }),
    [session, profile, role, loading, roleError, signIn, signUp, signOut, refreshRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}