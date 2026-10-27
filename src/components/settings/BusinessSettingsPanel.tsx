/**
 * Business Settings & Configuration Management Panel
 * Module 04: Centralized Business Settings & Configuration
 *
 * Provides a unified administrative interface for XFORCE Construction Ltd / X-FORCE BRICKS.
 * Enforces `settings.view` and `settings.manage` RBAC permissions, provides audit logging,
 * real-time previews, logo/favicon uploaders, GPS geolocation detection, and tabbed organization.
 */

import React, { useState, useEffect, useId } from 'react';
import {
  Building2,
  Phone,
  Palette,
  Globe,
  Coins,
  Clock,
  Hash,
  CreditCard,
  ToggleLeft,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Upload,
  ExternalLink,
  MapPin,
  ShieldAlert,
  Info,
  ChevronRight,
  Eye,
  Trash2,
  Database,
  RefreshCw,
} from 'lucide-react';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSION_CODES } from '../../types/auth';
import {
  FullBusinessSettings,
  DayOfWeek,
  PaymentMethodConfig,
  FeatureTogglesConfig,
} from '../../types/business';
import { mediaService } from '../../services/media.service';
import { clearAllAdminMockRecords } from '../../utils/dataManagement';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { getWhatsAppUrl } from '../../utils/whatsapp';
import { useToast } from '../ui/Toast';
import { ImageInputWithUpload } from '../ui/ImageInputWithUpload';
import { ServicesManagementModal } from './ServicesManagementModal';
import { Button } from '../ui/Button';

type SettingsTab =
  | 'identity'
  | 'contact'
  | 'branding'
  | 'website'
  | 'regional'
  | 'hours'
  | 'numbering'
  | 'payments'
  | 'features'
  | 'data_reset';

