/**
 * Reset Password Page
 * XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
 * Single-business password reset confirmation
 */

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { defaultBusinessConfig } from '../../config/business.config';
import { Button } from '../ui/Button';
import { validateSecurePassword } from '../../utils/securitySanitizer';

interface ResetPasswordPageProps {
  onSuccess?: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onSuccess }) => {
  const { updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Validations
  const isMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isPasswordValid = isMinLength && hasLetter && hasNumberOrSymbol && passwordsMatch;

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
      await updatePassword(newPassword);
      setIsCompleted(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password. Session may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="reset-password-page"
      className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950 px-4 py-12 transition-colors"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 text-left">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 font-bold text-white text-lg mb-2 shadow-sm">
            X
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Set New Password
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {defaultBusinessConfig.companyName}
          </p>
        </div>

        {isCompleted ? (
          <div className="text-center space-y-4 py-2 animate-in fade-in duration-300">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Password Successfully Updated
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Your new security credential has been established. You may now continue to your workspace.
              </p>
            </div>
            <div className="pt-2">
              <Button
                id="btn-continue-after-reset"
                variant="primary"
                size="md"
                className="w-full"
                onClick={onSuccess}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Proceed to Dashboard
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 text-xs flex items-start gap-2"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="new-password-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="new-password-input"
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
                htmlFor="confirm-password-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="confirm-password-input"
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

            {/* Password Requirements Checklist */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
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
                <span>At least one letter (a-z, A-Z)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={hasNumberOrSymbol ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                  {hasNumberOrSymbol ? '✓' : '•'}
                </span>
                <span>At least one number or special character</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={passwordsMatch ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                  {passwordsMatch ? '✓' : '•'}
                </span>
                <span>Passwords match</span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                id="btn-save-new-password"
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                isLoading={isSubmitting}
                disabled={!isPasswordValid}
              >
                Set New Password
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
