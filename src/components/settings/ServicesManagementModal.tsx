/**
 * Services Management Modal & Section
 *
 * Dedicated admin component to change, upload, edit, or delete
 * the Specialized Installation Services shown on the homepage and services portal.
 */

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Ruler,
  ShieldCheck,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  RefreshCw,
  HardHat,
  Truck,
  Building2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { PublicServiceItem } from '../../types/public';
import { publicDataService, DEFAULT_PUBLIC_SERVICES } from '../../services/publicData.service';
import { ImageInputWithUpload } from '../ui/ImageInputWithUpload';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

interface ServicesManagementProps {
  isOpen?: boolean;
  onClose?: () => void;
  inline?: boolean;
}

const AVAILABLE_ICONS = [
  { name: 'Wrench', label: 'Wrench (Masonry / Laying)', Icon: Wrench },
  { name: 'Ruler', label: 'Ruler (Paving / Alignment)', Icon: Ruler },
  { name: 'ShieldCheck', label: 'Shield (Inspection / Survey)', Icon: ShieldCheck },
  { name: 'Sparkles', label: 'Sparkles (Sealing / Finishing)', Icon: Sparkles },
  { name: 'HardHat', label: 'Hard Hat (Safety / Crew)', Icon: HardHat },
  { name: 'Truck', label: 'Truck (Logistics / Haulage)', Icon: Truck },
  { name: 'Building2', label: 'Building (Civil Works)', Icon: Building2 },
  { name: 'Layers', label: 'Layers (Sub-base / Multi-layer)', Icon: Layers },
];

