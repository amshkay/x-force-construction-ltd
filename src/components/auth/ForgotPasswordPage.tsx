/**
 * Forgot Password Page
 * XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
 * Single-business password recovery
 */

import React, { useState } from 'react';
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { defaultBusinessConfig } from '../../config/business.config';
import { Button } from '../ui/Button';

interface ForgotPasswordPageProps {
  onBackToLogin: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onBackToLogin }) => {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    setErrorMessage(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setFieldError('Email address is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setFieldError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await requestPasswordReset(trimmed);
      setSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to process password reset request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="forgot-password-page"
      className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950 px-4 py-12 transition-colors"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 text-left">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 font-bold text-white text-lg mb-2 shadow-sm">
            X
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Reset Staff Password
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {defaultBusinessConfig.companyName}
          </p>
        </div>

        {submitted ? (
          <div className="text-center space-y-4 py-2 animate-in fade-in duration-300">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Recovery Link Dispatched
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                If an active account exists with the address <span className="font-semibold text-slate-900 dark:text-white">{email}</span>, a secure password reset link has been dispatched.
              </p>
            </div>
            <div className="pt-2">
              <Button
                id="btn-return-to-login"
                variant="outline"
                size="md"
                className="w-full"
                onClick={onBackToLogin}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Return to Sign In
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Enter your registered staff email address. We will verify your account and send a secure reset link.
            </p>

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
                htmlFor="reset-email-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="reset-email-input"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldError) setFieldError(null);
                  }}
                  placeholder="staff@xforce.internal"
                  className={`w-full rounded-lg border pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                    fieldError
                      ? 'border-rose-500 focus:ring-rose-500/20'
                      : 'border-slate-300 dark:border-slate-700 focus:border-orange-500 focus:ring-orange-500/20'
                  }`}
                />
              </div>
              {fieldError && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {fieldError}
                </p>
              )}
            </div>

            <div className="pt-2 space-y-2">
              <Button
                id="btn-send-reset-link"
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                isLoading={isSubmitting}
                rightIcon={<Send className="h-4 w-4" />}
              >
                Send Reset Link
              </Button>

              <Button
                id="btn-cancel-reset"
                type="button"
                variant="ghost"
                size="md"
                className="w-full text-slate-600 dark:text-slate-400"
                onClick={onBackToLogin}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Back to Sign In
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