const DAYS_OF_WEEK: { key: DayOfWeek; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export const BusinessSettingsPanel: React.FC = () => {
  const { settings, updateSettings, resetToDefaults, isSaving, isLoading } = useBusinessSettings();
  const { hasPermission } = useAuth();
  const toast = useToast();

  const canManage = hasPermission(PERMISSION_CODES.SETTINGS_MANAGE);
  const canView = hasPermission(PERMISSION_CODES.SETTINGS_VIEW) || canManage;

  const [activeTab, setActiveTab] = useState<SettingsTab>('identity');
  const [formData, setFormData] = useState<FullBusinessSettings>(settings);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetReason, setResetReason] = useState<string>('');
  const [showPurgeRecordsModal, setShowPurgeRecordsModal] = useState<boolean>(false);
  const [isPurgingRecords, setIsPurgingRecords] = useState<boolean>(false);

  const companyNameId = useId();
  const brandNameId = useId();
  const shortNameId = useId();
  const sloganId = useId();
  const descriptionId = useId();
  const categoryId = useId();
  const tinId = useId();

  // Synchronize local form when remote settings change (if not dirty)
  useEffect(() => {
    if (!hasChanges) {
      setFormData(settings);
    }
  }, [settings, hasChanges]);

  // Keyboard shortcut Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (canManage && hasChanges && !isSaving) {
          handleSave();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canManage, hasChanges, isSaving, formData]);

  if (!canView) {
    return (
      <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl p-8 text-center max-w-xl mx-auto my-12">
        <ShieldAlert className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">
          Access Restricted
        </h3>
        <p className="text-sm text-red-700 dark:text-red-300">
          You do not have the required permission (<code>{PERMISSION_CODES.SETTINGS_VIEW}</code>)
          to view or manage enterprise business configuration. Please contact your system administrator.
        </p>
      </div>
    );
  }

  const handleFieldChange = (field: keyof FullBusinessSettings, value: any) => {
    if (!canManage) return;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleNestedChange = (parent: keyof FullBusinessSettings, subKey: string, value: any) => {
    if (!canManage) return;
    setFormData((prev) => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as any),
        [subKey]: value,
      },
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleHoursChange = (day: DayOfWeek, field: 'isOpen' | 'openTime' | 'closeTime', value: any) => {
    if (!canManage) return;
    setFormData((prev) => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          [field]: value,
        },
      },
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handlePaymentToggle = (paymentId: string) => {
    if (!canManage) return;
    setFormData((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.map((pm) =>
        pm.id === paymentId ? { ...pm, isEnabled: !pm.isEnabled } : pm
      ),
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleBankDetailsChange = (field: string, value: string) => {
    if (!canManage) return;
    setFormData((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.map((pm) => {
        if (pm.code === 'bank_transfer') {
          return {
            ...pm,
            bankDetails: {
              ...(pm.bankDetails || {
                bankName: '',
                accountName: '',
                accountNumber: '',
              }),
              [field]: value,
            },
          };
        }
        return pm;
      }),
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleFeatureToggle = (featureKey: keyof FeatureTogglesConfig) => {
    if (!canManage) return;
    setFormData((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [featureKey]: !prev.features[featureKey],
      },
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!canManage) return;
    setSaveError(null);
    try {
      const success = await updateSettings(formData, 'Admin updated business configuration');
      if (success) {
        setHasChanges(false);
        setSaveSuccess(true);
        toast.success('Business Settings Saved', 'All settings and public website content updated successfully.');
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setSaveError('Failed to save settings to the database.');
        toast.error('Save Failed', 'Failed to save settings to the database.');
      }
    } catch (err: any) {
      setSaveError(err.message || 'An error occurred while saving.');
      toast.error('Save Error', err.message || 'An error occurred while saving.');
    }
  };

  const handleSaveWebsiteSection = async () => {
    if (!canManage) return;
    setSaveError(null);
    try {
      const success = await updateSettings(formData, 'Admin published website & hero changes');
      if (success) {
        setHasChanges(false);
        setSaveSuccess(true);
        toast.success(
          'Homepage & Hero Published',
          'Your new hero image and website settings are now active live on the homepage!'
        );
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        toast.error('Save Failed', 'Could not save website changes.');
      }
    } catch (err: any) {
      toast.error('Save Error', err.message || 'Error saving website configuration.');
    }
  };

  const handleSaveHeroDirectly = async (newHeroUrl?: string) => {
    if (!canManage) return;
    const urlToUse = newHeroUrl !== undefined ? newHeroUrl : formData.websiteContent.heroImageUrl;
    const updated: FullBusinessSettings = {
      ...formData,
      websiteContent: {
        ...formData.websiteContent,
        heroImageUrl: urlToUse,
      },
    };
    setFormData(updated);
    try {
      const success = await updateSettings(updated, 'Admin updated and published hero image');
      if (success) {
        setHasChanges(false);
        setSaveSuccess(true);
        toast.success(
          'Hero Image Published Live',
          'Your homepage is now displaying the newly selected hero image!'
        );
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        toast.error('Publish Failed', 'Could not save hero image.');
      }
    } catch (err: any) {
      toast.error('Publish Error', err.message || 'Error saving hero image.');
    }
  };

  const handleDiscard = () => {
    setFormData(settings);
    setHasChanges(false);
    setSaveError(null);
  };

  const handleResetConfirm = async () => {
    if (!canManage) return;
    try {
      const success = await resetToDefaults(resetReason || 'Reset to factory defaults');
      if (success) {
        setFormData(settings);
        setHasChanges(false);
        setShowResetModal(false);
        setResetReason('');
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to reset settings.');
    }
  };

  const handleFileUpload = async (
    targetField: 'logo' | 'favicon' | 'hero' | 'secondaryHero',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!canManage) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(targetField);
    setSaveError(null);

    try {
      const folder = targetField === 'favicon' ? 'branding/favicons' : 'branding';
      const path = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      const uploaded = await mediaService.uploadMedia(file, path, {
        bucket: 'media',
        maxSizeBytes: targetField === 'favicon' ? 1024 * 1024 : 5 * 1024 * 1024,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/x-icon'],
      });

      if (targetField === 'logo') {
        handleNestedChange('branding', 'logoUrl', uploaded.url);
      } else if (targetField === 'favicon') {
        handleNestedChange('branding', 'faviconUrl', uploaded.url);
      } else if (targetField === 'hero') {
        handleNestedChange('websiteContent', 'heroImageUrl', uploaded.url);
      } else if (targetField === 'secondaryHero') {
        handleNestedChange('websiteContent', 'secondaryHeroImageUrl', uploaded.url);
      }
    } catch (err: any) {
      setSaveError(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(null);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.warning('Geolocation is not supported by your browser.', 'GPS Unavailable');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(7));
        const lng = parseFloat(pos.coords.longitude.toFixed(7));
        setFormData((prev) => ({
          ...prev,
          location: {
            ...prev.location,
            latitude: lat,
            longitude: lng,
            mapLinkUrl: `https://maps.google.com/?q=${lat},${lng}`,
          },
        }));
        setHasChanges(true);
        toast.success(`Coordinates detected: ${lat}, ${lng}`, 'GPS Acquired');
      },
      (err) => {
        toast.error(`Location detection failed: ${err.message}`, 'GPS Error');
      }
    );
  };

  const applyWeekdayPreset = () => {
    if (!canManage) return;
    setFormData((prev) => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        monday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
        tuesday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
        wednesday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
        thursday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
        friday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
        saturday: { isOpen: true, openTime: '09:00', closeTime: '16:00' },
        sunday: { isOpen: false, openTime: '09:00', closeTime: '16:00' },
      },
    }));
    setHasChanges(true);
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'identity', label: 'Identity & Legal', icon: Building2 },
    { id: 'contact', label: 'Contact & Location', icon: Phone },
    { id: 'branding', label: 'Branding & Media', icon: Palette },
    { id: 'website', label: 'Public Website', icon: Globe },
    { id: 'regional', label: 'Currency & Regional', icon: Coins },
    { id: 'hours', label: 'Operating Hours', icon: Clock },
    { id: 'numbering', label: 'ID Numbering', icon: Hash },
    { id: 'payments', label: 'Payment Methods', icon: CreditCard },
    { id: 'features', label: 'Feature Toggles', icon: ToggleLeft },
    { id: 'data_reset', label: 'Data & Test Reset', icon: Database },
  ];

  return (
    <div id="business-settings-panel" className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header with Title and Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Business Settings & Configuration
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Central management of enterprise identity, branding, contacts, numbering, and feature switches.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              Discard
            </button>
          )}

          {canManage && (
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              disabled={isSaving}
              title="Reset all settings to initial system defaults"
              className="p-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-red-300 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}

          {canManage ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl text-white shadow-sm transition-all ${
                hasChanges && !isSaving
                  ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/25 active:scale-[0.98]'
                  : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          ) : (
            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
              Read-Only Mode
            </span>
          )}
        </div>
      </div>

      {/* Status Notifications */}
      {saveSuccess && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-800 dark:text-emerald-300 text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Business settings successfully saved and applied system-wide.</span>
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-800 dark:text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {!canManage && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl text-blue-800 dark:text-blue-300 text-sm">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>
            You have <strong>{PERMISSION_CODES.SETTINGS_VIEW}</strong> permission. You can review all enterprise settings, but saving updates requires the <strong>{PERMISSION_CODES.SETTINGS_MANAGE}</strong> administrative privilege.
          </span>
        </div>
      )}

      {/* Main Settings Navigation and Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Bar */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm">
          <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap text-left ${
                    isActive
                      ? 'bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'}`} />
                  <span className="flex-1">{tab.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 hidden lg:block opacity-60" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Active Tab Content */}
        <div className="lg:col-span-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* TAB 1: IDENTITY & LEGAL */}
          {activeTab === 'identity' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Business Identity & Registration</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Legal company name, public trading brand name, and registered business identification.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor={companyNameId} className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Legal Company Name *
                  </label>
                  <input
                    id={companyNameId}
                    type="text"
                    disabled={!canManage}
                    value={formData.companyName}
                    onChange={(e) => handleFieldChange('companyName', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="e.g. XFORCE CONSTRUCTION LTD"
                  />
                  <span className="text-xs text-slate-500 mt-1 block">Used on invoices, contracts, and legal receipts.</span>
                </div>

                <div>
                  <label htmlFor={brandNameId} className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Public Brand Name *
                  </label>
                  <input
                    id={brandNameId}
                    type="text"
                    disabled={!canManage}
                    value={formData.publicBrandName}
                    onChange={(e) => handleFieldChange('publicBrandName', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="e.g. X-FORCE BRICKS"
                  />
                  <span className="text-xs text-slate-500 mt-1 block">Displayed across public website and store headers.</span>
                </div>

                <div>
                  <label htmlFor={shortNameId} className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Short / Abbreviated Name
                  </label>
                  <input
                    id={shortNameId}
                    type="text"
                    disabled={!canManage}
                    value={formData.shortName}
                    onChange={(e) => handleFieldChange('shortName', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="e.g. X-FORCE"
                  />
                </div>

                <div>
                  <label htmlFor={tinId} className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    RC / TIN Registration Number
                  </label>
                  <input
                    id={tinId}
                    type="text"
                    disabled={!canManage}
                    value={formData.tinNumber}
                    onChange={(e) => handleFieldChange('tinNumber', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="e.g. RC-1849204"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor={sloganId} className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Company Tagline / Slogan
                  </label>
                  <input
                    id={sloganId}
                    type="text"
                    disabled={!canManage}
                    value={formData.slogan}
                    onChange={(e) => handleFieldChange('slogan', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="e.g. Building Excellence. Finishing with Pride."
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor={categoryId} className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Primary Business Category
                  </label>
                  <input
                    id={categoryId}
                    type="text"
                    disabled={!canManage}
                    value={formData.businessCategory}
                    onChange={(e) => handleFieldChange('businessCategory', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="e.g. Building Materials Manufacturer & Construction"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor={descriptionId} className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Corporate Description
                  </label>
                  <textarea
                    id={descriptionId}
                    rows={4}
                    disabled={!canManage}
                    value={formData.businessDescription}
                    onChange={(e) => handleFieldChange('businessDescription', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTACT & LOCATION */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Contact & Physical Location</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Customer communication channels, factory yard physical address, and GPS navigation coordinates.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Official Email *
                  </label>
                  <input
                    type="email"
                    disabled={!canManage}
                    value={formData.contactEmail}
                    onChange={(e) => handleFieldChange('contactEmail', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Primary Phone *
                  </label>
                  <input
                    type="tel"
                    disabled={!canManage}
                    value={formData.contactPhone}
                    onChange={(e) => handleFieldChange('contactPhone', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Secondary / Sales Phone
                  </label>
                  <input
                    type="tel"
                    disabled={!canManage}
                    value={formData.secondaryPhone}
                    onChange={(e) => handleFieldChange('secondaryPhone', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      WhatsApp Business Number *
                    </label>
                    <a
                      href={getWhatsAppUrl(formData.whatsappNumber, 'Hello X-FORCE, testing business WhatsApp link')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Test Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="tel"
                    disabled={!canManage}
                    value={formData.whatsappNumber}
                    onChange={(e) => handleFieldChange('whatsappNumber', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="+234 803 000 0000"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Public Website URL
                  </label>
                  <input
                    type="url"
                    disabled={!canManage}
                    value={formData.websiteUrl}
                    onChange={(e) => handleFieldChange('websiteUrl', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                {/* Street Address */}
                <div className="md:col-span-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Physical Factory Yard Address</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">Street Address</label>
                      <input
                        type="text"
                        disabled={!canManage}
                        value={formData.address.street}
                        onChange={(e) => handleNestedChange('address', 'street', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">City</label>
                      <input
                        type="text"
                        disabled={!canManage}
                        value={formData.address.city}
                        onChange={(e) => handleNestedChange('address', 'city', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">State</label>
                      <input
                        type="text"
                        disabled={!canManage}
                        value={formData.address.state}
                        onChange={(e) => handleNestedChange('address', 'state', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Country</label>
                      <input
                        type="text"
                        disabled={!canManage}
                        value={formData.address.country}
                        onChange={(e) => handleNestedChange('address', 'country', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Postal Code</label>
                      <input
                        type="text"
                        disabled={!canManage}
                        value={formData.address.postalCode || ''}
                        onChange={(e) => handleNestedChange('address', 'postalCode', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* GPS Navigation & Maps */}
                <div className="md:col-span-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">GPS Coordinates & Logistics Navigation</h3>
                      <p className="text-xs text-slate-500">Accurate coordinates for delivery drivers and walk-in buyers.</p>
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={handleDetectLocation}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 rounded-lg hover:bg-orange-100 transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Detect Location</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Latitude</label>
                      <input
                        type="number"
                        step="0.0000001"
                        disabled={!canManage}
                        value={formData.location.latitude ?? ''}
                        onChange={(e) =>
                          handleNestedChange('location', 'latitude', e.target.value ? parseFloat(e.target.value) : null)
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                        placeholder="6.5243793"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Longitude</label>
                      <input
                        type="number"
                        step="0.0000001"
                        disabled={!canManage}
                        value={formData.location.longitude ?? ''}
                        onChange={(e) =>
                          handleNestedChange('location', 'longitude', e.target.value ? parseFloat(e.target.value) : null)
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                        placeholder="3.3792057"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Google Maps Link</label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          disabled={!canManage}
                          value={formData.location.mapLinkUrl || ''}
                          onChange={(e) => handleNestedChange('location', 'mapLinkUrl', e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                        />
                        {formData.location.mapLinkUrl && (
                          <a
                            href={formData.location.mapLinkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-500 hover:text-orange-600 rounded-lg border border-slate-200 dark:border-slate-800"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="block text-xs text-slate-500 mb-1">Yard Location Instructions</label>
                      <input
                        type="text"
                        disabled={!canManage}
                        value={formData.location.locationDescription || ''}
                        onChange={(e) => handleNestedChange('location', 'locationDescription', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                        placeholder="e.g. Main Factory Yard & Heavy Duty Loading Bay, Km 14 Industrial Corridor, Lagos"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BRANDING & MEDIA */}
          {activeTab === 'branding' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Branding, Media & Theme Assets</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Upload corporate logos, favicons, and customize theme primary colors.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Logo Uploader */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-950/40">
                  <ImageInputWithUpload
                    id="business-logo-uploader"
                    label="Company Brand Logo"
                    helperText="Upload PNG, SVG, or WebP (transparent background recommended) or paste an online URL."
                    value={formData.branding.logoUrl}
                    onChange={(url) => handleNestedChange('branding', 'logoUrl', url)}
                    onRemove={() => handleNestedChange('branding', 'logoUrl', null)}
                    bucket="business-assets"
                    folder="branding"
                    placeholder="https://... company logo URL"
                    previewHeight="h-24"
                    disabled={!canManage}
                  />
                </div>

                {/* Favicon Uploader */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-950/40">
                  <ImageInputWithUpload
                    id="business-favicon-uploader"
                    label="Browser Favicon Icon"
                    helperText="Upload an ICO, PNG, or SVG icon (square recommended) or paste an online URL."
                    value={formData.branding.faviconUrl}
                    onChange={(url) => handleNestedChange('branding', 'faviconUrl', url)}
                    onRemove={() => handleNestedChange('branding', 'faviconUrl', null)}
                    bucket="business-assets"
                    folder="branding"
                    placeholder="https://... favicon URL"
                    previewHeight="h-20"
                    disabled={!canManage}
                  />
                </div>

                {/* Brand Colors */}
                <div className="md:col-span-2 border-t border-slate-200 dark:border-slate-800 pt-6">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Enterprise Brand Palette</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                        Primary Brand Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          disabled={!canManage}
                          value={formData.branding.primaryBrandColor}
                          onChange={(e) => handleNestedChange('branding', 'primaryBrandColor', e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                        />
                        <input
                          type="text"
                          disabled={!canManage}
                          value={formData.branding.primaryBrandColor}
                          onChange={(e) => handleNestedChange('branding', 'primaryBrandColor', e.target.value)}
                          className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                        Secondary Neutral Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          disabled={!canManage}
                          value={formData.branding.secondaryBrandColor}
                          onChange={(e) => handleNestedChange('branding', 'secondaryBrandColor', e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                        />
                        <input
                          type="text"
                          disabled={!canManage}
                          value={formData.branding.secondaryBrandColor}
                          onChange={(e) => handleNestedChange('branding', 'secondaryBrandColor', e.target.value)}
                          className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                        Accent / CTA Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          disabled={!canManage}
                          value={formData.branding.accentBrandColor}
                          onChange={(e) => handleNestedChange('branding', 'accentBrandColor', e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                        />
                        <input
                          type="text"
                          disabled={!canManage}
                          value={formData.branding.accentBrandColor}
                          onChange={(e) => handleNestedChange('branding', 'accentBrandColor', e.target.value)}
                          className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PUBLIC WEBSITE */}
          {activeTab === 'website' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Public Website & SEO Copy</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Headlines, descriptions, and metadata displayed to prospective clients on the public catalog.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white block">Public Website Visibility</span>
                    <span className="text-xs text-slate-500">When disabled, public visitors are shown a maintenance screen.</span>
                  </div>
                  <button
                    type="button"
                    disabled={!canManage}
                    onClick={() =>
                      handleNestedChange('websiteContent', 'isPublicVisible', !formData.websiteContent.isPublicVisible)
                    }
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                      formData.websiteContent.isPublicVisible ? 'bg-orange-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        formData.websiteContent.isPublicVisible ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Browser Title Tag (&lt;title&gt;) *
                  </label>
                  <input
                    type="text"
                    disabled={!canManage}
                    value={formData.websiteContent.websiteTitle}
                    onChange={(e) => handleNestedChange('websiteContent', 'websiteTitle', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Search Engine Meta Description
                  </label>
                  <textarea
                    rows={2}
                    disabled={!canManage}
                    value={formData.websiteContent.metaDescription}
                    onChange={(e) => handleNestedChange('websiteContent', 'metaDescription', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Hero Section Heading
                  </label>
                  <input
                    type="text"
                    disabled={!canManage}
                    value={formData.websiteContent.heroHeading}
                    onChange={(e) => handleNestedChange('websiteContent', 'heroHeading', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Hero Section Subheading
                  </label>
                  <textarea
                    rows={2}
                    disabled={!canManage}
                    value={formData.websiteContent.heroSubheading}
                    onChange={(e) => handleNestedChange('websiteContent', 'heroSubheading', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none"
                  />
                </div>

                {/* Hero Showcase Images */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col justify-between">
                    <div>
                      <ImageInputWithUpload
                        id="website-hero-image-uploader"
                        label="Primary Hero Showcase Image"
                        helperText="Featured high-definition background image on the customer portal."
                        value={formData.websiteContent.heroImageUrl}
                        onChange={(url) => handleNestedChange('websiteContent', 'heroImageUrl', url)}
                        onRemove={() => handleNestedChange('websiteContent', 'heroImageUrl', '')}
                        bucket="business-assets"
                        folder="website"
                        placeholder="https://... hero image URL"
                        previewHeight="h-28"
                        disabled={!canManage}
                      />
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Appears as main visual on homepage
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        disabled={!canManage || isSaving}
                        onClick={() => handleSaveHeroDirectly()}
                        leftIcon={<Save className="w-3.5 h-3.5" />}
                        title="Publish this hero image immediately to the live homepage"
                      >
                        Publish Hero Image Live
                      </Button>
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950/40">
                    <ImageInputWithUpload
                      id="website-secondary-hero-uploader"
                      label="Secondary Banner Image"
                      helperText="Supporting material showcase photo displayed in website highlights."
                      value={formData.websiteContent.secondaryHeroImageUrl}
                      onChange={(url) => handleNestedChange('websiteContent', 'secondaryHeroImageUrl', url)}
                      onRemove={() => handleNestedChange('websiteContent', 'secondaryHeroImageUrl', '')}
                      bucket="business-assets"
                      folder="website"
                      placeholder="https://... secondary hero image URL"
                      previewHeight="h-28"
                      disabled={!canManage}
                    />
                  </div>
                </div>

                {/* Live Homepage Hero Section Preview */}
                <div className="rounded-xl border border-orange-200/80 dark:border-orange-900/50 bg-orange-50/20 dark:bg-orange-950/20 p-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                        Live Homepage Hero Preview
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-orange-600 dark:text-orange-400">
                      Simulated Visitor View
                    </span>
                  </div>

                  <div className="relative rounded-xl overflow-hidden h-44 sm:h-52 border border-slate-200 dark:border-slate-800 shadow-md">
                    <img
                      key={formData.websiteContent.heroImageUrl || 'default'}
                      src={formData.websiteContent.heroImageUrl || 'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=1600&q=80'}
                      alt="Hero Live Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-4 text-left">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-600/90 px-2.5 py-0.5 text-[10px] font-semibold text-white w-fit mb-1.5">
                        <span>Hydraulic-Cured 45 MPa Precision Blocks</span>
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-white drop-shadow-sm line-clamp-1">
                        {formData.websiteContent.heroHeading || 'Engineered Interlocking Bricks & Architectural Construction'}
                      </h4>
                      <p className="text-[11px] text-slate-200 line-clamp-2 mt-0.5">
                        {formData.websiteContent.heroSubheading || 'Premium hydraulic-cured paving stones, decorative facing bricks, and turnkey site installation by master masons.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Homepage About Teaser
                  </label>
                  <textarea
                    rows={3}
                    disabled={!canManage}
                    value={formData.websiteContent.aboutDescription}
                    onChange={(e) => handleNestedChange('websiteContent', 'aboutDescription', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Public Footer Copyright & Registration Text
                  </label>
                  <input
                    type="text"
                    disabled={!canManage}
                    value={formData.websiteContent.footerText}
                    onChange={(e) => handleNestedChange('websiteContent', 'footerText', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none"
                  />
                </div>

                {/* Save Website Settings Bar */}
                <div className="flex items-center justify-between p-4 bg-orange-50/50 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-900/40">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white block">
                      Publish Website Configuration
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Instantly updates hero image, metadata, and homepage text on public website.
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleSaveWebsiteSection}
                    disabled={!canManage || isSaving}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    {isSaving ? 'Saving...' : 'Save & Publish Website Live'}
                  </Button>
                </div>

                {/* Specialized Installation Services Management */}
                <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
                  <ServicesManagementModal inline={true} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: REGIONAL & CURRENCY */}
          {activeTab === 'regional' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Regional Settings & Currency</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Configure default business currency, thousand separators, decimal precision, and timezone.
                </p>
              </div>

              {/* Real-time Formatting Preview Card */}
              <div className="p-4 bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50 rounded-xl">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-800 dark:text-orange-300 block mb-1">
                  Live Currency Format Preview
                </span>
                <div className="text-2xl font-black text-orange-600 dark:text-orange-400">
                  {formatCurrency(1845000.5, formData.regional)}
                </div>
                <span className="text-xs text-orange-700/80 dark:text-orange-300/70 mt-1 block">
                  Rendered according to active separators and position settings.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Currency Code *
                  </label>
                  <input
                    type="text"
                    disabled={!canManage}
                    value={formData.regional.currencyCode}
                    onChange={(e) => handleNestedChange('regional', 'currencyCode', e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none"
                    placeholder="NGN"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Currency Symbol *
                  </label>
                  <input
                    type="text"
                    disabled={!canManage}
                    value={formData.regional.currencySymbol}
                    onChange={(e) => handleNestedChange('regional', 'currencySymbol', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none"
                    placeholder="₦"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Symbol Position
                  </label>
                  <select
                    disabled={!canManage}
                    value={formData.regional.currencyPosition}
                    onChange={(e) => handleNestedChange('regional', 'currencyPosition', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none"
                  >
                    <option value="before">Before Amount (e.g. ₦1,500.00)</option>
                    <option value="after">After Amount (e.g. 1,500.00 ₦)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Decimal Places
                  </label>
                  <select
                    disabled={!canManage}
                    value={formData.regional.decimalPlaces}
                    onChange={(e) => handleNestedChange('regional', 'decimalPlaces', parseInt(e.target.value, 10))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none"
                  >
                    <option value="0">0 (e.g. ₦1,500)</option>
                    <option value="2">2 (e.g. ₦1,500.00)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Thousands Separator
                  </label>
                  <select
                    disabled={!canManage}
                    value={formData.regional.thousandsSeparator}
                    onChange={(e) => handleNestedChange('regional', 'thousandsSeparator', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none"
                  >
                    <option value=",">Comma ( , ) e.g. 1,000,000</option>
                    <option value=".">Period ( . ) e.g. 1.000.000</option>
                    <option value=" ">Space ( ) e.g. 1 000 000</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Decimal Separator
                  </label>
                  <select
                    disabled={!canManage}
                    value={formData.regional.decimalSeparator}
                    onChange={(e) => handleNestedChange('regional', 'decimalSeparator', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none"
                  >
                    <option value=".">Period ( . ) e.g. 0.50</option>
                    <option value=",">Comma ( , ) e.g. 0,50</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Default Timezone
                  </label>
                  <select
                    disabled={!canManage}
                    value={formData.regional.timezone}
                    onChange={(e) => handleNestedChange('regional', 'timezone', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none"
                  >
                    <option value="Africa/Lagos">Africa/Lagos (WAT, UTC+1)</option>
                    <option value="Africa/Accra">Africa/Accra (GMT, UTC+0)</option>
                    <option value="Africa/Johannesburg">Africa/Johannesburg (SAST, UTC+2)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Locale Code
                  </label>
                  <input
                    type="text"
                    disabled={!canManage}
                    value={formData.regional.defaultLocale}
                    onChange={(e) => handleNestedChange('regional', 'defaultLocale', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none"
                    placeholder="en-NG"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: OPERATING HOURS */}
          {activeTab === 'hours' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Business Operating Hours</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Set yard opening and closing times for each day of the week.
                  </p>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={applyWeekdayPreset}
                    className="text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 px-3 py-1.5 rounded-lg border border-orange-200 dark:border-orange-900/40"
                  >
                    Set Standard Hours (08:00 – 18:00)
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {DAYS_OF_WEEK.map(({ key, label }) => {
                  const schedule = formData.operatingHours[key];
                  return (
                    <div key={key} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="w-32 flex items-center gap-3">
                        <button
                          type="button"
                          disabled={!canManage}
                          onClick={() => handleHoursChange(key, 'isOpen', !schedule.isOpen)}
                          className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                            schedule.isOpen ? 'bg-orange-600' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${
                              schedule.isOpen ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className={`text-sm font-bold ${schedule.isOpen ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                          {label}
                        </span>
                      </div>

                      {schedule.isOpen ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            disabled={!canManage}
                            value={schedule.openTime}
                            onChange={(e) => handleHoursChange(key, 'openTime', e.target.value)}
                            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                          />
                          <span className="text-slate-400 text-xs">to</span>
                          <input
                            type="time"
                            disabled={!canManage}
                            value={schedule.closeTime}
                            onChange={(e) => handleHoursChange(key, 'closeTime', e.target.value)}
                            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                          />
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 italic">Closed All Day</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 7: NUMBERING SETTINGS */}
          {activeTab === 'numbering' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Document & Identifier Numbering</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Customizable system code prefixes for quotations, orders, customers, and payment receipts.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { key: 'defaultCustomerPrefix', label: 'Customer ID Prefix', sample: '0012' },
                  { key: 'defaultRequestPrefix', label: 'Quote Request Prefix', sample: '2026-0042' },
                  { key: 'defaultQuotationPrefix', label: 'Quotation Prefix', sample: '2026-0189' },
                  { key: 'defaultOrderPrefix', label: 'Sales Order Prefix', sample: '2026-0771' },
                  { key: 'defaultTrackingPrefix', label: 'Delivery Tracking Prefix', sample: '99201' },
                  { key: 'defaultPaymentPrefix', label: 'Payment Receipt Prefix', sample: 'REC-0512' },
                  { key: 'defaultInvoicePrefix', label: 'Tax Invoice Prefix', sample: 'INV-1092' },
                ].map(({ key, label, sample }) => {
                  const prefix = (formData.numbering as any)[key] || '';
                  return (
                    <div key={key} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                        {label}
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          disabled={!canManage}
                          value={prefix}
                          onChange={(e) =>
                            handleNestedChange('numbering', key, e.target.value.toUpperCase().trim())
                          }
                          className="w-28 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold focus:outline-none"
                        />
                        <div className="text-xs text-slate-500">
                          Sample ID:{' '}
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {prefix}-{sample}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 8: PAYMENT METHODS */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Payment Methods & Bank Accounts</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Enable accepted payment channels and configure corporate bank settlement account details.
                </p>
              </div>

              <div className="space-y-4">
                {formData.paymentMethods.map((pm) => (
                  <div
                    key={pm.id}
                    className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{pm.name}</span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {pm.code}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{pm.description}</p>
                      </div>

                      <button
                        type="button"
                        disabled={!canManage}
                        onClick={() => handlePaymentToggle(pm.id)}
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                          pm.isEnabled ? 'bg-orange-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${
                            pm.isEnabled ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* If Bank Transfer is enabled, show bank details editor */}
                    {pm.code === 'bank_transfer' && pm.isEnabled && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Bank Name
                          </label>
                          <input
                            type="text"
                            disabled={!canManage}
                            value={pm.bankDetails?.bankName || ''}
                            onChange={(e) => handleBankDetailsChange('bankName', e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                            placeholder="First Bank of Nigeria"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Account Name
                          </label>
                          <input
                            type="text"
                            disabled={!canManage}
                            value={pm.bankDetails?.accountName || ''}
                            onChange={(e) => handleBankDetailsChange('accountName', e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                            placeholder="XFORCE CONSTRUCTION LTD"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Account Number
                          </label>
                          <input
                            type="text"
                            disabled={!canManage}
                            value={pm.bankDetails?.accountNumber || ''}
                            onChange={(e) => handleBankDetailsChange('accountNumber', e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:outline-none"
                            placeholder="2039481928"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 9: FEATURE TOGGLES */}
          {activeTab === 'features' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Business Feature Toggles</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Enable or disable enterprise workflows. Note: Feature toggles control operational UI visibility; backend security and Row-Level Security (RLS) policies always govern database access.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    key: 'productSales' as const,
                    name: 'Product Sales Catalog',
                    desc: 'Display and sell facing bricks, pavers, and blocks to walk-in and online clients.',
                  },
                  {
                    key: 'customerRequests' as const,
                    name: 'Customer Inquiries & Requests',
                    desc: 'Allow prospective clients to submit customized quote requests via public forms.',
                  },
                  {
                    key: 'quotations' as const,
                    name: 'Digital Quotations Engine',
                    desc: 'Sales managers create formal PDF quotations with discount controls and terms.',
                  },
                  {
                    key: 'installationsEnabled' as const,
                    name: 'Installation Contracts & Masonry Services',
                    desc: 'Enable turnkey brick laying, site leveling, and supervisor checklist workflows.',
                  },
                  {
                    key: 'posOfflineTransactions' as const,
                    name: 'POS & Counter Cashier Sales',
                    desc: 'Fast cashier counter checkout with offline sync and physical printed receipts.',
                  },
                  {
                    key: 'delivery' as const,
                    name: 'Haulage & Site Delivery Logistics',
                    desc: 'Manage flatbed truck dispatches, site delivery slips, and driver tracking.',
                  },
                  {
                    key: 'inventory' as const,
                    name: 'Yard Warehouse & Stock Management',
                    desc: 'Track physical pallet counts, batch receipts, breakages, and yard staging.',
                  },
                  {
                    key: 'serviceProviders' as const,
                    name: 'Third-Party Subcontractor Management',
                    desc: 'Assign vetted external site masons and logistics haulage partners.',
                  },
                  {
                    key: 'customerTracking' as const,
                    name: 'Public Order Status Tracking',
                    desc: 'Allow buyers to track manufacturing and site dispatch via tracking number.',
                  },
                  {
                    key: 'whatsappContact' as const,
                    name: 'WhatsApp Direct Chat Floating Button',
                    desc: 'Render instant WhatsApp consultation button on public website pages.',
                  },
                  {
                    key: 'onlinePayments' as const,
                    name: 'Online Payment Checkout',
                    desc: 'Process debit cards, USSD, and online bank payments directly.',
                  },
                  {
                    key: 'customerAccounts' as const,
                    name: 'Customer Portal & Login',
                    desc: 'Allow repeat contractors and estate developers to register and view invoice histories.',
                  },
                ].map(({ key, name, desc }) => {
                  const isEnabled = formData.features[key];
                  return (
                    <div
                      key={key}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-start justify-between gap-4"
                    >
                      <div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white block">{name}</span>
                        <p className="text-xs text-slate-500 mt-1">{desc}</p>
                      </div>

                      <button
                        type="button"
                        disabled={!canManage}
                        onClick={() => handleFeatureToggle(key)}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                          isEnabled ? 'bg-orange-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${
                            isEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'data_reset' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-orange-600" />
                  Testing & Data Management
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Manage test records and operational databases for clean system testing with new custom records.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                      Clean Testing Environment
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                      All initial seed mock records have been decoupled. Clicking <strong>Purge All Mock Records</strong> will clear any leftover cached test records across all admin tables (Orders, Quotations, Expenses, Products, Balances, Fulfilments, Jobs, Suppliers, Providers, Gallery Items, Messages, and Notifications), giving you a 100% clean slate to input and verify your real records.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPurgeRecordsModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Purge All Mock Records for Fresh Testing</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                    What Gets Cleared
                  </h4>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
                    <li>Customer Orders & Line Items</li>
                    <li>Business & Operating Expenses</li>
                    <li>Inventory Stock Balances & Movements</li>
                    <li>Warehouse Tasks & Fulfilment Logs</li>
                    <li>Installation Service Jobs & Site Photos</li>
                    <li>Mock Suppliers & Subcontractors</li>
                    <li>Gallery Showcase Projects & Designs</li>
                    <li>Customer Requests & Quotations</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                    What Stays Preserved
                  </h4>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
                    <li>Active Administrator Session & Credentials</li>
                    <li>Enterprise Identity & Branding Configuration</li>
                    <li>Product Category Definitions</li>
                    <li>Role-Based Access Control Permissions</li>
                    <li>Warehouse Location Hierarchies</li>
                    <li>Persistent Media Files on Server Disk</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Purge All Records */}
      {showPurgeRecordsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Purge All Mock Pre-Records?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              This will reset all transactional tables across the admin sections to zero records so you can test the system with new records. Your Administrator login and settings will not be affected.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowPurgeRecordsModal(false)}
                disabled={isPurgingRecords}
                className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPurgingRecords}
                onClick={async () => {
                  setIsPurgingRecords(true);
                  try {
                    const res = clearAllAdminMockRecords();
                    toast.success(
                      'Mock Records Purged',
                      `Cleared ${res.clearedCount} administrative data tables. The platform is ready for your new live testing records.`
                    );
                    setShowPurgeRecordsModal(false);
                    setTimeout(() => {
                      window.location.reload();
                    }, 500);
                  } catch (err: any) {
                    toast.error('Purge Failed', err.message || 'Could not purge mock records.');
                  } finally {
                    setIsPurgingRecords(false);
                  }
                }}
                className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isPurgingRecords ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Purging...</span>
                  </>
                ) : (
                  <span>Yes, Purge Mock Records</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Reset Defaults */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
              <RotateCcw className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Reset Settings to Defaults?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              This will overwrite all current company identity, numbering prefixes, currency symbols, and hours with the default initial system configuration. An immutable audit log entry will be recorded.
            </p>

            <div className="mb-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Reason for Reset (Required for Audit Log)
              </label>
              <input
                type="text"
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                placeholder="e.g. Annual fiscal configuration reset"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetConfirm}
                disabled={!resetReason.trim()}
                className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 rounded-xl shadow-sm transition-colors"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Sticky Save Bar when dirty */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 dark:bg-slate-800/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
            </span>
            <span className="text-xs font-semibold">
              Unsaved changes in {tabs.find((t) => t.id === activeTab)?.label || 'Settings'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs"
              onClick={handleDiscard}
            >
              Discard
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleSave}
              disabled={isSaving}
              leftIcon={<Save className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              {isSaving ? 'Saving...' : 'Save & Publish Live'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
