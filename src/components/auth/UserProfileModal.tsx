/**
 * Staff User Profile Modal
 * XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
 * Secure profile viewing and personal credential management.
 */

import React, { useState } from 'react';
import {
  User,
  Shield,
  Key,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { validateSecurePassword } from '../../utils/securitySanitizer';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { profile, role, permissions, updateProfile, updatePassword, isAdministrator } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'permissions'>('profile');

  // Edit profile form
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState<string | null>(null);
  const [profileErrorMessage, setProfileErrorMessage] = useState<string | null>(null);

  // Change password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [securitySuccessMessage, setSecuritySuccessMessage] = useState<string | null>(null);
  const [securityErrorMessage, setSecurityErrorMessage] = useState<string | null>(null);

  if (!isOpen || !profile) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrorMessage(null);
    setProfileSuccessMessage(null);

    if (!fullName.trim()) {
      setProfileErrorMessage('Full name cannot be empty.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
      });
      setProfileSuccessMessage('Profile details updated successfully.');
    } catch (err: any) {
      setProfileErrorMessage(err.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityErrorMessage(null);
    setSecuritySuccessMessage(null);

    const check = validateSecurePassword(newPassword);
    if (!check.isValid) {
      setSecurityErrorMessage(check.error || 'Password does not satisfy security requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityErrorMessage('Passwords do not match.');
      return;
    }

    setIsSavingPassword(true);
    try {
      await updatePassword(newPassword);
      setSecuritySuccessMessage('Password changed successfully.');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
    } catch (err: any) {
      setSecurityErrorMessage(err.message || 'Failed to change password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div
      id="user-profile-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="user-profile-modal-card"
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-bold">
              {profile.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Staff Profile & Security
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{profile.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50 dark:bg-slate-950/40 text-xs">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3 font-semibold border-b-2 -mb-px transition flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Profile Details</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-3 px-3 font-semibold border-b-2 -mb-px transition flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Key className="h-3.5 w-3.5" />
            <span>Password & Security</span>
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`py-3 px-3 font-semibold border-b-2 -mb-px transition flex items-center gap-1.5 ${
              activeTab === 'permissions'
                ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Permissions ({permissions.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* TAB 1: Profile Details */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {profileSuccessMessage && (
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{profileSuccessMessage}</span>
                </div>
              )}
              {profileErrorMessage && (
                <div className="p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{profileErrorMessage}</span>
                </div>
              )}

              {/* Role and Status Read-only Badges */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Assigned Staff Role:</span>
                  <span className="font-bold text-slate-900 dark:text-white bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 px-2 py-0.5 rounded text-[11px]">
                    {role?.display_name || role?.name || 'Staff'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Account Status:</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded text-[11px] capitalize">
                    {profile.status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                  Role assignments and status are controlled exclusively by an Administrator.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address (Read-Only)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="email"
                    disabled
                    value={profile.email}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 cursor-not-allowed text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 pl-9 pr-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition text-xs"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  id="btn-save-profile-details"
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="w-full"
                  isLoading={isSavingProfile}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          )}

          {/* TAB 2: Security & Password Change */}
          {activeTab === 'security' && (
            <form onSubmit={handleSavePassword} className="space-y-4">
              {securitySuccessMessage && (
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{securitySuccessMessage}</span>
                </div>
              )}
              {securityErrorMessage && (
                <div className="p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{securityErrorMessage}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 pl-9 pr-10 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 pl-9 pr-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  id="btn-update-security-password"
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="w-full"
                  isLoading={isSavingPassword}
                  disabled={!newPassword || newPassword.length < 8}
                >
                  Update Password
                </Button>
              </div>
            </form>
          )}

          {/* TAB 3: Permissions Summary */}
          {activeTab === 'permissions' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40 flex items-start gap-2 text-xs">
                <ShieldCheck className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                <p className="text-orange-900 dark:text-orange-200">
                  You are authorized under the <span className="font-bold">{role?.display_name}</span> role. Permissions are enforced directly by database Row Level Security policies.
                </p>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
                {permissions.map((perm) => (
                  <div key={perm} className="px-3 py-2 flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {perm}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                      Granted
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
