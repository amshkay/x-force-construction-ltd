/**
 * Account Deactivated / Suspended Notice
 * XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
 * Secure lock screen for inactive or suspended staff members.
 */

import React from 'react';
import { ShieldX, Mail, Phone, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { defaultBusinessConfig } from '../../config/business.config';
import { Button } from '../ui/Button';

interface AccountDeactivatedPageProps {
  onBackToPublic?: () => void;
}

export const AccountDeactivatedPage: React.FC<AccountDeactivatedPageProps> = ({ onBackToPublic }) => {
  const { profile, logout } = useAuth();

  return (
    <div
      id="account-deactivated-page"
      className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950 px-4 py-12 transition-colors"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-900/50 shadow-sm p-6 sm:p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mb-4">
          <ShieldX className="h-8 w-8" />
        </div>

        <h1 className="text-lg font-bold text-slate-900 dark:text-white">
          Account Access Restricted
        </h1>

        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
          The staff profile associated with <span className="font-semibold text-slate-800 dark:text-slate-200">{profile?.email || 'this account'}</span> is currently <span className="font-bold text-rose-600 dark:text-rose-400 uppercase">{profile?.status || 'inactive'}</span>.
        </p>

        <div className="my-6 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-left space-y-2 text-xs">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            Next Steps:
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Please contact your system administrator or the Operations Directorate at {defaultBusinessConfig.companyName} to reactivate your operational privileges.
          </p>
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1 text-slate-500 text-[11px]">
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-orange-600" />
              <span>{defaultBusinessConfig.contact.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-orange-600" />
              <span>{defaultBusinessConfig.contact.phone}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            id="btn-deactivated-logout"
            variant="outline"
            size="md"
            className="w-full"
            onClick={() => logout()}
            leftIcon={<LogOut className="h-4 w-4" />}
          >
            Sign Out & Switch Account
          </Button>

          {onBackToPublic && (
            <Button
              id="btn-deactivated-return-public"
              variant="ghost"
              size="sm"
              className="w-full text-slate-500"
              onClick={onBackToPublic}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Return to Public Website
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
