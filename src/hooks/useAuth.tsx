import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const VALID_ROLES: AppRole[] = ['admin', 'pt', 'atleta'];

function isValidRole(r: unknown): r is AppRole {
  return typeof r === 'string' && VALID_ROLES.includes(r as AppRole);
}

async function resolveRole(userId: string): Promise<AppRole | null> {
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRoleState] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRoleLoading, setIsRoleLoading] = useState(false);

  const roleRef = useRef<AppRole | null>(null);
  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const resolvedForUserRef = useRef<string | null>(null);

  const setRole = useCallback((r: AppRole | null) => {
    roleRef.current = r;
    setRoleState(r);
  }, []);

  // 1) onAuthStateChange — ONLY synchronous state updates
  useEffect(() => {
    isMountedRef.current = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMountedRef.current) return;

        console.log('[Auth] event:', event, 'user:', newSession?.user?.email ?? 'none');

        if (event === 'SIGNED_OUT' || !newSession?.user) {
          setUser(null);
          setSession(null);
          setRole(null);
          roleRef.current = null;
          inFlightRef.current = false;
          resolvedForUserRef.current = null;
          setIsRoleLoading(false);
          setIsLoading(false);
          return;
        }

        setSession(newSession);
        setUser(newSession.user);
        // Do NOT call resolveRole here — it causes deadlock
      }
    );

    // Safety timeout
    const timeout = window.setTimeout(() => {
      if (isMountedRef.current) {
        console.warn('[Auth] Safety timeout — forcing loading=false');
        setIsLoading(false);
        setIsRoleLoading(false);
      }
    }, 8000);

    return () => {
      isMountedRef.current = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 2) Resolve role OUTSIDE onAuthStateChange callback
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    if (roleRef.current !== null) {
      setIsLoading(false);
      setIsRoleLoading(false);
      return;
    }
    setIsRoleLoading(true);
    resolveRole(user.id)
      .then((resolved) => {
        console.log('[Auth] resolved role:', resolved);
        if (isMountedRef.current) {
          setRole(resolved);
          setIsRoleLoading(false);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('[Auth] role resolution error:', err);
        if (isMountedRef.current) {
          setIsRoleLoading(false);
          setIsLoading(false);
        }
      });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
  };

  const refreshRole = async () => {
    if (user) {
      setIsRoleLoading(true);
      const newRole = await resolveRole(user.id);
      if (isMountedRef.current) {
        if (newRole) setRole(newRole);
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
