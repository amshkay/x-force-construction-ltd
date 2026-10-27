/**
 * First-Login Account Setup & Mandatory Password Change
 * XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
 * Enforces setting a personal password on first login before system access.
 */

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { defaultBusinessConfig } from '../../config/business.config';
import { Button } from '../ui/Button';
import { validateSecurePassword } from '../../utils/securitySanitizer';

interface SetupAccountPageProps {
  onComplete: () => void;
}

export const SetupAccountPage: React.FC<SetupAccountPageProps> = ({ onComplete }) => {
  const { profile, completeFirstTimeSetup, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isValid = isMinLength && hasLetter && hasNumberOrSymbol && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const check = validateSecurePassword(newPassword);
    if (!check.isValid) {
      setErrorMessage(check.error || 'Password does not meet security requirements.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await completeFirstTimeSetup(newPassword);
      onComplete();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete initial security setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="setup-account-page"
      className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950 px-4 py-12 transition-colors"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 text-left">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-orange-600 font-bold text-white text-xl mb-3 shadow-md">
            X
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Mandatory Security Setup
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Welcome, <span className="font-semibold text-slate-700 dark:text-slate-300">{profile?.full_name || 'Staff Member'}</span>.
          </p>
        </div>

        <div className="mb-5 p-3 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-xs flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="leading-relaxed">
            <p className="font-semibold">First-Time Login Requirement</p>
            <p className="mt-0.5">
              To protect company and client data, you must establish a personal, secure password before accessing the {defaultBusinessConfig.companyName} portal.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 text-xs"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label
              htmlFor="setup-password-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              New Personal Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="setup-password-input"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 pl-9 pr-10 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-orange-500 focus:ring-orange-500/20 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="setup-confirm-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Confirm Personal Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="setup-confirm-input"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-orange-500 focus:ring-orange-500/20 transition"
              />
            </div>
          </div>

          {/* Checklist */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className={isMinLength ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                {isMinLength ? '✓' : '•'}
              </span>
              <span>Minimum 8 characters</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={hasLetter ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                {hasLetter ? '✓' : '•'}
              </span>
              <span>Contains letters</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={hasNumberOrSymbol ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                {hasNumberOrSymbol ? '✓' : '•'}
              </span>
              <span>Contains numbers or symbols</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={passwordsMatch ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                {passwordsMatch ? '✓' : '•'}
              </span>
              <span>Passwords match</span>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <Button
              id="btn-complete-account-setup"
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={isSubmitting}
              disabled={!isValid}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Activate Account & Enter
            </Button>

            <Button
              id="btn-abort-setup-logout"
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-slate-500 dark:text-slate-400"
              onClick={() => logout()}
            >
              Cancel & Sign Out
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
