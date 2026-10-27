/**
 * Protected Route Component
 * XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
 * Authoritative client-side guard for protected administrative modules.
 * Enforces:
 * 1. Authentication check (redirects to Login)
 * 2. Account active check (redirects to Account Deactivated)
 * 3. Mandatory first-time password setup check (redirects to Setup Account)
 * 4. Granular RBAC permission check (displays Unauthorized view)
 */

import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { UnauthorizedPage } from './UnauthorizedPage';
import { PermissionCode } from '../../types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: PermissionCode;
  requiredModule?: string;
  onRedirectToLogin: () => void;
  onRedirectToSetup: () => void;
  onRedirectToDeactivated: () => void;
  onNavigateToDashboard: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredModule,
  onRedirectToLogin,
  onRedirectToSetup,
  onRedirectToDeactivated,
  onNavigateToDashboard,
}) => {
  const {
    isAuthenticated,
    isLoading,
    isAccountActive,
    needsPasswordSetup,
    hasPermission,
    isAdministrator,
  } = useAuth();

  // Top-level unconditional effect for redirect guards (Rules of Hooks compliant)
  React.useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      onRedirectToLogin();
    } else if (!isAccountActive) {
      onRedirectToDeactivated();
    } else if (needsPasswordSetup) {
      onRedirectToSetup();
    }
  }, [
    isLoading,
    isAuthenticated,
    isAccountActive,
    needsPasswordSetup,
    onRedirectToLogin,
    onRedirectToDeactivated,
    onRedirectToSetup,
  ]);

  // Loading state skeleton
  if (isLoading) {
    return (
      <div
        id="protected-route-loading"
        className="flex min-h-[60vh] w-full flex-col items-center justify-center space-y-4"
      >
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-orange-600 border-t-transparent" />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Verifying security credentials...
        </p>
      </div>
    );
  }

  // 1. Authentication Guard
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center p-6 text-center">
        <div className="text-xs text-slate-500">Authentication required. Redirecting to login...</div>
      </div>
    );
  }

  // 2. Account Status Guard (Inactive / Suspended)
  if (!isAccountActive) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center p-6 text-center">
        <div className="text-xs text-rose-500">Account inactive. Redirecting to status notice...</div>
      </div>
    );
  }

  // 3. First-time Login Password Setup Guard
  if (needsPasswordSetup) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center p-6 text-center">
        <div className="text-xs text-amber-600">Password initialization required. Redirecting...</div>
      </div>
    );
  }

  // 4. Granular Permission Guard
  if (requiredPermission && !isAdministrator() && !hasPermission(requiredPermission)) {
    return (
      <UnauthorizedPage
        requiredModule={requiredModule}
        onNavigateToDashboard={onNavigateToDashboard}
      />
    );
  }

  // Authorized
  return <>{children}</>;
};
