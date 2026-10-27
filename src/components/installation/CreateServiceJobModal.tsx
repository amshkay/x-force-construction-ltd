import React, { useState, useEffect } from 'react';
import {
  X,
  Wrench,
  Calendar,
  Clock,
  MapPin,
  Compass,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  FileText,
  Building,
  Briefcase,
} from 'lucide-react';
import { orderRepository } from '../../repositories/order.repository';
import { Order } from '../../types/order';
import {
  ServiceType,
  ServicePriority,
  CreateServiceJobDTO,
  ServiceJobRecord,
} from '../../types/installation';
import { ServiceProvider } from '../../types/serviceProvider';
import { serviceProviderService } from '../../services/serviceProvider.service';
import { installationService } from '../../services/installation.service';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../hooks/useAuth';

interface CreateServiceJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderId?: string | null;
  onServiceJobCreated: (created: ServiceJobRecord) => void;
}

export const CreateServiceJobModal: React.FC<CreateServiceJobModalProps> = ({
  isOpen,
  onClose,
  initialOrderId,
  onServiceJobCreated,
}) => {
  const toast = useToast();
  const { profile } = useAuth();

  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Form Fields
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');

  const [serviceType, setServiceType] = useState<ServiceType>('installation');
  const [priority, setPriority] = useState<ServicePriority>('normal');
  const [scheduledDate, setScheduledDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [scheduledTime, setScheduledTime] = useState<string>('08:30');
  const [estimatedDurationHours, setEstimatedDurationHours] = useState<number>(8);

  // Location
  const [siteAddress, setSiteAddress] = useState<string>('');
  const [siteCity, setSiteCity] = useState<string>('Enugu');
  const [siteState, setSiteState] = useState<string>('Enugu State');
  const [gpsLatitude, setGpsLatitude] = useState<number | null>(null);
  const [gpsLongitude, setGpsLongitude] = useState<number | null>(null);
  const [locationNotes, setLocationNotes] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Staff Assignment
  const [assignedStaffId, setAssignedStaffId] = useState<string>('dev-inst-uid-0004');
  const [assignedStaffName, setAssignedStaffName] = useState<string>('Sunday Nwosu (Installation Lead)');
  const [assignedStaffPhone, setAssignedStaffPhone] = useState<string>('+234 814 556 7788');
  const [assignedStaffRole, setAssignedStaffRole] = useState<string>('Installation Lead Mason');

  // External Service Provider (Module 16)
  const [activeProviders, setActiveProviders] = useState<ServiceProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');

  // Notes
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [customerVisibleNotes, setCustomerVisibleNotes] = useState<string>(
    'Installation team scheduled. Please ensure site access and water supply are available.'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load orders and active providers on modal open
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoadingOrders(true);
      try {
        const allOrders = await orderRepository.getAllOrders();
        // Prefer confirmed and paid/partially-paid orders
        const relevant = allOrders.filter(
          (o) => o.status !== 'cancelled'
        );
        setAvailableOrders(relevant);

        if (initialOrderId) {
          const match = relevant.find((o) => o.id === initialOrderId);
          if (match) {
            populateFromOrder(match);
          }
        }
      } catch (err) {
        console.error('Failed to load orders for service job creation:', err);
      } finally {
        setLoadingOrders(false);
      }

      try {
        const providers = await serviceProviderService.getActiveProviders();
        setActiveProviders(providers);
      } catch (err) {
        console.warn('Failed to load active service providers:', err);
      }
    };

    loadData();
  }, [isOpen, initialOrderId]);

  const populateFromOrder = (order: Order) => {
    setSelectedOrderId(order.id);
    setCustomerId(order.customerId || '');
    setCustomerName(order.customerName);
    setCustomerPhone(order.customerPhone);
    setCustomerEmail(order.customerEmail || '');
    setCompanyName(order.customerType === 'corporate' ? order.customerName : '');
    setSiteAddress(order.deliveryAddress || order.customerAddress || '');
    setSiteCity(order.deliveryCity || 'Enugu');
    setSiteState(order.deliveryState || 'Enugu State');
    if (order.gpsLatitude) setGpsLatitude(order.gpsLatitude);
    if (order.gpsLongitude) setGpsLongitude(order.gpsLongitude);
    setLocationNotes(order.deliveryNotes || '');
    if (order.requiresInstallation) {
      setServiceType('installation');
      setPriority('high');
    }
    setInternalNotes(`Generated for Order ${order.orderNumber}. Order items: ${order.items.map((i) => `${i.quantity} ${i.unit} ${i.productName}`).join(', ')}`);
  };

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId);
    if (!orderId) {
      // Manual entry mode
      return;
    }
    const match = availableOrders.find((o) => o.id === orderId);
    if (match) {
      populateFromOrder(match);
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
          `GPS coordinates captured: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
          'Location Captured'
        );
      },
      (err) => {
        setIsLocating(false);
        toast.warning(
          `Could not capture automatic GPS: ${err.message}. You can enter coordinates manually.`,
          'GPS Permission'
        );
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('Customer name and contact phone are required.', 'Missing Fields');
      return;
    }
    if (!siteAddress.trim()) {
      toast.error('Physical site address is required for on-site services.', 'Missing Address');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedOrder = availableOrders.find((o) => o.id === selectedOrderId);
      const chosenProvider = activeProviders.find((p) => p.id === selectedProviderId);

      const dto: CreateServiceJobDTO = {
        customerId: customerId || undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        companyName: companyName.trim() || undefined,
        orderId: selectedOrderId || undefined,
        orderNumber: selectedOrder?.orderNumber || undefined,
        quotationId: selectedOrder?.sourceQuotationId || undefined,
        quotationNumber: selectedOrder?.sourceQuotationNumber || undefined,
        serviceType,
        priority,
        siteAddress: siteAddress.trim(),
        siteCity: siteCity.trim() || undefined,
        siteState: siteState.trim() || undefined,
        gpsLatitude: gpsLatitude || undefined,
        gpsLongitude: gpsLongitude || undefined,
        locationNotes: locationNotes.trim() || undefined,
        scheduledDate: scheduledDate || undefined,
        scheduledTime: scheduledTime || undefined,
        estimatedDurationHours: estimatedDurationHours || undefined,
        assignedStaffId: assignedStaffId || undefined,
        assignedStaffName: assignedStaffName || undefined,
        assignedStaffPhone: assignedStaffPhone || undefined,
        assignedStaffRole: assignedStaffRole || undefined,
        serviceProviderId: chosenProvider?.id || undefined,
        serviceProviderName: chosenProvider?.name || undefined,
        serviceProviderPhone: chosenProvider?.phone || undefined,
        serviceProviderType: chosenProvider?.providerTypeLabel || undefined,
        internalNotes: internalNotes.trim() || undefined,
        customerVisibleNotes: customerVisibleNotes.trim() || undefined,
        performedBy: profile?.id || 'dev-admin-uid-0001',
        performedByName: profile?.full_name || 'Engr. David Adeleke',
      };

      const created = await installationService.createServiceJob(
        dto,
        profile?.id || 'dev-admin-uid-0001',
        profile?.full_name || 'Engr. David Adeleke'
      );

      toast.success(
        `Service Job ${created.jobReference} created and scheduled for ${created.customerName}.`,
        'Job Created'
      );
      onServiceJobCreated(created);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create service job.', 'Creation Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Create Installation & Service Job
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Schedule on-site technical services, assign laying crews, and set site parameters.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* 1. Linked Order / Request Section */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Building className="h-4 w-4 text-orange-600" />
                Linked Sales Order (Optional)
              </label>
              <span className="text-[11px] text-slate-400">Select order to auto-populate site details</span>
            </div>

            <select
              value={selectedOrderId}
              onChange={(e) => handleOrderSelect(e.target.value)}
              disabled={loadingOrders}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">-- Manual Entry / No Specific Order --</option>
              {availableOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber} • {o.customerName} ({o.totalAmount.toLocaleString()} NGN){' '}
                  {o.requiresInstallation ? '★ Requires Installation' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Customer & Site Contact Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Customer & Contact Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Customer / Client Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Chief Emeka Okonkwo"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. +234 803 555 1234"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="e.g. client@example.com"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Company / Organization
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Apex Estates Ltd"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* 3. Service Scope & Scheduling */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Service Parameters & Schedule
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Service Type *
                </label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as ServiceType)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="installation">Brick / Block Installation</option>
                  <option value="site_inspection">Site Survey & Leveling</option>
                  <option value="wall_preparation">Wall / Surface Preparation</option>
                  <option value="finishing">Finishing & Sealing</option>
                  <option value="repair_maintenance">Repair / Maintenance</option>
                  <option value="other">Custom Field Service</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ServicePriority)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent / VIP</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Estimated Duration
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="160"
                    value={estimatedDurationHours}
                    onChange={(e) => setEstimatedDurationHours(parseInt(e.target.value) || 8)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400">hours</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Scheduled Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Scheduled Time
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Lead Staff Assignment
                </label>
                <select
                  value={assignedStaffId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setAssignedStaffId(id);
                    if (id === 'dev-inst-uid-0004') {
                      setAssignedStaffName('Sunday Nwosu (Installation Lead)');
                      setAssignedStaffPhone('+234 814 556 7788');
                      setAssignedStaffRole('Installation Lead Mason');
                    } else if (id === 'dev-wh-uid-0003') {
                      setAssignedStaffName('Babajide Sanwo (Yard Supervisor)');
                      setAssignedStaffPhone('+234 809 445 6677');
                      setAssignedStaffRole('Site Logistics Supervisor');
                    } else {
                      setAssignedStaffName('Emeka Eze (Senior Mason)');
                      setAssignedStaffPhone('+234 803 999 1122');
                      setAssignedStaffRole('Senior Mason');
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="dev-inst-uid-0004">Sunday Nwosu (Installation Lead)</option>
                  <option value="dev-staff-emeka">Emeka Eze (Senior Mason)</option>
                  <option value="dev-wh-uid-0003">Babajide Sanwo (Logistics Supervisor)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  External Contractor / Partner (Optional - Mod 16)
                </label>
                <select
                  value={selectedProviderId}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">None (Internal Installation Staff Only)</option>
                  {activeProviders.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.providerTypeLabel})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  {selectedProviderId
                    ? `Selected: ${activeProviders.find((p) => p.id === selectedProviderId)?.phone || ''}`
                    : 'Optionally engage a third-party contractor or mason artisan crew'}
                </p>
              </div>
            </div>
          </div>

          {/* 4. Physical Site Location & GPS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-emerald-600" />
                Physical Site Location
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCaptureGps}
                isLoading={isLocating}
                leftIcon={<Compass className="h-3.5 w-3.5 text-emerald-600" />}
              >
                Auto-Capture GPS Coordinates
              </Button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Site Address *
              </label>
              <input
                type="text"
                required
                value={siteAddress}
                onChange={(e) => setSiteAddress(e.target.value)}
                placeholder="e.g. Plot 45 Independence Layout, Phase 2"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  City / Town
                </label>
                <input
                  type="text"
                  value={siteCity}
                  onChange={(e) => setSiteCity(e.target.value)}
                  placeholder="Enugu"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={siteState}
                  onChange={(e) => setSiteState(e.target.value)}
                  placeholder="Enugu State"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={gpsLatitude ?? ''}
                  onChange={(e) => setGpsLatitude(e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="6.4485"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={gpsLongitude ?? ''}
                  onChange={(e) => setGpsLongitude(e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="7.5162"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Site Landmark & Accessibility Notes
              </label>
              <input
                type="text"
                value={locationNotes}
                onChange={(e) => setLocationNotes(e.target.value)}
                placeholder="e.g. Opposite Cathedral gate, unpaved driveway, water tanker access available"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* 5. Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Internal Operational Notes (Staff Only)
              </label>
              <textarea
                rows={2}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Internal instructions for installation crew..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Customer-Visible Notice
              </label>
              <textarea
                rows={2}
                value={customerVisibleNotes}
                onChange={(e) => setCustomerVisibleNotes(e.target.value)}
                placeholder="Visible to client in their tracking status portal..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
            >
              Create & Dispatch Service Job
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
