import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { perms } from '@/lib/permissions';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]                   = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    // Seed from existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setIsLoadingAuth(false);
      }
    });

    // Keep in sync with Supabase auth state changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(authUser) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();
      if (error || !profile) {
        setUser({ id: authUser.id, email: authUser.email, role: 'broker', status: 'pending' });
      } else {
        setUser({ ...profile, email: authUser.email });
      }
      setIsAuthenticated(true);
    } catch {
      setUser({ id: authUser.id, email: authUser.email, role: 'broker', status: 'pending' });
      setIsAuthenticated(true);
    } finally {
      setIsLoadingAuth(false);
    }
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function updateMe(data) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const payload = {};
    if (data.full_name  !== undefined) payload.full_name  = data.full_name;
    if (data.phone      !== undefined) payload.phone      = data.phone;
    if (data.avatar_url !== undefined) payload.avatar_url = data.avatar_url;
    if (Object.keys(payload).length === 0) return;
    const { data: updated } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', session.user.id)
      .select()
      .single();
    if (updated) setUser(prev => ({ ...prev, ...updated }));
  }

  function navigateToLogin() {
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      // Legacy compat — callers that still use these names keep working
      isLoadingPublicSettings: false,
      authError: null,
      signIn,
      signOut,
      updateMe,
      logout: signOut,
      navigateToLogin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export function useUserRole() {
  const { user } = useAuth();
  return {
    isAdmin:         perms.isAdmin(user),
    isAdminStaff:    perms.isAdminStaff(user),
    isBroker:        perms.isBroker(user),
    canSeeAll:       perms.canSeeAll(user),
    canImportExport: perms.canImportExport(user),
  };
}
