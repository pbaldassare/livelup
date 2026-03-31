import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/types/roles';

// =====================================================
// AUTH CONTEXT - Gestione sessione e ruoli
// =====================================================

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** true quando l'utente è autenticato ma il ruolo è ancora in fase di risoluzione */
  isRoleLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, role: AppRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const VALID_ROLES: AppRole[] = ['admin', 'pt', 'atleta'];

function isValidRole(r: unknown): r is AppRole {
  return typeof r === 'string' && VALID_ROLES.includes(r as AppRole);
}

// =====================================================
// AUTH PROVIDER
// =====================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRoleState] = useState<AppRole | null>(null);
  const roleRef = useRef<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRoleLoading, setIsRoleLoading] = useState(false);

  const setRole = useCallback((r: AppRole | null) => {
    roleRef.current = r;
    setRoleState(r);
  }, []);

  const isMountedRef = useRef(true);
  // Tracks whether role has been resolved at least once for the current session
  const roleResolvedRef = useRef(false);

  // ── Deterministic role resolver ──────────────────────
  const resolveRole = useCallback(async (userId: string): Promise<AppRole | null> => {
    // 1) Primary: SECURITY DEFINER RPC (bypasses RLS entirely)
    try {
      const { data: rpcRole, error: rpcError } = await supabase.rpc('get_my_role' as any);
      if (!rpcError && isValidRole(rpcRole)) {
        return rpcRole;
      }
      if (rpcError) {
        console.warn('[Auth] RPC get_my_role failed:', rpcError.message);
      }
    } catch (e) {
      console.warn('[Auth] RPC get_my_role exception:', e);
    }

    // 2) Fallback: direct query on user_roles
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data && isValidRole(data.role)) {
        return data.role;
      }
      if (error) {
        console.warn('[Auth] Direct role query failed:', error.message);
      }
    } catch (e) {
      console.warn('[Auth] Direct role query exception:', e);
    }

    return null;
  }, []);

  // ── Resolve role with retries + backoff ─────────────
  const resolveRoleWithRetry = useCallback(async (userId: string): Promise<AppRole | null> => {
    let resolved = await resolveRole(userId);
    if (resolved) return resolved;

    const delays = [500, 1000, 2000];
    for (const delay of delays) {
      if (!isMountedRef.current) return null;
      console.warn(`[Auth] Role retry in ${delay}ms…`);
      await new Promise(r => setTimeout(r, delay));
      if (!isMountedRef.current) return null;
      resolved = await resolveRole(userId);
      if (resolved) return resolved;
    }

    return null;
  }, [resolveRole]);

  // ── Unified handler for session changes ─────────────
  const handleSession = useCallback(async (newSession: Session | null) => {
    if (!isMountedRef.current) return;

    setSession(newSession);
    setUser(newSession?.user ?? null);

    if (!newSession?.user) {
      setRole(null);
      roleResolvedRef.current = false;
      setIsRoleLoading(false);
      setIsLoading(false);
      return;
    }

    // Don't overwrite a valid role if already resolved for this user
    if (roleResolvedRef.current && role !== null) {
      setIsLoading(false);
      setIsRoleLoading(false);
      return;
    }

    // Force loading states IMMEDIATELY so UI never sees authenticated+no-role+not-loading
    setIsLoading(true);
    setIsRoleLoading(true);

    // Small delay to let JWT propagate in the client
    await new Promise(r => setTimeout(r, 100));
    if (!isMountedRef.current) return;

    const resolved = await resolveRoleWithRetry(newSession.user.id);

    if (isMountedRef.current) {
      // Anti-regression: never overwrite a valid role with null
      if (resolved) {
        setRole(resolved);
        roleResolvedRef.current = true;
      } else if (!roleResolvedRef.current) {
        // Only set null if we never had a role for this session
        setRole(null);
      }
      setIsRoleLoading(false);
      setIsLoading(false);
    }
  }, [resolveRoleWithRetry, role]);

  // ── Initialize auth ─────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    let initialSessionHandled = false;

    // 1) Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMountedRef.current) return;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setRole(null);
          roleResolvedRef.current = false;
          setIsRoleLoading(false);
          setIsLoading(false);
          return;
        }

        // Skip if getSession already handled this exact session
        if (!initialSessionHandled || event !== 'INITIAL_SESSION') {
          await handleSession(session);
        }
      }
    );

    // 2) Check existing session (runs once)
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        initialSessionHandled = true;
        await handleSession(session);
      })
      .catch((error) => {
        console.error('[Auth] getSession error:', error);
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRoleLoading(false);
        }
      });

    // Safety timeout
    const timeout = window.setTimeout(() => {
      if (isMountedRef.current && isLoading) {
        console.warn('[Auth] Forcing loading=false after 12s timeout');
        setIsLoading(false);
        setIsRoleLoading(false);
      }
    }, 12000);

    return () => {
      isMountedRef.current = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auth actions ────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, selectedRole: AppRole) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { role: selectedRole },
        },
      });

      if (authError) return { error: new Error(authError.message) };
      if (!authData.user) return { error: new Error('Errore durante la registrazione') };
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    roleResolvedRef.current = false;
  };

  const refreshRole = async () => {
    if (user) {
      setIsRoleLoading(true);
      const newRole = await resolveRoleWithRetry(user.id);
      if (isMountedRef.current) {
        if (newRole) {
          setRole(newRole);
          roleResolvedRef.current = true;
        }
        setIsRoleLoading(false);
      }
    }
  };

  const value: AuthContextType = {
    user,
    session,
    role,
    isLoading,
    isAuthenticated: !!user,
    isRoleLoading,
    signIn,
    signUp,
    signOut,
    refreshRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// =====================================================
// HOOK
// =====================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;
