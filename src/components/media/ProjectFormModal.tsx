import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Image as ImageIcon,
  Building2,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  Link,
  CheckCircle2,
  Upload,
  Loader2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ImageInputWithUpload } from '../ui/ImageInputWithUpload';
import { mediaService } from '../../services/media.service';
import {
  ProjectGalleryItem,
  ProjectFormData,
  ProjectPhaseMedia,
} from '../../types/mediaGallery';

export interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: ProjectGalleryItem | null;
  onSave: (data: ProjectFormData, existingId?: string) => Promise<boolean>;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  isOpen,
  onClose,
  project,
  onSave,
}) => {
  const isEditing = Boolean(project);

  const [title, setTitle] = useState<string>('');
  const [slug, setSlug] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [category, setCategory] = useState<string>('Commercial Paving');
  const [clientType, setClientType] = useState<
    'Residential' | 'Commercial' | 'Industrial' | 'Institutional'
  >('Commercial');
  const [completionDate, setCompletionDate] = useState<string>('Recent');
  const [status, setStatus] = useState<'completed' | 'in_progress'>('completed');
  const [description, setDescription] = useState<string>('');
  const [scopeSummary, setScopeSummary] = useState<string>('');
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [materialsInput, setMaterialsInput] = useState<string>('');
  const [materialsUsed, setMaterialsUsed] = useState<string[]>([]);
  const [galleryMedia, setGalleryMedia] = useState<ProjectPhaseMedia[]>([]);
  const [isPublished, setIsPublished] = useState<boolean>(true);
  const [isFeatured, setIsFeatured] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New gallery photo inline inputs
  const [newPhotoUrl, setNewPhotoUrl] = useState<string>('');
  const [newPhotoPhase, setNewPhotoPhase] = useState<'before' | 'during' | 'after'>('after');
  const [newPhotoCaption, setNewPhotoCaption] = useState<string>('');

  // Media File Uploading state
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingTimeline, setIsUploadingTimeline] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const timelineFileInputRef = useRef<HTMLInputElement>(null);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingCover(true);
      setErrorMsg(null);
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const res = await mediaService.uploadMedia(file, `projects/covers/${Date.now()}_${cleanName}`, {
        bucket: 'project-media',
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
      });
      setCoverImageUrl(res.url);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload cover photo.');
    } finally {
      setIsUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  const handleTimelineUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingTimeline(true);
      setErrorMsg(null);
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const res = await mediaService.uploadMedia(file, `projects/gallery/${Date.now()}_${cleanName}`, {
        bucket: 'project-media',
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
      });
      setNewPhotoUrl(res.url);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload timeline photo.');
    } finally {
      setIsUploadingTimeline(false);
      if (timelineFileInputRef.current) timelineFileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      setSlug(project.slug);
      setLocation(project.location);
      setCategory(project.category);
      setClientType(project.clientType || 'Commercial');
      setCompletionDate(project.completionDate || 'Recent');
      setStatus(project.status);
      setDescription(project.description);
      setScopeSummary(project.scopeSummary || '');
      setCoverImageUrl(project.coverImageUrl || '');
      setMaterialsUsed(project.materialsUsed || []);
      setMaterialsInput((project.materialsUsed || []).join(', '));
      setGalleryMedia(project.galleryMedia || []);
      setIsPublished(project.isPublished);
      setIsFeatured(project.isFeatured ?? false);
    } else {
      setTitle('');
      setSlug('');
      setLocation('');
      setCategory('Commercial Paving');
      setClientType('Commercial');
      setCompletionDate('Recent');
      setStatus('completed');
      setDescription('');
      setScopeSummary('');
      setCoverImageUrl('');
      setMaterialsUsed([]);
      setMaterialsInput('');
      setGalleryMedia([]);
      setIsPublished(true);
      setIsFeatured(false);
    }
    setErrorMsg(null);
  }, [project, isOpen]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEditing || !slug) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      );
    }
  };

  const handleAddMaterial = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = materialsInput.trim();
      if (trimmed) {
        const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
        const next = Array.from(new Set([...materialsUsed, ...parts]));
        setMaterialsUsed(next);
        setMaterialsInput('');
      }
    }
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterialsUsed((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddPhoto = () => {
    if (!newPhotoUrl.trim()) return;
    setGalleryMedia((prev) => [
      ...prev,
      {
        id: `ph-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        url: newPhotoUrl.trim(),
        phase: newPhotoPhase,
        caption: newPhotoCaption.trim() || undefined,
        sortOrder: prev.length,
      },
    ]);
    setNewPhotoUrl('');
    setNewPhotoCaption('');
  };

  const handleRemovePhoto = (index: number) => {
    setGalleryMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Project title is required.');
      return;
    }
    if (!location.trim()) {
      setErrorMsg('Site location is required.');
      return;
    }
    if (!category.trim()) {
      setErrorMsg('Category is required.');
      return;
    }

    // Parse any trailing material in input
    let finalMaterials = [...materialsUsed];
    if (materialsInput.trim()) {
      const extra = materialsInput.split(',').map((s) => s.trim()).filter(Boolean);
      finalMaterials = Array.from(new Set([...finalMaterials, ...extra]));
    }

    setIsSaving(true);
    setErrorMsg(null);

    const formData: ProjectFormData = {
      title: title.trim(),
      slug: slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      location: location.trim(),
      category: category.trim(),
      clientType,
      completionDate: completionDate.trim(),
      status,
      description: description.trim(),
      scopeSummary: scopeSummary.trim(),
      coverImageUrl: coverImageUrl.trim(),
      galleryMedia,
      materialsUsed: finalMaterials,
      videoUrl: '',
      isPublished,
      isFeatured,
      sortOrder: project?.sortOrder ?? 0,
    };

    const ok = await onSave(formData, project?.id);
    setIsSaving(false);
    if (ok) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={isEditing ? 'Edit Project Showcase' : 'Add New Completed Project'}
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-left text-xs" id="form-project-modal">
        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-2.5 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900">
            {errorMsg}
          </div>
        )}

        {/* Basic Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Project Title *
            </label>
            <Input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Atlantic Logistics Container Staging Yard"
              required
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Location *
            </label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Ibeju-Lekki Free Trade Zone, Lagos"
              required
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
            >
              <option value="Commercial Paving">Commercial Paving</option>
              <option value="Residential Building">Residential Building</option>
              <option value="Industrial Yard">Industrial Yard</option>
              <option value="Perimeter Wall">Perimeter Wall</option>
              <option value="Municipal & Roadway">Municipal & Roadway</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Client Sector
            </label>
            <select
              value={clientType}
              onChange={(e) => setClientType(e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
            >
              <option value="Commercial">Commercial</option>
              <option value="Residential">Residential</option>
              <option value="Industrial">Industrial</option>
              <option value="Institutional">Institutional</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Status & Completion
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
              >
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
              </select>
              <Input
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                placeholder="e.g. Nov 2025"
              />
            </div>
          </div>
        </div>

        {/* Narrative Description & Scope */}
        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Project Overview & Technical Execution
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
            placeholder="Detailed engineering scope, compaction layers, sub-base drainage, and installation techniques..."
          />
        </div>

        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Scope Summary / Key Metrics (Optional)
          </label>
          <Input
            value={scopeSummary}
            onChange={(e) => setScopeSummary(e.target.value)}
            placeholder="e.g. 4,800 m² paving with 45 MPa high-compression hydraulic stones"
          />
        </div>

        {/* Cover Image with Local Upload & Online URL */}
        <ImageInputWithUpload
          id="project-cover-image"
          label="Primary Cover Image"
          helperText="Upload a high-resolution cover photo from device or paste an HTTPS URL."
          value={coverImageUrl}
          onChange={(url) => setCoverImageUrl(url)}
          onRemove={() => setCoverImageUrl('')}
          bucket="project-media"
          folder="projects"
          placeholder="https://images.unsplash.com/... or paste image URL"
          previewHeight="h-36"
        />

        {/* Materials Used Tags */}
        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            X-FORCE Materials Specified (Type and press Enter or comma-separate)
          </label>
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 min-h-[38px]">
            {materialsUsed.map((mat, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 px-2 py-0.5 text-[11px] font-medium"
              >
                {mat}
                <button
                  type="button"
                  onClick={() => handleRemoveMaterial(idx)}
                  className="hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={materialsInput}
              onChange={(e) => setMaterialsInput(e.target.value)}
              onKeyDown={handleAddMaterial}
              placeholder="e.g. 80mm Heavy Paver, Coping Stone..."
              className="flex-1 bg-transparent border-none text-xs focus:outline-none min-w-[140px] text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Gallery Progression Media (Before / During / After) */}
        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-orange-600" />
              Progressive Gallery Photos (Before / During / After)
            </span>
            <span className="text-[11px] text-slate-400">
              {galleryMedia.length} photo{galleryMedia.length !== 1 ? 's' : ''} added
            </span>
          </div>

          {/* Existing Photos List */}
          {galleryMedia.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {galleryMedia.map((photo, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 p-2 gap-2"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <img
                      src={photo.url}
                      alt={photo.caption || 'Site photo'}
                      className="h-10 w-12 rounded object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="overflow-hidden">
                      <span className={`inline-block text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                        photo.phase === 'before'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : photo.phase === 'during'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {photo.phase}
                      </span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                        {photo.caption || photo.url}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Photo Row */}
          <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">
                Add Photo to Timeline
              </span>
              <div>
                <input
                  ref={timelineFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleTimelineUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => timelineFileInputRef.current?.click()}
                  disabled={isUploadingTimeline}
                  className="text-xs h-7 px-2 flex items-center gap-1 text-orange-600 border-orange-200 dark:border-orange-900/50 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                >
                  {isUploadingTimeline ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-3 w-3" />
                      <span>Upload from Device</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <div className="sm:col-span-3">
                <select
                  value={newPhotoPhase}
                  onChange={(e) => setNewPhotoPhase(e.target.value as any)}
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value="before">Phase: Before</option>
                  <option value="during">Phase: During</option>
                  <option value="after">Phase: After</option>
                </select>
              </div>
              <div className="sm:col-span-5">
                <input
                  type="text"
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  placeholder="Photo Image URL (or upload above)..."
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div className="sm:col-span-3">
                <input
                  type="text"
                  value={newPhotoCaption}
                  onChange={(e) => setNewPhotoCaption(e.target.value)}
                  placeholder="Short caption..."
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div className="sm:col-span-1 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPhoto}
                  disabled={!newPhotoUrl.trim()}
                  className="p-1.5"
                  title="Add photo to list"
                >
                  <Plus className="h-4 w-4 text-orange-600" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500"
            />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Publish to Website Showcase
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500"
            />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Featured on Homepage
            </span>
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
