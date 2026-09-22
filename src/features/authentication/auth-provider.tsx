'use client';

import * as React from 'react';
import { createClient } from '@/lib/supabase/client';
import { CurrentUser } from '@/types/auth';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: CurrentUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const supabase = createClient();
  const router = useRouter();

  const fetchProfile = React.useCallback(async (userId: string, email: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        // Fallback profile if row is still being populated by trigger
        const isSuperAdminEmail = email.toLowerCase() === 'hemantraghavkr@gmail.com';
        setUser({
          id: userId,
          email,
          fullName: email.split('@')[0],
          avatarUrl: null,
          role: isSuperAdminEmail ? 'SUPER_ADMIN' : 'MEMBER',
        });
        return;
      }

      setUser({
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
        role: profile.role,
      });
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  }, [supabase]);

  const refreshUser = React.useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser && authUser.email) {
        await fetchProfile(authUser.id, authUser.email);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, fetchProfile]);

  React.useEffect(() => {
    refreshUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && session.user.email) {
        await fetchProfile(session.user.id, session.user.email);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile, refreshUser]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return React.useContext(AuthContext);
}
