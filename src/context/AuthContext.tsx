/**
 * Centralized Authentication & Authorization Context
 * XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
 * Single-business RBAC State Provider
 */

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import { appConfig } from '../config/app.config';
import { DbProfile, DbRole, UserStatus } from '../types/database';
import { AuthContextType, StaffRoleName, UserRole, PERMISSION_CODES } from '../types/auth';
import { authService } from '../services/auth.service';
import { SYSTEM_ROLE_DEFINITIONS } from '../config/roles.config';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

import { DEV_SANDBOX_PERSONAS, DevPersona } from '../config/personas.config';
export { DEV_SANDBOX_PERSONAS };
export type { DevPersona };


export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [role, setRole] = useState<DbRole | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sandboxPersona, setSandboxPersona] = useState<StaffRoleName | 'inactive' | null>(() => {
    try {
      const stored = localStorage.getItem('xforce_auth_sandbox_persona');
      if (stored) {
        return (stored as StaffRoleName | 'inactive');
      }
      if (!appConfig.supabase.isConfigured || appConfig.isDevelopment) {
        return 'administrator';
      }
      return null;
    } catch {
      return 'administrator';
    }
  });

  // Load user profile and permissions for a given user ID
  const loadUserData = useCallback(async (userId: string, email?: string) => {
    try {
      const { profile: p, role: r, permissions: perms } = await authService.fetchProfileAndPermissions(
        userId,
        email
      );
      setProfile(p);
      setRole(r);
      setPermissions(perms);
      try {
        localStorage.setItem(
          'xforce_auth_user',
          JSON.stringify({
            id: userId,
            email: email || p.email,
            full_name: p.full_name,
            role: r.name,
            role_name: r.display_name,
            permissions: perms,
          })
        );
      } catch {
        // safe
      }
    } catch {
      // Fallback
      setProfile(null);
      setRole(null);
      setPermissions([]);
    }
  }, []);

  // Initialize Supabase Auth session & onAuthStateChange listener
  useEffect(() => {
    let isMounted = true;

    // Check if sandbox persona is active in development mode
    if (sandboxPersona && DEV_SANDBOX_PERSONAS[sandboxPersona]) {
      const p = DEV_SANDBOX_PERSONAS[sandboxPersona];
      setCurrentUser(p.user as any);
      setProfile(p.profile);
      setRole(p.role);
      setPermissions(p.permissions);
      setIsLoading(false);
      try {
        localStorage.setItem('xforce_auth_sandbox_persona', sandboxPersona);
        localStorage.setItem(
          'xforce_auth_user',
          JSON.stringify({
            id: p.user.id,
            email: p.user.email,
            full_name: p.profile.full_name,
            role: p.role.name,
            role_name: p.role.display_name,
            permissions: p.permissions,
          })
        );
      } catch {
        // safe
      }
      return;
    }

    async function initSession() {
      try {
        if (!appConfig.supabase.isConfigured) {
          // If Supabase credentials are not populated in .env, start unauthenticated
          if (isMounted) {
            setCurrentUser(null);
            setProfile(null);
            setRole(null);
            setPermissions([]);
            setIsLoading(false);
          }
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session?.user) {
          if (isMounted) {
            setCurrentUser(null);
            setProfile(null);
            setRole(null);
            setPermissions([]);
            setIsLoading(false);
          }
          return;
        }

        if (isMounted) {
          setCurrentUser(data.session.user);
          await loadUserData(data.session.user.id, data.session.user.email);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null);
          setProfile(null);
          setRole(null);
          setPermissions([]);
          setIsLoading(false);
        }
      }
    }

    initSession();

    // Subscribe to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        if (!isMounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          setCurrentUser(session.user);
          await loadUserData(session.user.id, session.user.email);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setProfile(null);
          setRole(null);
          setPermissions([]);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setCurrentUser(session.user);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadUserData, sandboxPersona]);

  // Derived state
  const isAuthenticated = useMemo(() => {
    return Boolean(currentUser && profile);
  }, [currentUser, profile]);

  const accountStatus: UserStatus = useMemo(() => {
    return profile?.status || 'inactive';
  }, [profile]);

  const isAccountActive = useMemo(() => {
    return accountStatus === 'active';
  }, [accountStatus]);

  const needsPasswordSetup = useMemo(() => {
    return Boolean(profile?.password_setup_required);
  }, [profile]);

  // Actions
  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const result = await authService.signInWithEmail(email, password);
        setCurrentUser(result.user);
        setProfile(result.profile);
        setRole(result.role);
        setPermissions(result.permissions);
        setSandboxPersona(null);
        try {
          localStorage.removeItem('xforce_auth_sandbox_persona');
          localStorage.setItem(
            'xforce_auth_user',
            JSON.stringify({
              id: result.user.id,
              email: result.user.email,
              full_name: result.profile.full_name,
              role: result.role.name,
              role_name: result.role.display_name,
              permissions: result.permissions,
            })
          );
        } catch {
          // safe
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      const uid = currentUser?.id;
      const uemail = currentUser?.email;
      const urole = role?.name;

      await authService.signOut(uid, uemail, urole);

      setCurrentUser(null);
      setProfile(null);
      setRole(null);
      setPermissions([]);
      setSandboxPersona(null);
      try {
        localStorage.removeItem('xforce_auth_sandbox_persona');
        localStorage.removeItem('xforce_auth_user');
      } catch {
        // safe
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, role]);

  const requestPasswordReset = useCallback(async (email: string) => {
    return authService.requestPasswordReset(email);
  }, []);

  const updatePassword = useCallback(
    async (newPassword: string) => {
      if (!currentUser?.id) {
        throw new Error('You must be signed in to update your password.');
      }
      await authService.updatePassword(newPassword, currentUser.id);
      // Refresh profile to update setup flag
      if (profile) {
        setProfile({ ...profile, password_setup_required: false });
      }
    },
    [currentUser, profile]
  );

  const completeFirstTimeSetup = useCallback(
    async (newPassword: string) => {
      if (!currentUser?.id) {
        throw new Error('User session not found.');
      }
      await authService.updatePassword(newPassword, currentUser.id);
      if (profile) {
        setProfile({ ...profile, password_setup_required: false });
      }
    },
    [currentUser, profile]
  );

  const updateProfile = useCallback(
    async (data: { fullName?: string; phone?: string; avatarUrl?: string }) => {
      if (!currentUser?.id) {
        throw new Error('Not authenticated.');
      }
      const updated = await authService.updatePersonalProfile(currentUser.id, data);
      setProfile(updated);
    },
    [currentUser]
  );

  const refreshProfile = useCallback(async () => {
    if (currentUser?.id) {
      await loadUserData(currentUser.id, currentUser.email);
    }
  }, [currentUser, loadUserData]);

  // Sandbox Persona Switcher for Development & Interactive Verification
  const switchSandboxPersona = useCallback(
    (persona: StaffRoleName | 'inactive' | null) => {
      setSandboxPersona(persona);
      try {
        if (persona) {
          localStorage.setItem('xforce_auth_sandbox_persona', persona);
          const p = DEV_SANDBOX_PERSONAS[persona];
          setCurrentUser(p.user as any);
          setProfile(p.profile);
          setRole(p.role);
          setPermissions(p.permissions);
          localStorage.setItem(
            'xforce_auth_user',
            JSON.stringify({
              id: p.user.id,
              email: p.user.email,
              full_name: p.profile.full_name,
              role: p.role.name,
              role_name: p.role.display_name,
              permissions: p.permissions,
            })
          );
        } else {
          localStorage.removeItem('xforce_auth_sandbox_persona');
          localStorage.removeItem('xforce_auth_user');
          setCurrentUser(null);
          setProfile(null);
          setRole(null);
          setPermissions([]);
        }
      } catch {
        // safe
      }
    },
    []
  );

  // Authorization Helpers (Frontend UX)
  const isAdministrator = useCallback(() => {
    return role?.name === 'administrator';
  }, [role]);

  const isStaff = useCallback(() => {
    if (!role?.name) return false;
    return [
      'administrator',
      'sales_manager',
      'warehouse_staff',
      'installation_staff',
      'pos_staff',
    ].includes(role.name);
  }, [role]);

  const hasRole = useCallback(
    (roleName: UserRole | string) => {
      if (isAdministrator()) return true;
      return role?.name === roleName;
    },
    [role, isAdministrator]
  );

  const hasPermission = useCallback(
    (permissionCode: string) => {
      if (isAdministrator()) return true;
      return permissions.includes(permissionCode);
    },
    [permissions, isAdministrator]
  );

  const can = useCallback(
    (permissionCode: string) => {
      return hasPermission(permissionCode);
    },
    [hasPermission]
  );

  const contextValue: AuthContextType = useMemo(
    () => ({
      currentUser,
      profile,
      role,
      permissions,
      isAuthenticated,
      isLoading,
      accountStatus,
      isAccountActive,
      needsPasswordSetup,
      isDevSandboxActive: Boolean(sandboxPersona),
      activeSandboxPersona: sandboxPersona,
      login,
      logout,
      requestPasswordReset,
      updatePassword,
      completeFirstTimeSetup,
      updateProfile,
      refreshProfile,
      switchSandboxPersona,
      hasRole,
      hasPermission,
      can,
      isAdministrator,
      isStaff,
    }),
    [
      currentUser,
      profile,
      role,
      permissions,
      isAuthenticated,
      isLoading,
      accountStatus,
      isAccountActive,
      needsPasswordSetup,
      sandboxPersona,
      login,
      logout,
      requestPasswordReset,
      updatePassword,
      completeFirstTimeSetup,
      updateProfile,
      refreshProfile,
      switchSandboxPersona,
      hasRole,
      hasPermission,
      can,
      isAdministrator,
      isStaff,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
