/**
 * Staff Login Page
 * XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
 * Single-business authentication portal
 */

import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  WifiOff,
  Building2,
  ArrowLeft,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { defaultBusinessConfig } from '../../config/business.config';
import { Button } from '../ui/Button';
import { StaffRoleName } from '../../types/auth';

interface LoginPageProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
  onBackToPublic?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccess,
  onForgotPassword,
  onBackToPublic,
}) => {
  const { login, isLoading, switchSandboxPersona } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form field errors
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    let isValid = true;
    setEmailError(null);
    setPasswordError(null);
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Email address is required.');
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setEmailError('Please enter a valid email address.');
        isValid = false;
      }
    }

    if (!password) {
      setPasswordError('Password is required.');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setIsNetworkError(false);

    try {
      await login(email, password);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      const isNet = Boolean(err.isNetworkError || !navigator.onLine);
      setIsNetworkError(isNet);
      setErrorMessage(
        err.message || 'Invalid email or password.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutofillCredentials = (autofillEmail: string, autofillPass: string) => {
    setEmail(autofillEmail);
    setPassword(autofillPass);
    setEmailError(null);
    setPasswordError(null);
    setErrorMessage(null);
  };

  return (
    <div
      id="login-page-container"
      className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950 px-4 py-12 transition-colors"
    >
      {/* Top back to public link */}
      {onBackToPublic && (
        <div className="w-full max-w-md mb-4 flex justify-between items-center text-xs">
          <button
            id="btn-back-to-website"
            type="button"
            onClick={onBackToPublic}
            className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Public Website</span>
          </button>
          <span className="text-slate-400 dark:text-slate-600">
            {defaultBusinessConfig.companyName}
          </span>
        </div>
      )}

      {/* Main Card */}
      <div
        id="login-card"
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-orange-600 font-bold text-white shadow-md text-xl mb-3">
            X
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {defaultBusinessConfig.publicBrandName}
          </h1>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <ShieldCheck className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Staff Portal
            </p>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div
            id="login-error-banner"
            role="alert"
            className={`mb-5 p-3 rounded-lg flex items-start gap-2.5 text-xs ${
              isNetworkError
                ? 'bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            }`}
          >
            {isNetworkError ? (
              <WifiOff className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            )}
            <div className="flex-1 text-left">
              <p className="font-semibold">
                {isNetworkError ? 'Connection Issue' : 'Authentication Failed'}
              </p>
              <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4 text-left">
          {/* Email Field */}
          <div>
            <label
              htmlFor="staff-email-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                id="staff-email-input"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                placeholder="staff@xforce.internal"
                className={`w-full rounded-lg border pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                  emailError
                    ? 'border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-300 dark:border-slate-700 focus:border-orange-500 focus:ring-orange-500/20'
                }`}
              />
            </div>
            {emailError && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                {emailError}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="staff-password-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Password
              </label>
              {onForgotPassword && (
                <button
                  id="btn-forgot-password"
                  type="button"
                  onClick={onForgotPassword}
                  className="text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400 font-medium transition"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="staff-password-input"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                placeholder="••••••••••••"
                className={`w-full rounded-lg border pl-9 pr-10 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                  passwordError
                    ? 'border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-300 dark:border-slate-700 focus:border-orange-500 focus:ring-orange-500/20'
                }`}
              />
              <button
                type="button"
                id="btn-toggle-password-visibility"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordError && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                {passwordError}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              id="btn-submit-login"
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={isSubmitting || isLoading}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Sign In
            </Button>
          </div>
        </form>

        {/* Security Notice */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal">
            Authorized staff of {defaultBusinessConfig.companyName} only. All authentication events
            and access attempts are securely audited.
          </p>
        </div>
      </div>

      {/* Staff Test Credentials & RBAC Verification Panel */}
      <div
        id="dev-auth-persona-switcher"
        className="w-full max-w-md mt-6 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur text-left text-xs"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <UserCheck className="h-4 w-4 text-orange-600" />
            <span>Authorized Staff Credentials & Roles</span>
          </div>
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-mono">
            RBAC Guard
          </span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
          Select any registered staff account below to auto-fill its credentials and verify strict authentication and role-based permissions:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Administrator */}
          <button
            type="button"
            onClick={() => handleAutofillCredentials('admin@xforce.com', 'XforceAdmin2026!')}
            className="p-2 text-left rounded-lg border border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/40 text-orange-900 dark:text-orange-300 transition group"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-[11px]">Administrator</span>
              <span className="text-[9px] uppercase tracking-wider font-semibold bg-orange-200/60 dark:bg-orange-900/40 px-1 py-0.5 rounded">
                Full Access
              </span>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 truncate">
              admin@xforce.com
            </p>
            <p className="text-[9px] text-orange-700 dark:text-orange-400 font-mono mt-0.5">
              Pass: XforceAdmin2026!
            </p>
          </button>

          {/* Sales Manager */}
          <button
            type="button"
            onClick={() => handleAutofillCredentials('sales.manager@xforce.internal', 'XforceSales2026!')}
            className="p-2 text-left rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/40 text-blue-900 dark:text-blue-300 transition group"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-[11px]">Sales Manager</span>
              <span className="text-[9px] uppercase tracking-wider font-semibold bg-blue-200/60 dark:bg-blue-900/40 px-1 py-0.5 rounded">
                Sales/Quotes
              </span>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 truncate">
              sales.manager@xforce.internal
            </p>
            <p className="text-[9px] text-blue-700 dark:text-blue-400 font-mono mt-0.5">
              Pass: XforceSales2026!
            </p>
          </button>

          {/* Warehouse Staff */}
          <button
            type="button"
            onClick={() => handleAutofillCredentials('yard.supervisor@xforce.internal', 'XforceYard2026!')}
            className="p-2 text-left rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 transition group"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-[11px]">Warehouse & Yard</span>
              <span className="text-[9px] uppercase tracking-wider font-semibold bg-emerald-200/60 dark:bg-emerald-900/40 px-1 py-0.5 rounded">
                Stock/Orders
              </span>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 truncate">
              yard.supervisor@xforce.internal
            </p>
            <p className="text-[9px] text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
              Pass: XforceYard2026!
            </p>
          </button>

          {/* POS Cashier */}
          <button
            type="button"
            onClick={() => handleAutofillCredentials('cashier@xforce.internal', 'XforcePos2026!')}
            className="p-2 text-left rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-300 transition group"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-[11px]">POS Cashier</span>
              <span className="text-[9px] uppercase tracking-wider font-semibold bg-amber-200/60 dark:bg-amber-900/40 px-1 py-0.5 rounded">
                Counter/POS
              </span>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 truncate">
              cashier@xforce.internal
            </p>
            <p className="text-[9px] text-amber-700 dark:text-amber-400 font-mono mt-0.5">
              Pass: XforcePos2026!
            </p>
          </button>

          {/* Installation Lead */}
          <button
            type="button"
            onClick={() => handleAutofillCredentials('mason.lead@xforce.internal', 'XforceSite2026!')}
            className="p-2 text-left rounded-lg border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-950/40 text-purple-900 dark:text-purple-300 transition group"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-[11px]">Installation Staff</span>
              <span className="text-[9px] uppercase tracking-wider font-semibold bg-purple-200/60 dark:bg-purple-900/40 px-1 py-0.5 rounded">
                Site/Jobs
              </span>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 truncate">
              mason.lead@xforce.internal
            </p>
            <p className="text-[9px] text-purple-700 dark:text-purple-400 font-mono mt-0.5">
              Pass: XforceSite2026!
            </p>
          </button>

          {/* Inactive / Suspended Account (Test Security Barrier) */}
          <button
            type="button"
            onClick={() => handleAutofillCredentials('former.staff@xforce.internal', 'XforceStaff2026!')}
            className="p-2 text-left rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-900 dark:text-rose-300 transition group"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-[11px]">Inactive Staff</span>
              <span className="text-[9px] uppercase tracking-wider font-semibold bg-rose-200/60 dark:bg-rose-900/40 px-1 py-0.5 rounded text-rose-700 dark:text-rose-300">
                Barred / Inactive
              </span>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 truncate">
              former.staff@xforce.internal
            </p>
            <p className="text-[9px] text-rose-700 dark:text-rose-400 font-mono mt-0.5">
              Tests Inactive Account Barrier
            </p>
          </button>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
          <p>
            <strong className="text-slate-700 dark:text-slate-300">Security Rule:</strong> Wrong passwords (e.g. &quot;wrong&quot;, &quot;123456&quot;) or unregistered emails are strictly rejected. Inactive accounts are blocked with an explicit suspension notice.
          </p>
        </div>
      </div>
    </div>
  );
};
