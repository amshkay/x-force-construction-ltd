/**
 * Customer Portal - Profile & Account Management
 * Module 08: Customer Management
 * XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
 *
 * Allows authenticated or portal-verified customers to manage their contact details,
 * delivery addresses, and communication preferences. Staff-only internal fields
 * and notes are strictly excluded.
 */

import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  ShieldCheck,
  Save,
  LogOut,
  Clock,
  Compass,
  CheckCircle2,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  Truck,
  Layers,
  Bell,
  Check,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { localStore } from '../../lib/storage/localStorage';
import { customerService } from '../../services/customer.service';
import { requestRepository } from '../../repositories/request.repository';
import { quotationRepository } from '../../repositories/quotation.repository';
import { quotationService } from '../../services/quotation.service';
import { notificationService } from '../../services/notification.service';
import { InAppNotification } from '../../types/communication';
import { CustomerRequest, REQUEST_STATUS_CONFIG } from '../../types/request';
import { Quotation, QUOTATION_STATUS_CONFIG } from '../../types/quotation';
import { QuotationDetailModal } from '../quotations/QuotationDetailModal';
import {
  Customer,
  CustomerType,
  PreferredContactMethod,
  CUSTOMER_TYPE_LABELS,
  CUSTOMER_STATUS_CONFIG,
} from '../../types/customer';

const CUSTOMER_SESSION_KEY = 'xforce_customer_session';

