/**
 * Featured Projects Management Modal & Inline Section
 *
 * Dedicated admin component to change, upload, edit, or delete
 * the Featured Client Projects shown on the homepage and project portfolio.
 * Provides dual image support (upload from local device & online image URLs).
 */

import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Calendar,
  Layers,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { PublicProject } from '../../types/public';
import { ProjectGalleryItem, ProjectFormData } from '../../types/mediaGallery';
import { publicDataService, DEFAULT_PUBLIC_PROJECTS } from '../../services/publicData.service';
import { mediaGalleryRepository } from '../../repositories/mediaGallery.repository';
import { ImageInputWithUpload } from '../ui/ImageInputWithUpload';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

interface FeaturedProjectsManagementProps {
  isOpen?: boolean;
  onClose?: () => void;
  inline?: boolean;
}

const PROJECT_CATEGORIES = [
  'Industrial Yard',
  'Residential Building',
  'Perimeter Wall',
  'Commercial Paving',
  'Infrastructure',
  'Civic & Institutional',
];

export const FeaturedProjectsManagementModal: React.FC<FeaturedProjectsManagementProps> = ({
  isOpen = true,
  onClose,
  inline = false,
}) => {
  const toast = useToast();
  const [projects, setProjects] = useState<ProjectGalleryItem[]>([]);
  const [editingProject, setEditingProject] = useState<ProjectGalleryItem | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    slug: '',
    category: 'Commercial Paving',
    location: '',
    clientType: 'Commercial',
    status: 'completed',
    completionDate: '2026',
    description: '',
    scopeSummary: '',
    materialsUsed: [''],
    coverImageUrl: '',
    galleryMedia: [],
    videoUrl: '',
    isPublished: true,
    sortOrder: 1,
  });

  const loadProjects = async () => {
    const res = await mediaGalleryRepository.getAllProjects();
    if (res.success && res.data) {
      setProjects(res.data);
    } else {
      const publicList = publicDataService.getProjects();
      setProjects(publicList as any);
    }
  };

  useEffect(() => {
    loadProjects();
    const handleUpdate = () => loadProjects();
    window.addEventListener('xforce_projects_updated', handleUpdate);
    return () => window.removeEventListener('xforce_projects_updated', handleUpdate);
  }, []);

  const handleStartEdit = (proj: ProjectGalleryItem) => {
    setIsCreatingNew(false);
    setEditingProject(proj);
    setFormData({
      title: proj.title,
      slug: proj.slug || proj.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category: proj.category,
      location: proj.location,
      clientType: proj.clientType || 'Commercial',
      status: proj.status || 'completed',
      completionDate: proj.completionDate || '',
      description: proj.description || '',
      scopeSummary: proj.scopeSummary || '',
      materialsUsed: proj.materialsUsed?.length ? [...proj.materialsUsed] : [''],
      coverImageUrl: proj.coverImageUrl || '',
      galleryMedia: proj.galleryMedia?.length ? [...proj.galleryMedia] : [],
      videoUrl: proj.videoUrl || '',
      isPublished: proj.isPublished !== false,
      sortOrder: proj.sortOrder ?? 1,
    });
  };

  const handleStartCreate = () => {
    setEditingProject(null);
    setIsCreatingNew(true);
    setFormData({
      title: '',
      slug: '',
      category: 'Commercial Paving',
      location: 'Lagos, Nigeria',
      clientType: 'Commercial',
      status: 'completed',
      completionDate: 'Recent',
      description: 'Precision engineered interlocking masonry installation delivered to exacting specifications.',
      scopeSummary: 'Site excavation, laser sub-base leveling, stone-dust bedding, and vibratory compaction.',
      materialsUsed: [
        '80mm Heavy-Duty Interlocking Paver (45 MPa)',
        'Cast Concrete Retaining Kerbs',
        'Sharp River Sand Screed',
      ],
      coverImageUrl: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=80',
      galleryMedia: [
        {
          id: `gm-${Date.now()}-1`,
          url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80',
          caption: 'Sub-base compaction and perimeter kerb alignment.',
          phase: 'before',
          sortOrder: 1,
        },
        {
          id: `gm-${Date.now()}-2`,
          url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=80',
          caption: 'Completed project installation sign-off.',
          phase: 'after',
          sortOrder: 2,
        },
      ],
      videoUrl: '',
      isPublished: true,
      sortOrder: projects.length + 1,
    });
  };

  const handleCloseForm = () => {
    setEditingProject(null);
    setIsCreatingNew(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      toast.error('Validation Error', 'Project title is required.');
      return;
    }

    try {
      const cleanedData: ProjectFormData = {
        ...formData,
        title: formData.title.trim(),
        slug: formData.slug?.trim() || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        materialsUsed: formData.materialsUsed?.filter((m) => m.trim()) || [],
        galleryMedia: formData.galleryMedia || [],
      };

      const res = await mediaGalleryRepository.saveProject(cleanedData, editingProject?.id);
      if (res.success) {
        toast.success(
          isCreatingNew ? 'Project Created' : 'Project Updated',
          `"${cleanedData.title}" is now published and active on the homepage!`
        );
        loadProjects();
        handleCloseForm();
      } else {
        toast.error('Save Failed', res.error.message || 'Could not save project.');
      }
    } catch (err: any) {
      toast.error('Save Error', err.message || 'Could not save project.');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    try {
      const res = await mediaGalleryRepository.deleteProject(id);
      if (res.success) {
        toast.success('Project Deleted', `Removed "${title}" from project showcase.`);
        setConfirmDeleteId(null);
        loadProjects();
        if (editingProject?.id === id) {
          handleCloseForm();
        }
      } else {
        toast.error('Delete Failed', res.error.message);
      }
    } catch (err: any) {
      toast.error('Delete Error', err.message);
    }
  };

  const handleTogglePublish = async (proj: ProjectGalleryItem) => {
    try {
      const res = await mediaGalleryRepository.toggleProjectPublish(proj.id);
      if (res.success) {
        toast.info(
          proj.isPublished
            ? `Hidden "${proj.title}" from public homepage.`
            : `Published "${proj.title}" live to public homepage!`
        );
        loadProjects();
      }
    } catch (err: any) {
      toast.error('Toggle Failed', err.message);
    }
  };

  const handleResetToDefaults = async () => {
    if (!window.confirm('Reset all featured projects to factory defaults? Any custom added projects will be replaced.')) {
      return;
    }
    try {
      const res = await mediaGalleryRepository.resetToDefaultProjects();
      if (res.success) {
        toast.success('Projects Reset', 'Featured client projects restored to standard enterprise portfolio.');
        loadProjects();
        handleCloseForm();
      }
    } catch (err: any) {
      toast.error('Reset Failed', err.message);
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Featured Client Projects Showcase
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage the project portfolio cards shown under "Featured Client Projects" on the homepage and projects page.
            Supports direct local file upload & online URLs for project cover photos and progress galleries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleResetToDefaults}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            title="Restore original project showcase"
          >
            Reset Defaults
          </Button>

          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={handleStartCreate}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add New Project
          </Button>
        </div>
      </div>

      {/* Edit / Create Form */}
      {(isCreatingNew || editingProject) && (
        <form
          onSubmit={handleSave}
          className="bg-white dark:bg-slate-900 rounded-xl border-2 border-orange-500/50 p-5 shadow-lg space-y-5 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-600"></span>
              {isCreatingNew ? 'Add New Featured Project' : `Edit: ${editingProject?.title}`}
            </h4>
            <button
              type="button"
              onClick={handleCloseForm}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Project Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Atlantic Logistics Freight Terminal & Staging Yard"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Project Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {PROJECT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Location *
              </label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Ibeju-Lekki Free Trade Zone, Lagos"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Client Type & Completion Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Client Sector
              </label>
              <select
                value={formData.clientType}
                onChange={(e) => setFormData({ ...formData, clientType: e.target.value as any })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="Commercial">Commercial / Corporate</option>
                <option value="Residential">Residential / Private</option>
                <option value="Industrial">Industrial / Logistics</option>
                <option value="Government">Government / Public Works</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Completion Date
              </label>
              <input
                type="text"
                value={formData.completionDate}
                onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
                placeholder="e.g. November 2025 or Recent"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Short Description */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Project Overview & Executive Summary
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief technical summary of the engineering challenge and delivered solution..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Scope Summary */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Scope Summary (m² / Linear Meters)
              </label>
              <input
                type="text"
                value={formData.scopeSummary}
                onChange={(e) => setFormData({ ...formData, scopeSummary: e.target.value })}
                placeholder="e.g. 4,800 m² heavy-duty paving, sub-base compaction testing, perimeter retaining kerbs."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Primary Cover Image with ImageInputWithUpload */}
            <div className="md:col-span-2 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <ImageInputWithUpload
                id="project-cover-image-uploader"
                label="Project Cover Image (Main Card Thumbnail) *"
                helperText="Upload an image from your computer or paste an online image URL. Displayed on the homepage."
                value={formData.coverImageUrl}
                onChange={(url) => setFormData({ ...formData, coverImageUrl: url })}
                onRemove={() => setFormData({ ...formData, coverImageUrl: '' })}
                bucket="project-media"
                folder="projects"
                placeholder="https://... cover photo URL"
                previewHeight="h-36"
              />
            </div>

            {/* Published Toggle */}
            <div className="md:col-span-2 flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Showcase Live on Homepage
                </span>
                <span className="text-[11px] text-slate-500">
                  When enabled, this project appears in the Featured Projects carousel/grid on the homepage.
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={handleCloseForm}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" leftIcon={<CheckCircle2 className="w-4 h-4" />}>
              {isCreatingNew ? 'Create & Publish Project' : 'Save Changes'}
            </Button>
          </div>
        </form>
      )}

      {/* Projects Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((proj) => (
          <div
            key={proj.id}
            className={`flex flex-col justify-between rounded-xl border bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-all hover:shadow-md ${
              proj.isPublished
                ? 'border-slate-200 dark:border-slate-800'
                : 'border-slate-300 dark:border-slate-700 opacity-60'
            }`}
          >
            <div>
              {/* Cover Photo */}
              <div className="relative h-44 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                {proj.coverImageUrl ? (
                  <img
                    src={proj.coverImageUrl}
                    alt={proj.title}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <Building2 className="w-8 h-8 stroke-1" />
                    <span className="text-[10px] mt-1">No Cover Image</span>
                  </div>
                )}
                <div className="absolute top-2.5 left-2.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/70 backdrop-blur-sm text-white">
                    {proj.category}
                  </span>
                </div>
                <div className="absolute top-2.5 right-2.5">
                  <button
                    type="button"
                    onClick={() => handleTogglePublish(proj)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-sm transition-colors ${
                      proj.isPublished
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-slate-700/80 text-slate-200'
                    }`}
                  >
                    {proj.isPublished ? (
                      <>
                        <Eye className="w-3 h-3" /> Live
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3" /> Draft
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="p-4 space-y-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                  {proj.title}
                </h4>
                <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{proj.location}</span>
                  </div>
                  {proj.completionDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span>{proj.completionDate}</span>
                    </div>
                  )}
                </div>
                {proj.scopeSummary && (
                  <p className="text-[11px] text-slate-500 line-clamp-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    {proj.scopeSummary}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-medium text-slate-400">
                {proj.clientType || 'Commercial'}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleStartEdit(proj)}
                  className="p-1.5 text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-orange-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  title="Edit project details and photos"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                {confirmDeleteId === proj.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDelete(proj.id, proj.title)}
                      className="px-2 py-0.5 text-[10px] font-bold text-white bg-red-600 rounded hover:bg-red-700"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(proj.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Delete project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
        >
          <X className="w-5 h-5" />
        </button>
        {content}
      </div>
    </div>
  );
};
