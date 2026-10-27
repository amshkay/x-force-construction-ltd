import React, { useState } from 'react';
import {
  X,
  Briefcase,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Compass,
  CheckSquare,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { serviceProviderService } from '../../services/serviceProvider.service';
import {
  CreateServiceProviderDTO,
  ProviderType,
  ProviderCapability,
  ProviderStatus,
  ProviderAvailability,
  ServiceProvider,
} from '../../types/serviceProvider';

interface CreateServiceProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProviderCreated: (provider: ServiceProvider) => void;
}

export const CreateServiceProviderModal: React.FC<CreateServiceProviderModalProps> = ({
  isOpen,
  onClose,
  onProviderCreated,
}) => {
  const { profile } = useAuth();
  const toast = useToast();

  const providerTypes = serviceProviderService.getProviderTypes();
  const providerCapabilities = serviceProviderService.getCapabilities();

  // Form State
  const [name, setName] = useState('');
  const [providerType, setProviderType] = useState<ProviderType>('contractor');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Enugu');
  const [state, setState] = useState('Enugu State');
  const [serviceAreasInput, setServiceAreasInput] = useState('Enugu, Awka, Nsukka');
  const [gpsLatitude, setGpsLatitude] = useState<number | ''>('');
  const [gpsLongitude, setGpsLongitude] = useState<number | ''>('');
  const [serviceAreaNotes, setServiceAreaNotes] = useState('');
  const [capabilities, setCapabilities] = useState<ProviderCapability[]>([
    'brick_installation',
    'wall_preparation',
  ]);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProviderStatus>('active');
  const [availability, setAvailability] = useState<ProviderAvailability>('available');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleToggleCapability = (cap: ProviderCapability) => {
    if (capabilities.includes(cap)) {
      if (capabilities.length === 1) {
        toast.warning('Provider must have at least one service capability.', 'Capability Required');
        return;
      }
      setCapabilities(capabilities.filter((c) => c !== cap));
    } else {
      setCapabilities([...capabilities, cap]);
    }
  };

  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      toast.warning('Geolocation is not supported by your browser.', 'GPS Unavailable');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLatitude(parseFloat(pos.coords.latitude.toFixed(6)));
        setGpsLongitude(parseFloat(pos.coords.longitude.toFixed(6)));
        setIsLocating(false);
        toast.success(
          `GPS coordinates recorded: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
          'Location Captured'
        );
      },
      (err) => {
        setIsLocating(false);
        toast.warning(`Could not capture GPS: ${err.message}. You can enter coordinates manually.`, 'GPS Info');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Provider / Business Name is required.', 'Missing Field');
      return;
    }
    if (!phone.trim()) {
      toast.error('Primary contact phone is required.', 'Missing Field');
      return;
    }

    const areas = serviceAreasInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    try {
      const dto: CreateServiceProviderDTO = {
        name: name.trim(),
        providerType,
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim(),
        whatsappNumber: whatsappNumber.trim() || phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        serviceAreas: areas.length > 0 ? areas : [city || state || 'Local'],
        gpsLatitude: typeof gpsLatitude === 'number' ? gpsLatitude : undefined,
        gpsLongitude: typeof gpsLongitude === 'number' ? gpsLongitude : undefined,
        serviceAreaNotes: serviceAreaNotes.trim() || undefined,
        capabilities,
        description: description.trim() || undefined,
        status,
        availability,
        registrationNumber: registrationNumber.trim() || undefined,
        taxId: taxId.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
      };

      const created = await serviceProviderService.createProvider(
        dto,
        profile?.id || 'dev-admin-uid-0001',
        profile?.full_name || 'Engr. David Adeleke'
      );

      toast.success(
        `Registered service provider ${created.name} (${created.providerNumber}).`,
        'Provider Registered'
      );
      onProviderCreated(created);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create service provider.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Register External Service Provider
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Module 16 — External contractors, paving artisans, and masonry partners
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Business Identity */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
              <Building className="h-4 w-4" />
              1. Business & Entity Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Provider / Business Name *"
                  placeholder="e.g. Onyeka Stone & Interlock Contractors Ltd"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Provider Classification Type *
                </label>
                <select
                  value={providerType}
                  onChange={(e) => setProviderType(e.target.value as ProviderType)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {providerTypes.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  {providerTypes.find((t) => t.type === providerType)?.description}
                </p>
              </div>

              <div>
                <Input
                  label="Contact Person (Principal / Mason Lead)"
                  placeholder="e.g. Engr. Onyeka Okonkwo"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  leftIcon={<User className="h-4 w-4 text-slate-400" />}
                />
              </div>

              <div>
                <Input
                  label="Registration / CAC Number"
                  placeholder="e.g. RC-1849204 or BN-3392109"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  leftIcon={<ShieldCheck className="h-4 w-4 text-slate-400" />}
                />
              </div>

              <div>
                <Input
                  label="Tax Identification Number (TIN)"
                  placeholder="e.g. TIN-982341-0001"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact Information */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
              <Phone className="h-4 w-4" />
              2. Contact & Communications
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Input
                  label="Primary Phone Number *"
                  placeholder="e.g. +234 803 234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  leftIcon={<Phone className="h-4 w-4 text-slate-400" />}
                />
              </div>

              <div>
                <Input
                  label="WhatsApp Number"
                  placeholder="e.g. +234 803 234 5678"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  helperText="Used for mobile work orders and progress"
                />
              </div>

              <div>
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="e.g. contact@contractor.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="h-4 w-4 text-slate-400" />}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Service Capabilities */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
              <CheckSquare className="h-4 w-4" />
              3. Service Capabilities (Multi-select)
            </h4>
            <p className="text-xs text-slate-500">
              Select all specialized services this external partner is qualified to perform for XFORCE.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {providerCapabilities.map((cap) => {
                const isSelected = capabilities.includes(cap.code);
                return (
                  <button
                    key={cap.code}
                    type="button"
                    onClick={() => handleToggleCapability(cap.code)}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/30 text-slate-900 dark:text-white ring-1 ring-orange-500'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-orange-600 border-orange-600 text-white'
                          : 'border-slate-400 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {isSelected && <span className="text-xs font-bold leading-none">✓</span>}
                    </div>
                    <div>
                      <div className="text-xs font-bold">{cap.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {cap.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Operating Locations & Service Area */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              4. Service Territory & Operating Areas
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Office / Workshop Physical Address"
                  placeholder="e.g. Plot 14 Independence Layout, Near Govt House"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  leftIcon={<MapPin className="h-4 w-4 text-slate-400" />}
                />
              </div>

              <div>
                <Input
                  label="Base City / Area"
                  placeholder="e.g. Enugu"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div>
                <Input
                  label="State / Region"
                  placeholder="e.g. Enugu State"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <Input
                  label="Covered Service Areas (Comma separated)"
                  placeholder="e.g. Enugu Urban, Independence Layout, GRA, Awka, Onitsha, Nsukka"
                  value={serviceAreasInput}
                  onChange={(e) => setServiceAreasInput(e.target.value)}
                  helperText="Defines the geographical zones where this contractor accepts job dispatches"
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    GPS Coordinates (Optional Yard / Office Base)
                  </label>
                  <button
                    type="button"
                    onClick={handleCaptureGps}
                    disabled={isLocating}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400"
                  >
                    <Compass className="h-3.5 w-3.5" />
                    {isLocating ? 'Capturing Location...' : 'Capture Current Location'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Latitude (e.g. 6.4521)"
                    type="number"
                    step="0.000001"
                    value={gpsLatitude}
                    onChange={(e) =>
                      setGpsLatitude(e.target.value ? parseFloat(e.target.value) : '')
                    }
                  />
                  <Input
                    placeholder="Longitude (e.g. 7.5103)"
                    type="number"
                    step="0.000001"
                    value={gpsLongitude}
                    onChange={(e) =>
                      setGpsLongitude(e.target.value ? parseFloat(e.target.value) : '')
                    }
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Territory & Mobilization Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Requires 24 hours mobilization for Anambra sites. Has 2 heavy-duty delivery pickups."
                  value={serviceAreaNotes}
                  onChange={(e) => setServiceAreaNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Status, Availability & Internal Notes */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              5. Status, Availability & Notes
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProviderStatus)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="active">Active (Available for Job Assignment)</option>
                  <option value="inactive">Inactive (Archived / Historical)</option>
                  <option value="suspended">Suspended (Under Review)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Operational Availability
                </label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value as ProviderAvailability)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="available">Available Now</option>
                  <option value="temporarily_unavailable">Temporarily Committed / Unavailable</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Public Description / Experience Summary
                </label>
                <textarea
                  rows={2}
                  placeholder="Summary of experience with compressed earth bricks, crew size, equipment..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Internal Management Notes (Private to XFORCE Administrators)
                </label>
                <textarea
                  rows={2}
                  placeholder="Internal notes, pricing agreements, supervisor feedback, reliability observations..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Save & Register Provider
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