export const ServicesManagementModal: React.FC<ServicesManagementProps> = ({
  isOpen = true,
  onClose,
  inline = false,
}) => {
  const toast = useToast();
  const [services, setServices] = useState<PublicServiceItem[]>([]);
  const [editingService, setEditingService] = useState<PublicServiceItem | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<PublicServiceItem>>({
    title: '',
    shortDescription: '',
    fullDescription: '',
    keyFeatures: [''],
    deliverables: [''],
    iconName: 'Wrench',
    imageUrl: '',
    isAvailable: true,
  });

  const loadServices = () => {
    const list = publicDataService.getServices();
    setServices(list);
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleStartEdit = (srv: PublicServiceItem) => {
    setIsCreatingNew(false);
    setEditingService(srv);
    setFormData({
      id: srv.id,
      title: srv.title,
      shortDescription: srv.shortDescription,
      fullDescription: srv.fullDescription,
      keyFeatures: srv.keyFeatures?.length ? [...srv.keyFeatures] : [''],
      deliverables: srv.deliverables?.length ? [...srv.deliverables] : [''],
      iconName: srv.iconName || 'Wrench',
      imageUrl: srv.imageUrl || '',
      isAvailable: srv.isAvailable !== false,
      sortOrder: srv.sortOrder,
    });
  };

  const handleStartCreate = () => {
    setEditingService(null);
    setIsCreatingNew(true);
    setFormData({
      title: '',
      shortDescription: '',
      fullDescription: '',
      keyFeatures: [
        'Laser-guided precision leveling',
        'Certified XFORCE master craftsmen',
        'Full structural stability warranty',
      ],
      deliverables: [
        'On-site technical supervision',
        'Daily digital progress logging',
        'Customer handover sign-off report',
      ],
      iconName: 'Wrench',
      imageUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80',
      isAvailable: true,
    });
  };

  const handleCloseForm = () => {
    setEditingService(null);
    setIsCreatingNew(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      toast.error('Validation Error', 'Service title is required.');
      return;
    }

    try {
      publicDataService.saveService({
        ...formData,
        title: formData.title.trim(),
        keyFeatures: formData.keyFeatures?.filter((f) => f.trim()) || [],
        deliverables: formData.deliverables?.filter((d) => d.trim()) || [],
      });

      toast.success(
        isCreatingNew ? 'Service Added' : 'Service Updated',
        `"${formData.title}" is now active on the public website and homepage.`
      );
      loadServices();
      handleCloseForm();
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Could not save service.');
    }
  };

  const handleDelete = (id: string, title: string) => {
    try {
      publicDataService.deleteService(id);
      toast.success('Service Deleted', `Removed "${title}" from public services.`);
      setConfirmDeleteId(null);
      loadServices();
      if (editingService?.id === id) {
        handleCloseForm();
      }
    } catch (err: any) {
      toast.error('Delete Failed', err.message || 'Could not delete service.');
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all installation services to factory defaults? Any custom services will be replaced.')) {
      publicDataService.resetServicesToDefaults();
      toast.success('Defaults Restored', 'Reset all installation services to initial company offerings.');
      loadServices();
      handleCloseForm();
    }
  };

  const getIconComponent = (name: string) => {
    const found = AVAILABLE_ICONS.find((i) => i.name === name);
    const IconCmp = found ? found.Icon : Wrench;
    return <IconCmp className="w-5 h-5" />;
  };

  const content = (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Specialized Installation Services
            </h3>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
              {services.length} Active Services
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage the service offerings shown on the homepage and customer services catalog. Upload custom local site photos or enter web URLs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleResetDefaults}
            leftIcon={<RefreshCw className="w-3.5 h-3.5 text-slate-500" />}
            title="Restore default XFORCE services"
          >
            Reset Defaults
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={handleStartCreate}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add New Service
          </Button>
        </div>
      </div>

      {/* Editor Modal / Drawer */}
      {(isCreatingNew || editingService) && (
        <div className="border border-orange-200 dark:border-orange-900/50 bg-orange-50/30 dark:bg-orange-950/20 rounded-2xl p-5 sm:p-6 transition-all shadow-md">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-orange-200/60 dark:border-orange-900/40">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-orange-600 text-white">
                <Wrench className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {isCreatingNew ? 'Create New Installation Service' : `Edit Service: ${editingService?.title}`}
              </h4>
            </div>
            <button
              onClick={handleCloseForm}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Service Cover Image (Upload or URL) */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <ImageInputWithUpload
                label="Service Card Header Image (Upload from Local or Online URL)"
                helperText="Upload photos of ongoing masonry, paver compacting, or survey work. Supports PNG, JPG, WebP."
                value={formData.imageUrl || ''}
                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                onRemove={() => setFormData({ ...formData, imageUrl: '' })}
                bucket="product-media"
                folder="services"
                placeholder="https://... or upload image from device"
                previewHeight="h-36"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Service Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Interlocking Brick Wall Construction"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Service Badge Icon
                </label>
                <select
                  value={formData.iconName || 'Wrench'}
                  onChange={(e) => setFormData({ ...formData, iconName: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  {AVAILABLE_ICONS.map((icon) => (
                    <option key={icon.name} value={icon.name}>
                      {icon.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Short Description (Homepage Card Teaser) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                placeholder="Brief summary displayed on homepage card..."
                value={formData.shortDescription || ''}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Full Description (Modal Detail & Specs)
              </label>
              <textarea
                rows={3}
                placeholder="Comprehensive technical explanation of service delivery..."
                value={formData.fullDescription || ''}
                onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            {/* Key Features & Deliverables */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Key Features / Benefits
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        keyFeatures: [...(formData.keyFeatures || []), ''],
                      })
                    }
                    className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400"
                  >
                    + Add Bullet
                  </button>
                </div>
                <div className="space-y-1.5">
                  {(formData.keyFeatures || ['']).map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder={`Feature #${idx + 1}`}
                        value={feat}
                        onChange={(e) => {
                          const updated = [...(formData.keyFeatures || [])];
                          updated[idx] = e.target.value;
                          setFormData({ ...formData, keyFeatures: updated });
                        }}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                      />
                      {(formData.keyFeatures || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (formData.keyFeatures || []).filter((_, i) => i !== idx);
                            setFormData({ ...formData, keyFeatures: updated });
                          }}
                          className="p-1 text-slate-400 hover:text-rose-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Deliverables / Guarantees
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        deliverables: [...(formData.deliverables || []), ''],
                      })
                    }
                    className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400"
                  >
                    + Add Bullet
                  </button>
                </div>
                <div className="space-y-1.5">
                  {(formData.deliverables || ['']).map((deliv, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder={`Deliverable #${idx + 1}`}
                        value={deliv}
                        onChange={(e) => {
                          const updated = [...(formData.deliverables || [])];
                          updated[idx] = e.target.value;
                          setFormData({ ...formData, deliverables: updated });
                        }}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                      />
                      {(formData.deliverables || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (formData.deliverables || []).filter((_, i) => i !== idx);
                            setFormData({ ...formData, deliverables: updated });
                          }}
                          className="p-1 text-slate-400 hover:text-rose-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Availability Checkbox */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="service-is-available"
                checked={formData.isAvailable !== false}
                onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 dark:border-slate-700"
              />
              <label htmlFor="service-is-available" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Visible & Active for Client Quotation Selection
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={handleCloseForm}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                {isCreatingNew ? 'Create Service Offering' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Services Grid Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {services.map((srv) => {
          const isDeleting = confirmDeleteId === srv.id;

          return (
            <div
              key={srv.id}
              className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all group"
            >
              <div>
                {/* Photo Header */}
                <div className="relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  {srv.imageUrl ? (
                    <img
                      src={srv.imageUrl}
                      alt={srv.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <Wrench className="w-10 h-10 stroke-1 mb-1" />
                      <span className="text-[11px]">No Photo Assigned</span>
                    </div>
                  )}

                  {/* Icon Badge Overlay */}
                  <div className="absolute top-3 left-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 dark:bg-slate-900/95 shadow-md text-orange-600 dark:text-orange-400 backdrop-blur-sm">
                    {getIconComponent(srv.iconName)}
                  </div>

                  {/* Availability Badge */}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        srv.isAvailable
                          ? 'bg-emerald-500/90 text-white backdrop-blur'
                          : 'bg-slate-700/90 text-slate-200 backdrop-blur'
                      }`}
                    >
                      {srv.isAvailable ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                    {srv.title}
                  </h4>
                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {srv.shortDescription}
                  </p>

                  {/* Bullet features count */}
                  {srv.keyFeatures && srv.keyFeatures.length > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{srv.keyFeatures.length} Key Technical Features</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                {isDeleting ? (
                  <div className="flex items-center gap-2 w-full justify-between">
                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                      Confirm Delete?
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(srv.id, srv.title)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStartEdit(srv)}
                      leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                    >
                      Edit & Change Photo
                    </Button>
                    <button
                      onClick={() => setConfirmDeleteId(srv.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="Delete Service"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
        {content}
      </div>
    </div>
  );
};