interface CustomerPortalViewProps {
  onNavigateHome?: () => void;
  onNavigateToAuth?: () => void;
}

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  onNavigateHome,
  onNavigateToAuth,
}) => {
  const toast = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Enugu');
  const [country, setCountry] = useState('Nigeria');
  const [gpsLatitude, setGpsLatitude] = useState<string>('');
  const [gpsLongitude, setGpsLongitude] = useState<string>('');
  const [preferredContact, setPreferredContact] = useState<PreferredContactMethod>('phone');
  const [customerType, setCustomerType] = useState<CustomerType>('individual');

  const [activeTab, setActiveTab] = useState<'profile' | 'requests' | 'quotations' | 'notifications'>('profile');
  const [customerRequests, setCustomerRequests] = useState<CustomerRequest[]>([]);
  const [customerQuotations, setCustomerQuotations] = useState<Quotation[]>([]);
  const [customerNotifications, setCustomerNotifications] = useState<InAppNotification[]>([]);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [isQuotationDetailOpen, setIsQuotationDetailOpen] = useState(false);

  // Load customer profile, requests, and quotations
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const session = localStore.get<any>(CUSTOMER_SESSION_KEY, null);
        if (!session || !session.isLoggedIn) {
          setIsLoading(false);
          return;
        }

        let found: Customer | null = null;
        if (session.customerId) {
          found = await customerService.getCustomerById(session.customerId);
        } else if (session.id) {
          found = await customerService.getCustomerByUserId(session.id);
        } else if (session.email) {
          const list = await customerService.listCustomers();
          found = list.find((c) => c.email?.toLowerCase() === session.email?.toLowerCase()) || null;
        }

        if (found) {
          setCustomer(found);
          setFullName(found.fullName || '');
          setPhone(found.phone || '');
          setAltPhone(found.altPhone || '');
          setEmail(found.email || '');
          setWhatsappNumber(found.whatsappNumber || '');
          setCompanyName(found.companyName || '');
          setAddress(found.address || '');
          setCity(found.city || '');
          setState(found.state || 'Enugu');
          setCountry(found.country || 'Nigeria');
          setGpsLatitude(found.gpsLatitude !== null && found.gpsLatitude !== undefined ? String(found.gpsLatitude) : '');
          setGpsLongitude(found.gpsLongitude !== null && found.gpsLongitude !== undefined ? String(found.gpsLongitude) : '');
          setPreferredContact(found.preferredContactMethod || 'phone');
          setCustomerType(found.customerType || 'individual');

          // Load related customer requests & quotations
          try {
            const [allReqs, allQuotes] = await Promise.all([
              requestRepository.getAllRequests(),
              quotationRepository.getAllQuotations(),
            ]);

            const custPhone = (found.phone || '').replace(/\D/g, '');
            const custEmail = (found.email || '').toLowerCase().trim();

            const myReqs = allReqs.filter(
              (r) =>
                (found?.id && r.customerId === found.id) ||
                (custPhone && r.customerPhone.replace(/\D/g, '') === custPhone) ||
                (custEmail && r.customerEmail?.toLowerCase().trim() === custEmail)
            );

            const myQuotes = allQuotes.filter(
              (q) =>
                (found?.id && q.customerId === found.id) ||
                (custPhone && q.customerPhone.replace(/\D/g, '') === custPhone) ||
                (custEmail && q.customerEmail?.toLowerCase().trim() === custEmail)
            );

            setCustomerRequests(myReqs);
            setCustomerQuotations(myQuotes);

            // Load customer notifications (Module 18)
            try {
              const myNotifs = await notificationService.getNotificationsForRecipient(
                found.id,
                'customer'
              );
              setCustomerNotifications(myNotifs);
            } catch (notifErr) {
              console.warn('[CustomerPortal] Error loading notifications:', notifErr);
            }
          } catch (fetchErr) {
            console.warn('[CustomerPortal] Error loading requests/quotes:', fetchErr);
          }
        } else if (session) {
          // Fallback session data
          setFullName(session.name || '');
          setEmail(session.email || '');
          setPhone(session.phone || '');
        }
      } catch (err: any) {
        console.warn('[CustomerPortal] Error loading customer profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id) {
      toast.error('No active customer record linked to this session.', 'Profile Error');
      return;
    }

    if (!fullName.trim() || !phone.trim()) {
      toast.warning('Full Name and Phone Number are required.', 'Missing Fields');
      return;
    }

    setIsSaving(true);
    try {
      const lat = gpsLatitude.trim() ? parseFloat(gpsLatitude.trim()) : null;
      const lng = gpsLongitude.trim() ? parseFloat(gpsLongitude.trim()) : null;

      const updated = await customerService.updateCustomer(
        customer.id,
        {
          fullName: fullName.trim(),
          phone: phone.trim(),
          altPhone: altPhone.trim() || null,
          email: email.trim() || null,
          whatsappNumber: whatsappNumber.trim() || null,
          companyName: companyName.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          country: country.trim() || 'Nigeria',
          gpsLatitude: lat,
          gpsLongitude: lng,
          preferredContactMethod: preferredContact,
        },
        undefined,
        'Profile updated by customer via Customer Portal'
      );

      setCustomer(updated);
      toast.success('Your profile information has been successfully updated.', 'Profile Saved');
    } catch (err: any) {
      toast.error(err.message || 'Could not update profile.', 'Update Failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.warning('Geolocation is not supported by your browser.', 'Location');
      return;
    }

    toast.info('Requesting current GPS coordinates...', 'GPS Detection');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLatitude(position.coords.latitude.toFixed(6));
        setGpsLongitude(position.coords.longitude.toFixed(6));
        toast.success('Coordinates captured from your device.', 'GPS Set');
      },
      (error) => {
        toast.error(`Unable to retrieve location: ${error.message}`, 'GPS Notice');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSignOut = () => {
    localStore.remove(CUSTOMER_SESSION_KEY);
    toast.info('You have been signed out of your customer account.', 'Signed Out');
    if (onNavigateHome) onNavigateHome();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
          <p className="text-sm text-slate-500">Loading customer portal...</p>
        </div>
      </div>
    );
  }

  // Not signed in state
  const session = localStore.get<any>(CUSTOMER_SESSION_KEY, null);
  if (!session || !session.isLoggedIn) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
          <User className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Customer Account</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Please sign in to view and manage your XFORCE customer profile and delivery addresses.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            onClick={onNavigateToAuth}
            className="w-full justify-center"
          >
            Customer Sign In / Register
          </Button>
          <Button
            variant="ghost"
            onClick={onNavigateHome}
            className="w-full justify-center text-slate-500"
          >
            Back to Public Website
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = customer ? CUSTOMER_STATUS_CONFIG[customer.status] : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 text-left space-y-8" id="customer-portal-view">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-600 text-white font-bold text-xl shadow-md shadow-orange-600/20">
            {fullName ? fullName.charAt(0).toUpperCase() : 'C'}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {fullName || 'Customer Profile'}
              </h1>
              {customer?.customerNumber && (
                <span className="rounded-md bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 px-2 py-0.5 text-xs font-mono font-semibold text-orange-700 dark:text-orange-300">
                  {customer.customerNumber}
                </span>
              )}
              {statusConfig && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusConfig.badgeClass}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotClass}`} />
                  {statusConfig.label}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <span>{CUSTOMER_TYPE_LABELS[customerType] || 'Client'}</span>
              <span>•</span>
              <span>Account: {email || session.email}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSignOut}
            leftIcon={<LogOut className="h-3.5 w-3.5" />}
            className="text-xs text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700"
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 sm:gap-6 text-sm font-medium overflow-x-auto whitespace-nowrap scrollbar-none pb-0.5">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Profile & Site Addresses</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>My Requests ({customerRequests.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('quotations')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'quotations'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>My Quotations ({customerQuotations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'notifications'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Bell className="h-4 w-4" />
          <span>Notifications ({customerNotifications.length})</span>
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Identity & Contact Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <User className="h-4 w-4 text-orange-600" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Customer Identity & Contact Information
                </h2>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Chief Emeka Nwachukwu"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Company / Organization Name
                </label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Prime Build Engineering Ltd"
                  leftIcon={<Building className="h-4 w-4 text-slate-400" />}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Primary Phone <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 803 000 0000"
                    leftIcon={<Phone className="h-4 w-4 text-slate-400" />}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Alternative Phone
                  </label>
                  <Input
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value)}
                    placeholder="+234 802 000 0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="customer@example.com"
                    leftIcon={<Mail className="h-4 w-4 text-slate-400" />}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp Number
                  </label>
                  <Input
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+234 803 000 0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Preferred Contact Method
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['phone', 'whatsapp', 'email', 'sms'] as PreferredContactMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPreferredContact(m)}
                      className={`rounded-lg border px-2 py-1.5 text-xs capitalize transition text-center ${
                        preferredContact === m
                          ? 'border-orange-600 bg-orange-50 font-semibold text-orange-700 dark:bg-orange-950/50 dark:text-orange-300'
                          : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Site & Delivery Address Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <MapPin className="h-4 w-4 text-orange-600" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Delivery Site & Physical Address
                </h2>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Primary Delivery / Project Site Address
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-orange-500 focus:outline-none"
                  placeholder="Plot 14, Independence Layout, Near Government House..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    City / Town
                  </label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Enugu"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    State
                  </label>
                  <Input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Enugu State"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Country
                  </label>
                  <Input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Nigeria"
                  />
                </div>
              </div>

              {/* Optional GPS Location */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5 text-orange-600" />
                    Site GPS Coordinates (Optional)
                  </span>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold underline"
                  >
                    Detect from Device
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Latitude</label>
                    <Input
                      type="number"
                      step="any"
                      value={gpsLatitude}
                      onChange={(e) => setGpsLatitude(e.target.value)}
                      placeholder="e.g. 6.4583"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Longitude</label>
                    <Input
                      type="number"
                      step="any"
                      value={gpsLongitude}
                      onChange={(e) => setGpsLongitude(e.target.value)}
                      placeholder="e.g. 7.5463"
                    />
                  </div>
                </div>
              </div>

              {/* Protected Fields Notice */}
              <div className="rounded-lg bg-slate-100 dark:bg-slate-800/40 p-3 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
                  Protected Account Attributes
                </div>
                <p className="text-[11px]">
                  Customer reference (<strong className="font-mono">{customer?.customerNumber || 'XFC-000000'}</strong>),
                  classification type, and administrative account standing are maintained by XFORCE staff.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
              leftIcon={<Save className="h-4 w-4" />}
            >
              Save Profile Changes
            </Button>
          </div>
        </form>
      )}

      {/* Requests Tab (Module 09) */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-600" />
              <span>My Project Inquiries & Requests</span>
            </h3>
          </div>

          {customerRequests.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-3 dark:border-slate-800 dark:bg-slate-900">
              <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No requests found for your account
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Inquiries and BOQ requests you submit via the website will be tracked here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {customerRequests.map((req) => {
                const conf = REQUEST_STATUS_CONFIG[req.status];
                return (
                  <div
                    key={req.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
                          Request #{req.requestNumber}
                        </span>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Submitted on {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={conf.badgeVariant}>{conf.label}</Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 font-medium block">Site Location:</span>
                        <p className="text-slate-800 dark:text-slate-200 mt-0.5">
                          {req.projectAddress || 'Site not specified'}, {req.projectCity || ''}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Materials / Scope:</span>
                        <p className="text-slate-800 dark:text-slate-200 mt-0.5">
                          {req.items.length > 0
                            ? req.items.map((i) => `${i.quantity} ${i.unit} ${i.itemName}`).join(', ')
                            : req.customerComments || 'Standard quote request'}
                        </p>
                      </div>
                    </div>

                    {req.quotationNumber && (
                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2.5 border border-emerald-200 dark:border-emerald-900/40 text-xs flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                        <span>
                          Official Quotation <strong>#{req.quotationNumber}</strong> prepared.
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveTab('quotations')}
                          className="h-7 text-xs border-emerald-300 text-emerald-800 dark:text-emerald-300"
                        >
                          View Quotation
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Quotations Tab (Module 09) */}
      {activeTab === 'quotations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-orange-600" />
              <span>My Quotations & Estimates</span>
            </h3>
          </div>

          {customerQuotations.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-3 dark:border-slate-800 dark:bg-slate-900">
              <FileSpreadsheet className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No quotations issued yet
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When XFORCE sales engineers prepare your custom quotation, you can view, print, and approve it here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {customerQuotations.map((q) => {
                const conf = QUOTATION_STATUS_CONFIG[q.status];
                return (
                  <div
                    key={q.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-bold text-orange-600 dark:text-orange-400">
                            {q.quotationNumber}
                          </span>
                          <Badge variant={conf.badgeVariant}>{conf.label}</Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Issued: {q.quotationDate} • Valid Until: <strong>{q.validUntil}</strong>
                        </p>
                      </div>

                      <div className="text-right sm:text-right">
                        <span className="text-[11px] text-slate-400 block">Total Quoted:</span>
                        <span className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                          ₦{q.totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 text-xs divide-y divide-slate-200 dark:divide-slate-700">
                      {q.items.map((it, idx) => (
                        <div key={it.id || idx} className="py-1.5 flex justify-between">
                          <span className="text-slate-700 dark:text-slate-300">
                            {it.description} ({it.quantity.toLocaleString()} {it.unit})
                          </span>
                          <span className="font-mono text-slate-900 dark:text-white font-medium">
                            ₦{it.lineTotal.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="text-xs text-slate-500">
                        Required Mobilization Deposit (70%):{' '}
                        <strong className="font-mono text-slate-900 dark:text-white">
                          ₦{q.depositRequired.toLocaleString()}
                        </strong>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedQuotation(q);
                            setIsQuotationDetailOpen(true);
                          }}
                        >
                          View Formal Quotation
                        </Button>

                        {(q.status === 'sent' || q.status === 'viewed') && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              setSelectedQuotation(q);
                              setIsQuotationDetailOpen(true);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Accept Quotation
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Notifications Tab (Module 18) */}
      {activeTab === 'notifications' && (
        <div className="space-y-4 text-left">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Order, Delivery & Service Updates
              </h3>
              <p className="text-xs text-slate-500">
                Direct updates on your brick quotations, production batches, and dispatch waybills.
              </p>
            </div>
            {customerNotifications.some((n) => !n.isRead) && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (customer?.id) {
                    await notificationService.markAllAsRead(customer.id, 'customer');
                    const updated = await notificationService.getNotificationsForRecipient(customer.id, 'customer');
                    setCustomerNotifications(updated);
                    toast.showToast('All notifications marked as read', 'success');
                  }
                }}
              >
                Mark all read
              </Button>
            )}
          </div>

          {customerNotifications.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <Bell className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">No notifications yet. You will receive updates as your orders and requests progress.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {customerNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 rounded-xl border transition ${
                    n.isRead
                      ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                      : 'border-orange-200 dark:border-orange-900/60 bg-orange-50/20 dark:bg-orange-950/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {n.title}
                        </span>
                        {!n.isRead && (
                          <Badge variant="warning" size="sm">
                            NEW
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-2 font-mono">
                        {new Date(n.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={async () => {
                          await notificationService.markAsRead(n.id);
                          if (customer?.id) {
                            const updated = await notificationService.getNotificationsForRecipient(customer.id, 'customer');
                            setCustomerNotifications(updated);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-emerald-600 transition"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quotation Detail Modal */}
      <QuotationDetailModal
        isOpen={isQuotationDetailOpen}
        onClose={() => setIsQuotationDetailOpen(false)}
        quotation={selectedQuotation}
        onStatusUpdated={(updated) => {
          setSelectedQuotation(updated);
          setCustomerQuotations((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item))
          );
        }}
        currentStaffName={fullName || 'Customer Representative'}
      />
    </div>
  );
};
