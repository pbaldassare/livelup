import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
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
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, role: AppRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =====================================================
// AUTH PROVIDER
// =====================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user role from database with RPC fallback
  const fetchUserRole = async (userId: string): Promise<AppRole | null> => {
    try {
      // Try direct query first
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data?.role) {
        return data.role as AppRole;
      }

      if (error) {
        console.warn('Direct role query failed, trying RPC fallback:', error.message);
      }

      // Fallback: use SECURITY DEFINER function that bypasses RLS
      const { data: rpcRole, error: rpcError } = await supabase.rpc('get_my_role');

      if (rpcError) {
        console.error('RPC get_my_role also failed:', rpcError.message);
        return null;
      }

      return (rpcRole as AppRole) || null;
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    const fetchUserRoleWithTimeout = async (userId: string): Promise<AppRole | null> => {
      return Promise.race([
        fetchUserRole(userId),
        new Promise<AppRole | null>((resolve) =>
          setTimeout(() => resolve(null), 8000)
        ),
      ]);
    };

    const safeSetLoading = (value: boolean) => {
      if (isMounted) setIsLoading(value);
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer role fetch slightly to let the client set the JWT token
          // This prevents RLS failures when the token isn't ready yet
          await new Promise((r) => setTimeout(r, 150));
          if (!isMounted) return;

          let nextRole = await fetchUserRoleWithTimeout(session.user.id);

          // Retry with increasing backoff if role is null
          const retryDelays = [500, 1000, 2000];
          for (const delay of retryDelays) {
            if (nextRole || !isMounted) break;
            console.warn(`Role fetch retry after ${delay}ms...`);
            await new Promise((r) => setTimeout(r, delay));
            if (!isMounted) return;
            nextRole = await fetchUserRoleWithTimeout(session.user.id);
          }

          if (isMounted) {
            setRole(nextRole);
            safeSetLoading(false);
          }
        } else {
          setRole(null);
          safeSetLoading(false);
        }

        if (event === 'SIGNED_OUT') {
          setRole(null);
          safeSetLoading(false);
        }
      }
    );

    const loadingTimeout = window.setTimeout(() => {
      console.warn('Auth initialization timeout: forcing loading completion');
      safeSetLoading(false);
    }, 10000);

    // THEN check for existing session
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const fetchedRole = await fetchUserRoleWithTimeout(session.user.id);
          if (isMounted) setRole(fetchedRole);
        } else {
          setRole(null);
        }
      })
      .catch((error) => {
        console.error('Error initializing auth session:', error);
        if (isMounted) setRole(null);
      })
      .finally(() => {
        window.clearTimeout(loadingTimeout);
        safeSetLoading(false);
      });

    return () => {
      isMounted = false;
      window.clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Sign in with email/password
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Sign up with email/password and role assignment
  const signUp = async (email: string, password: string, selectedRole: AppRole) => {
    try {
      const redirectUrl = `${window.location.origin}/`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            role: selectedRole, // Il trigger handle_new_user_role leggerà questo valore
          },
        },
      });

      if (authError) {
        return { error: new Error(authError.message) };
      }

      if (!authData.user) {
        return { error: new Error('Errore durante la registrazione') };
      }

      // Il ruolo viene assegnato automaticamente dal trigger on_auth_user_created
      // che crea anche i profili specifici (pt_profiles o atleta_profiles)
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  // Refresh role from database
  const refreshRole = async () => {
    if (user) {
      const newRole = await fetchUserRole(user.id);
      setRole(newRole);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    role,
    isLoading,
    isAuthenticated: !!user,
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
