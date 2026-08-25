import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { publicAppOrigin } from '@/lib/publicOrigin';
import { clearPasswordRecovery, markPasswordRecovery } from '@/lib/passwordRecovery';
import {
  clearLastGoodRole,
  isValidRole,
  mergeResolvedRole,
  readLastGoodRole,
  writeLastGoodRole,
} from '@/lib/lastGoodRole';
import type { AppRole } from '@/types/roles';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isRoleLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, role: AppRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function resolveRoleOnce(userId: string): Promise<AppRole | null> {
  // 1) RPC (SECURITY DEFINER, bypasses RLS)
  try {
    const { data, error } = await supabase.rpc('get_my_role' as any);
    if (!error && isValidRole(data)) return data;
    if (error) console.warn('[Auth] RPC get_my_role failed:', error.message);
  } catch (e) {
    console.warn('[Auth] RPC exception:', e);
  }

  // 2) Direct query fallback
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    if (!error && data && isValidRole(data.role)) return data.role;
    if (error) console.warn('[Auth] Direct query failed:', error.message);
  } catch (e) {
    console.warn('[Auth] Direct query exception:', e);
  }

  return null;
}

async function resolveRole(userId: string): Promise<AppRole | null> {
  const first = await resolveRoleOnce(userId);
  if (first) return first;
  await new Promise((r) => setTimeout(r, 500));
  return resolveRoleOnce(userId);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRoleState] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRoleLoading, setIsRoleLoading] = useState(false);

  const roleRef = useRef<AppRole | null>(null);
  const lastGoodRoleRef = useRef<AppRole | null>(null);
  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const resolvedForUserRef = useRef<string | null>(null);

  const setRole = useCallback((r: AppRole | null) => {
    roleRef.current = r;
    if (r) lastGoodRoleRef.current = r;
    setRoleState(r);
  }, []);

  const hydrateLastGoodRole = useCallback((userId: string) => {
    if (roleRef.current) return;
    const cached = readLastGoodRole(userId);
    if (cached) setRole(cached);
  }, [setRole]);

  // 1) onAuthStateChange — ONLY synchronous state updates
  useEffect(() => {
    isMountedRef.current = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMountedRef.current) return;

        console.log('[Auth] event:', event, 'user:', newSession?.user?.email ?? 'none');

        if (event === 'PASSWORD_RECOVERY') {
          markPasswordRecovery();
        }

        if (event === 'SIGNED_OUT') {
          clearPasswordRecovery();
          clearLastGoodRole();
          setUser(null);
          setSession(null);
          setRole(null);
          roleRef.current = null;
          lastGoodRoleRef.current = null;
          inFlightRef.current = false;
          resolvedForUserRef.current = null;
          setIsRoleLoading(false);
          setIsLoading(false);
          return;
        }

        // Empty payload is only "logged out" after storage restore or an explicit sign-out.
        // Ignore other empty events so a refresh/token race cannot wipe a live session.
        if (!newSession?.user) {
          if (event === 'INITIAL_SESSION') {
            setUser(null);
            setSession(null);
            setIsLoading(false);
          }
          return;
        }

        setSession(newSession);
        setUser(newSession.user);
        hydrateLastGoodRole(newSession.user.id);
        if (roleRef.current) setIsLoading(false);
        // Do NOT call resolveRole here — it causes deadlock
      }
    );

    // Bootstrap esplicito della sessione
    supabase.auth.getSession().then(({ data }) => {
      if (!isMountedRef.current) return;
      if (data.session?.user) {
        setSession(data.session);
        setUser(data.session.user);
        hydrateLastGoodRole(data.session.user.id);
        if (roleRef.current) setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    }).catch(() => {
      if (isMountedRef.current) setIsLoading(false);
    });

    // Safety timeout: sblocca solo se non c'è ancora un ruolo risolto
    const timeout = window.setTimeout(() => {
      if (isMountedRef.current && !roleRef.current) {
        console.warn('[Auth] Safety timeout — forcing loading=false (no role yet)');
        setIsRoleLoading(false);
        setIsLoading(false);
      }
    }, 10000);

    return () => {
      isMountedRef.current = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 2) Resolve role OUTSIDE onAuthStateChange callback
  useEffect(() => {
    if (!user) {
      inFlightRef.current = false;
      resolvedForUserRef.current = null;
      // Do NOT set isLoading=false here: on mount user is null until
      // getSession / INITIAL_SESSION restores the persisted session.
      return;
    }
    hydrateLastGoodRole(user.id);
    if (roleRef.current) {
      setIsLoading(false);
    }
    if (roleRef.current !== null && resolvedForUserRef.current === user.id) {
      setIsRoleLoading(false);
      return;
    }
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    setIsRoleLoading(true);
    resolveRole(user.id)
      .then((resolved) => {
        const next = mergeResolvedRole(resolved, lastGoodRoleRef.current);
        console.log('[Auth] resolved role:', resolved, 'effective:', next);
        if (isMountedRef.current) {
          setRole(next);
          if (next) writeLastGoodRole(user.id, next);
          resolvedForUserRef.current = user.id;
          setIsRoleLoading(false);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('[Auth] role resolution error:', err);
        if (isMountedRef.current) {
          const fallback = lastGoodRoleRef.current;
          if (fallback) setRole(fallback);
          setIsRoleLoading(false);
          setIsLoading(false);
        }
      })
      .finally(() => {
        inFlightRef.current = false;
      });
  }, [user?.id, hydrateLastGoodRole, setRole]); // eslint-disable-line react-hooks/exhaustive-deps

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
          emailRedirectTo: `${publicAppOrigin()}/auth?confirmed=1`,
          data: { role: selectedRole },
        },
      });
      if (authError) return { error: new Error(authError.message) };
      if (!authData.user) return { error: new Error('Errore durante la registrazione') };

      // Con conferma email attiva non c'è sessione subito: registrazione OK,
      // l'utente deve confermare tramite il link ricevuto per email.
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };


  const signOut = async () => {
    clearLastGoodRole();
    lastGoodRoleRef.current = null;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${publicAppOrigin()}/auth?type=recovery`,
      });
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (!error) clearPasswordRecovery();
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const refreshRole = async () => {
    if (user) {
      setIsRoleLoading(true);
      const newRole = await resolveRole(user.id);
      if (isMountedRef.current) {
        const next = mergeResolvedRole(newRole, lastGoodRoleRef.current);
        if (next) {
          setRole(next);
          writeLastGoodRole(user.id, next);
        }
        setIsRoleLoading(false);
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user, session, role, isLoading,
      isAuthenticated: !!user,
      isRoleLoading,
      signIn, signUp, signOut, refreshRole,
      resetPassword, updatePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;
