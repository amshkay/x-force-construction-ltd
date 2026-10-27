/**
 * Customer Creation & Edit Modal
 * Module 08: Customer Management
 * XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Building,
  Phone,
  Mail,
  MapPin,
  Compass,
  AlertTriangle,
  Save,
  CheckCircle2,
  Shield,
  FileText,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { customerService } from '../../services/customer.service';
import {
  Customer,
  CreateCustomerDTO,
  CustomerType,
  CustomerStatus,
  CustomerAccountStatus,
  PreferredContactMethod,
  DuplicateWarning,
  CUSTOMER_TYPE_LABELS,
} from '../../types/customer';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
  customerToEdit?: Customer | null;
  currentStaffUserId?: string;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customerToEdit,
  currentStaffUserId,
}) => {
  const toast = useToast();
  const isEditing = Boolean(customerToEdit);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Enugu');
  const [country, setCountry] = useState('Nigeria');
  const [gpsLatitude, setGpsLatitude] = useState('');
  const [gpsLongitude, setGpsLongitude] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('individual');
  const [status, setStatus] = useState<CustomerStatus>('active');
  const [accountStatus, setAccountStatus] = useState<CustomerAccountStatus>('no_account');
  const [preferredContact, setPreferredContact] = useState<PreferredContactMethod>('phone');
  const [notes, setNotes] = useState('');
  const [linkedUserId, setLinkedUserId] = useState('');

  // Duplicate warnings
  const [duplicates, setDuplicates] = useState<DuplicateWarning[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [allowDuplicateBypass, setAllowDuplicateBypass] = useState(false);

  // Loading & validation errors
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (customerToEdit) {
      setFullName(customerToEdit.fullName || '');
      setFirstName(customerToEdit.firstName || '');
      setLastName(customerToEdit.lastName || '');
      setCompanyName(customerToEdit.companyName || '');
      setPhone(customerToEdit.phone || '');
      setAltPhone(customerToEdit.altPhone || '');
      setEmail(customerToEdit.email || '');
      setWhatsappNumber(customerToEdit.whatsappNumber || '');
      setAddress(customerToEdit.address || '');
      setCity(customerToEdit.city || '');
      setState(customerToEdit.state || 'Enugu');
      setCountry(customerToEdit.country || 'Nigeria');
      setGpsLatitude(customerToEdit.gpsLatitude !== null && customerToEdit.gpsLatitude !== undefined ? String(customerToEdit.gpsLatitude) : '');
      setGpsLongitude(customerToEdit.gpsLongitude !== null && customerToEdit.gpsLongitude !== undefined ? String(customerToEdit.gpsLongitude) : '');
      setCustomerType(customerToEdit.customerType || 'individual');
      setStatus(customerToEdit.status || 'active');
      setAccountStatus(customerToEdit.accountStatus || 'no_account');
      setPreferredContact(customerToEdit.preferredContactMethod || 'phone');
      setNotes(customerToEdit.notes || '');
      setLinkedUserId(customerToEdit.userId || '');
    } else {
      // Defaults for new customer
      setFullName('');
      setFirstName('');
      setLastName('');
      setCompanyName('');
      setPhone('');
      setAltPhone('');
      setEmail('');
      setWhatsappNumber('');
      setAddress('');
      setCity('Enugu');
      setState('Enugu');
      setCountry('Nigeria');
      setGpsLatitude('');
      setGpsLongitude('');
      setCustomerType('individual');
      setStatus('active');
      setAccountStatus('no_account');
      setPreferredContact('phone');
      setNotes('');
      setLinkedUserId('');
    }
    setDuplicates([]);
    setValidationErrors({});
    setAllowDuplicateBypass(false);
  }, [customerToEdit, isOpen]);

  // Live duplicate detection on phone / email blur
  const checkDuplicateWarning = async () => {
    if (!phone.trim() && !email.trim()) return;
    setIsCheckingDuplicates(true);
    try {
      const warns = await customerService.checkDuplicates(
        phone.trim(),
        email.trim() || null,
        undefined,
        customerToEdit?.id
      );
      setDuplicates(warns);
    } catch (err) {
      // Handled
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const handleNameChange = (val: string) => {
    setFullName(val);
    const parts = val.trim().split(/\s+/);
    if (parts.length > 1) {
      setFirstName(parts[0]);
      setLastName(parts.slice(1).join(' '));
    } else {
      setFirstName(val.trim());
      setLastName('');
    }
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      toast.warning('Geolocation is not supported by your browser.', 'GPS');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLatitude(pos.coords.latitude.toFixed(6));
        setGpsLongitude(pos.coords.longitude.toFixed(6));
        toast.success('Device coordinates captured.', 'Location Set');
      },
      (err) => {
        toast.error(`Could not detect coordinates: ${err.message}`, 'GPS Failed');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for duplicate warning stop
    if (duplicates.length > 0 && !allowDuplicateBypass) {
      toast.warning(
        'Possible duplicate customer detected. Please review the warning banner or confirm to proceed.',
        'Duplicate Warning'
      );
      return;
    }

    setIsSubmitting(true);
    setValidationErrors({});

    try {
      const lat = gpsLatitude.trim() ? parseFloat(gpsLatitude.trim()) : null;
      const lng = gpsLongitude.trim() ? parseFloat(gpsLongitude.trim()) : null;

      const payload: CreateCustomerDTO = {
        fullName: fullName.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        companyName: companyName.trim() || null,
        phone: phone.trim(),
        altPhone: altPhone.trim() || null,
        email: email.trim() || null,
        whatsappNumber: whatsappNumber.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        country: country.trim() || 'Nigeria',
        gpsLatitude: lat,
        gpsLongitude: lng,
        customerType,
        status,
        accountStatus,
        preferredContactMethod: preferredContact,
        notes: notes.trim() || null,
        userId: linkedUserId.trim() || null,
      };

      const val = customerService.validateCustomerData(payload);
      if (!val.isValid) {
        setValidationErrors(val.errors);
        const firstErr = Object.values(val.errors)[0];
        toast.error(firstErr, 'Validation Notice');
        setIsSubmitting(false);
        return;
      }

      let saved: Customer;
      if (isEditing && customerToEdit) {
        saved = await customerService.updateCustomer(
          customerToEdit.id,
          payload,
          currentStaffUserId,
          'Customer details updated by authorized staff'
        );
        toast.success(`Customer ${saved.customerNumber} updated successfully.`, 'Customer Updated');
      } else {
        saved = await customerService.createCustomer(payload, currentStaffUserId);
        toast.success(
          `Customer ${saved.customerNumber} (${saved.fullName}) created successfully.`,
          'Customer Created'
        );
      }

      onSuccess(saved);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save customer record.', 'Save Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto text-left space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? `Edit Customer — ${customerToEdit?.customerNumber}` : 'Add New Customer Record'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEditing
                  ? 'Update contact details, site address, and internal classifications.'
                  : 'Register a contractor, homeowner, or architectural client into XFORCE directory.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Duplicate Warning Banner */}
        {duplicates.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>Potential Duplicate Detected ({duplicates.length} match)</span>
            </div>
            <ul className="text-xs text-amber-700 dark:text-amber-300/90 list-disc list-inside space-y-1">
              {duplicates.map((d, i) => (
                <li key={i}>{d.message}</li>
              ))}
            </ul>
            <div className="pt-1 flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-medium text-amber-900 dark:text-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowDuplicateBypass}
                  onChange={(e) => setAllowDuplicateBypass(e.target.checked)}
                  className="rounded border-amber-400 text-orange-600 focus:ring-orange-500"
                />
                <span>Confirm this is a legitimate distinct customer record (allow save)</span>
              </label>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Customer Identity & Classification */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              1. Customer Identity & Classification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name / Contact Person <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={fullName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Arc. Oladipo Johnson"
                  leftIcon={<User className="h-4 w-4 text-slate-400" />}
                  error={validationErrors.fullName}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Company / Organization (Optional)
                </label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. ShelterCraft Projects Ltd"
                  leftIcon={<Building className="h-4 w-4 text-slate-400" />}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Customer Classification <span className="text-rose-500">*</span>
                </label>
                <select
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value as CustomerType)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {Object.entries(CUSTOMER_TYPE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Customer Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CustomerStatus)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="active">Active Customer</option>
                  <option value="lead">Prospect / Lead</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                  <option value="blacklisted">Blacklisted</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Portal Login Status
                </label>
                <select
                  value={accountStatus}
                  onChange={(e) => setAccountStatus(e.target.value as CustomerAccountStatus)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="no_account">Record Only (No Login)</option>
                  <option value="active">Active Portal Account</option>
                  <option value="pending">Invite Pending</option>
                  <option value="suspended">Portal Suspended</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Contact Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              2. Contact Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Primary Phone <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={checkDuplicateWarning}
                  placeholder="+234 803 123 4567"
                  leftIcon={<Phone className="h-4 w-4 text-slate-400" />}
                  error={validationErrors.phone}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp Number (Optional)
                </label>
                <Input
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+234 803 123 4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address (Optional)
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={checkDuplicateWarning}
                  placeholder="customer@example.com"
                  leftIcon={<Mail className="h-4 w-4 text-slate-400" />}
                  error={validationErrors.email}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Alternative Phone (Optional)
                </label>
                <Input
                  value={altPhone}
                  onChange={(e) => setAltPhone(e.target.value)}
                  placeholder="+234 802 000 0000"
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
                    className={`rounded-lg border px-2 py-1.5 text-xs capitalize transition ${
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

          {/* Section 3: Physical Address & Site Location */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              3. Delivery & Site Address
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Physical / Project Site Address
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="Plot 10, New Haven Avenue, Near Federal Secretariate..."
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

            {/* Optional GPS */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5 text-orange-600" />
                  Site GPS Coordinates (Optional)
                </span>
                <button
                  type="button"
                  onClick={handleDetectGPS}
                  className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold underline"
                >
                  Capture Device GPS
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  step="any"
                  value={gpsLatitude}
                  onChange={(e) => setGpsLatitude(e.target.value)}
                  placeholder="Latitude (-90 to 90)"
                  error={validationErrors.gpsLatitude}
                />
                <Input
                  type="number"
                  step="any"
                  value={gpsLongitude}
                  onChange={(e) => setGpsLongitude(e.target.value)}
                  placeholder="Longitude (-180 to 180)"
                  error={validationErrors.gpsLongitude}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Staff-Only Internal Notes */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              <span>4. Staff Internal Notes (Confidential)</span>
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Internal Remarks & Customer History Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Internal notes visible only to authorized XFORCE sales and management personnel. Never shown to customer."
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Staff notes are excluded from customer-facing portal views and public endpoints.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              leftIcon={<Save className="h-4 w-4" />}
            >
              {isEditing ? 'Save Changes' : 'Create Customer Record'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
