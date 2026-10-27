import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  Sparkles,
  Layers,
  UploadCloud,
  Image as ImageIcon,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Calendar,
  MapPin,
  Tag,
  ShieldCheck,
  HardDrive,
  Database,
  RefreshCw,
  MoreVertical,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { mediaGalleryService } from '../../services/mediaGallery.service';
import { mediaService } from '../../services/media.service';
import {
  ProjectGalleryItem,
  DesignItem,
  MediaAsset,
  ProjectFormData,
  DesignFormData,
} from '../../types/mediaGallery';
import { ProjectFormModal } from './ProjectFormModal';
import { DesignFormModal } from './DesignFormModal';
import { MediaUploadModal } from './MediaUploadModal';
import { EmptyState } from '../ui/EmptyState';

export const MediaGalleryManagementPanel: React.FC = () => {
  const { currentUser, profile, isAdministrator, hasPermission } = useAuth();
  const userId = currentUser?.id || profile?.id;
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'projects' | 'designs' | 'media' | 'storage'>('projects');

  // Projects State
  const [projects, setProjects] = useState<ProjectGalleryItem[]>([]);
  const [projectSearch, setProjectSearch] = useState<string>('');
  const [projectCategoryFilter, setProjectCategoryFilter] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<ProjectGalleryItem | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);

  // Designs State
  const [designs, setDesigns] = useState<DesignItem[]>([]);
  const [designSearch, setDesignSearch] = useState<string>('');
  const [designCategoryFilter, setDesignCategoryFilter] = useState<string>('all');
  const [selectedDesign, setSelectedDesign] = useState<DesignItem | null>(null);
  const [isDesignModalOpen, setIsDesignModalOpen] = useState<boolean>(false);

  // Media Assets State
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [mediaCategoryFilter, setMediaCategoryFilter] = useState<string>('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);

  // Loading indicator
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [projList, designList, mediaList] = await Promise.all([
        mediaGalleryService.getProjects(),
        mediaGalleryService.getDesigns(),
        mediaGalleryService.getMediaAssets(),
      ]);
      setProjects(projList);
      setDesigns(designList);
      setMediaAssets(mediaList);
    } catch (err) {
      console.error('Failed to load media gallery data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers for Projects
  const handleSaveProject = async (data: ProjectFormData, existingId?: string): Promise<boolean> => {
    if (existingId) {
      const res = await mediaGalleryService.updateProject(existingId, data, userId);
      if (res.success) {
        toast.success('Project details updated successfully.', 'Project Updated');
        loadData();
        return true;
      } else {
        toast.error(!res.success ? res.error.message : 'Failed to update project.');
        return false;
      }
    } else {
      const res = await mediaGalleryService.createProject(data, userId);
      if (res.success) {
        toast.success('New project showcase published to portfolio.', 'Project Created');
        loadData();
        return true;
      } else {
        toast.error(!res.success ? res.error.message : 'Failed to create project.');
        return false;
      }
    }
  };

  const handleDeleteProject = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete the project "${title}"?`)) return;
    const res = await mediaGalleryService.deleteProject(id, userId);
    if (res.success) {
      toast.success(`Project "${title}" has been deleted.`);
      loadData();
    } else {
      toast.error(!res.success ? res.error.message : 'Failed to delete project.');
    }
  };

  const handleToggleProjectPublish = async (proj: ProjectGalleryItem) => {
    const res = await mediaGalleryService.toggleProjectPublish(proj.id, userId);
    if (res.success) {
      toast.info(
        proj.isPublished ? 'Project hidden from public showcase.' : 'Project published to website.'
      );
      loadData();
    }
  };

  // Handlers for Designs
  const handleSaveDesign = async (data: DesignFormData, existingId?: string): Promise<boolean> => {
    if (existingId) {
      const res = await mediaGalleryService.updateDesign(existingId, data, userId);
      if (res.success) {
        toast.success('Architectural design updated.', 'Design Updated');
        loadData();
        return true;
      } else {
        toast.error(!res.success ? res.error.message : 'Failed to update design.');
        return false;
      }
    } else {
      const res = await mediaGalleryService.createDesign(data, userId);
      if (res.success) {
        toast.success('New design inspiration added to catalog.', 'Design Created');
        loadData();
        return true;
      } else {
        toast.error(!res.success ? res.error.message : 'Failed to create design.');
        return false;
      }
    }
  };

  const handleDeleteDesign = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete design "${title}"?`)) return;
    const res = await mediaGalleryService.deleteDesign(id, userId);
    if (res.success) {
      toast.success(`Design "${title}" has been deleted.`);
      loadData();
    } else {
      toast.error(!res.success ? res.error.message : 'Failed to delete design.');
    }
  };

  const handleToggleDesignPublish = async (design: DesignItem) => {
    const res = await mediaGalleryService.toggleDesignPublish(design.id, userId);
    if (res.success) {
      toast.info(
        design.isPublished ? 'Design hidden from showcase.' : 'Design published to showcase.'
      );
      loadData();
    }
  };

  // Handlers for Media Assets
  const handleDeleteAsset = async (id: string, fileName: string) => {
    if (!window.confirm(`Delete media asset "${fileName}"?`)) return;
    const res = await mediaGalleryService.deleteMediaAsset(id, userId);
    if (res.success) {
      toast.success('Asset deleted from repository.');
      loadData();
    } else {
      toast.error(!res.success ? res.error.message : 'Failed to delete asset.');
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Asset URL copied to clipboard.');
  };

  // Computed Filters
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.location.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(projectSearch.toLowerCase());
    const matchesCategory =
      projectCategoryFilter === 'all' || p.category === projectCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredDesigns = designs.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(designSearch.toLowerCase()) ||
      d.category.toLowerCase().includes(designSearch.toLowerCase()) ||
      (d.patternStyle && d.patternStyle.toLowerCase().includes(designSearch.toLowerCase()));
    const matchesCategory =
      designCategoryFilter === 'all' || d.category === designCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredMedia = mediaAssets.filter((m) => {
    return mediaCategoryFilter === 'all' || m.category === mediaCategoryFilter;
  });

  const totalPublishedProjects = projects.filter((p) => p.isPublished).length;
  const totalPublishedDesigns = designs.filter((d) => d.isPublished).length;

  return (
    <div className="space-y-6 text-left" id="panel-media-gallery-management">
      {/* Top Header & Operational Stats */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 px-2 py-0.5 text-xs font-bold uppercase tracking-wider">
              Module 07
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Enterprise Digital Media & Project Showcase
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
            Media, Designs & Project Gallery
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage completed client site portfolios, architectural laying pattern inspirations, and cloud storage assets.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadData}
            leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            leftIcon={<UploadCloud className="h-3.5 w-3.5 text-orange-600" />}
          >
            Upload File
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              if (activeTab === 'designs') {
                setSelectedDesign(null);
                setIsDesignModalOpen(true);
              } else {
                setSelectedProject(null);
                setIsProjectModalOpen(true);
              }
            }}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            {activeTab === 'designs' ? 'New Design' : 'New Project'}
          </Button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Total Projects</span>
            <FolderGit2 className="h-4 w-4 text-orange-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {projects.length}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">
            {totalPublishedProjects} published live
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Architectural Designs</span>
            <Sparkles className="h-4 w-4 text-orange-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {designs.length}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">
            {totalPublishedDesigns} live in catalog
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Media Assets</span>
            <ImageIcon className="h-4 w-4 text-orange-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {mediaAssets.length}
          </p>
          <span className="text-[11px] text-slate-400">
            Indexed cloud repository
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Storage Provider</span>
            <HardDrive className="h-4 w-4 text-orange-600" />
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-white mt-2 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Supabase / Local
          </p>
          <span className="text-[11px] text-slate-400">
            Resilient fallback enabled
          </span>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'projects', label: 'Project Portfolios', icon: FolderGit2, count: projects.length },
          { id: 'designs', label: 'Design Showcases', icon: Sparkles, count: designs.length },
          { id: 'media', label: 'Media Library', icon: ImageIcon, count: mediaAssets.length },
          { id: 'storage', label: 'Storage Architecture', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                isActive
                  ? 'bg-orange-600 text-white shadow'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  isActive ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: PROJECT PORTFOLIOS */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-72">
              <Input
                placeholder="Search site, client or location..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                leftIcon={<Search className="h-3.5 w-3.5 text-slate-400" />}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <span className="text-xs font-semibold text-slate-400 shrink-0">Category:</span>
              {['all', 'Commercial Paving', 'Residential Building', 'Industrial Yard', 'Perimeter Wall'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setProjectCategoryFilter(c)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition ${
                    projectCategoryFilter === c
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {c === 'all' ? 'All Categories' : c}
                </button>
              ))}
            </div>
          </div>

          {/* Projects Table / Grid */}
          {filteredProjects.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900 text-center">
              <EmptyState
                title="No Project Portfolios Found"
                description="Upload site case studies to exhibit X-FORCE engineering excellence to commercial buyers."
                actionLabel="Create Project"
                onAction={() => {
                  setSelectedProject(null);
                  setIsProjectModalOpen(true);
                }}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <tr>
                    <th className="p-3.5">Project & Location</th>
                    <th className="p-3.5">Category & Sector</th>
                    <th className="p-3.5">Timeline & Status</th>
                    <th className="p-3.5">Phases & Materials</th>
                    <th className="p-3.5 text-center">Visibility</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              p.coverImageUrl ||
                              'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=300&q=80'
                            }
                            alt={p.title}
                            className="h-11 w-14 rounded-lg object-cover bg-slate-100 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block hover:text-orange-600 transition cursor-pointer"
                              onClick={() => {
                                setSelectedProject(p);
                                setIsProjectModalOpen(true);
                              }}
                            >
                              {p.title}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 text-orange-600" /> {p.location}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="inline-block rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {p.category}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          {p.clientType || 'Commercial'}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              p.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">
                            {p.status.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {p.completionDate || 'Recent'}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                          {(p.galleryMedia || []).length} timeline photo{(p.galleryMedia || []).length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block max-w-[180px]">
                          {(p.materialsUsed || []).slice(0, 2).join(', ')}
                          {(p.materialsUsed || []).length > 2 ? '...' : ''}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleProjectPublish(p)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
                            p.isPublished
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {p.isPublished ? (
                            <>
                              <Eye className="h-3 w-3" /> Published
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3" /> Draft
                            </>
                          )}
                        </button>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProject(p);
                              setIsProjectModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-orange-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit project"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProject(p.id, p.title)}
                            className="p-1.5 text-slate-500 hover:text-red-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Delete project"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ARCHITECTURAL DESIGNS */}
      {activeTab === 'designs' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-72">
              <Input
                placeholder="Search designs or styles..."
                value={designSearch}
                onChange={(e) => setDesignSearch(e.target.value)}
                leftIcon={<Search className="h-3.5 w-3.5 text-slate-400" />}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <span className="text-xs font-semibold text-slate-400 shrink-0">Category:</span>
              {['all', 'Residential Facade', 'Commercial Driveway', 'Estate Perimeter', 'Courtyard & Patio'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDesignCategoryFilter(c)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition ${
                    designCategoryFilter === c
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {c === 'all' ? 'All Categories' : c}
                </button>
              ))}
            </div>
          </div>

          {/* Designs Grid */}
          {filteredDesigns.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900 text-center">
              <EmptyState
                title="No Architectural Designs Found"
                description="Add masonry laying combinations, perimeter bonding styles, and factory pigment palettes."
                actionLabel="Create Design"
                onAction={() => {
                  setSelectedDesign(null);
                  setIsDesignModalOpen(true);
                }}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDesigns.map((d) => (
                <div
                  key={d.id}
                  className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow transition flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-44 w-full bg-slate-100 dark:bg-slate-800">
                      <img
                        src={
                          d.images && d.images.length > 0
                            ? d.images[0]
                            : 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=600&q=80'
                        }
                        alt={d.title}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span className="rounded bg-black/60 backdrop-blur px-2 py-0.5 text-[10px] font-bold text-white">
                          {d.category}
                        </span>
                      </div>
                      <div className="absolute top-2 right-2">
                        <button
                          type="button"
                          onClick={() => handleToggleDesignPublish(d)}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold shadow ${
                            d.isPublished
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-800/80 text-slate-300'
                          }`}
                        >
                          {d.isPublished ? 'Published' : 'Draft'}
                        </button>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        {d.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {d.description}
                      </p>

                      {/* Color Palette Swatches */}
                      {d.colorPalette && d.colorPalette.length > 0 && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-slate-400 font-semibold">Pigments:</span>
                          <div className="flex items-center -space-x-1">
                            {d.colorPalette.map((c, i) => (
                              <span
                                key={i}
                                title={c.name}
                                className="h-3.5 w-3.5 rounded-full border border-white dark:border-slate-800"
                                style={{ backgroundColor: c.hex }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs mt-2">
                    <span className="text-slate-400 text-[11px]">{d.patternStyle || 'Engineered'}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDesign(d);
                          setIsDesignModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-orange-600 rounded"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDesign(d.id, d.title)}
                        className="p-1.5 text-slate-500 hover:text-red-600 rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MEDIA LIBRARY ASSETS */}
      {activeTab === 'media' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-semibold text-slate-400">Category:</span>
              {['all', 'Projects', 'Designs', 'Products', 'General'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setMediaCategoryFilter(c)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition ${
                    mediaCategoryFilter === c
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {c === 'all' ? 'All Media' : c}
                </button>
              ))}
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              leftIcon={<UploadCloud className="h-3.5 w-3.5" />}
            >
              Upload Asset
            </Button>
          </div>

          {filteredMedia.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900 text-center">
              <EmptyState
                title="No Media Assets Found"
                description="Upload site photographs, pattern schematics, or factory certificates to populate the asset library."
                actionLabel="Upload Media"
                onAction={() => setIsUploadModalOpen(true)}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredMedia.map((asset) => (
                <div
                  key={asset.id}
                  className="group rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-sm flex flex-col justify-between"
                >
                  <div
                    className="relative h-32 w-full bg-slate-100 dark:bg-slate-800 cursor-pointer overflow-hidden"
                    onClick={() => setPreviewMediaUrl(asset.publicUrl)}
                  >
                    <img
                      src={asset.publicUrl}
                      alt={asset.altText || asset.fileName}
                      className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.2 text-[9px] text-white">
                      {asset.category}
                    </span>
                  </div>

                  <div className="p-2.5 space-y-1">
                    <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate" title={asset.fileName}>
                      {asset.fileName}
                    </p>
                    <span className="text-[10px] text-slate-400 block">
                      {(asset.fileSize / 1024).toFixed(1)} KB • {asset.mimeType.split('/')[1] || 'img'}
                    </span>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(asset.publicUrl)}
                        className="text-slate-400 hover:text-orange-600 p-1"
                        title="Copy Public URL"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMediaUrl(asset.publicUrl)}
                        className="text-slate-400 hover:text-orange-600 p-1"
                        title="Preview"
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAsset(asset.id, asset.fileName)}
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="Delete asset"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: STORAGE ARCHITECTURE & HEALTH */}
      {activeTab === 'storage' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Storage & Data Access Layer
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Resilient multi-tier asset storage adhering strictly to Module 07 specifications.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  Supabase Cloud Storage Engine
                </span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Configured
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Primary persistent bucket: <code className="text-orange-600 font-mono">media-assets</code> with public CDN delivery, MIME validation, and size capping.
              </p>
              <div className="text-[11px] text-slate-400 pt-1">
                Database Tables: <code className="text-slate-700 dark:text-slate-300 font-mono">media_assets, project_gallery, project_gallery_media, design_items</code>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  Local Web Storage Fallback Engine
                </span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Seamless local caching ensures offline resilience in case of network latency or disconnected site inspections.
              </p>
              <div className="text-[11px] text-slate-400 pt-1">
                Storage Key: <code className="text-slate-700 dark:text-slate-300 font-mono">xforce_media_assets, xforce_project_gallery, xforce_design_items</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Preview Modal */}
      {previewMediaUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewMediaUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-xl bg-slate-900 p-2">
            <img
              src={previewMediaUrl}
              alt="Asset Preview"
              className="max-h-[80vh] w-auto rounded object-contain"
              referrerPolicy="no-referrer"
            />
            <button
              type="button"
              onClick={() => setPreviewMediaUrl(null)}
              className="absolute top-4 right-4 rounded-full bg-black/60 p-2 text-white hover:bg-black/90"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Project Form Modal */}
      <ProjectFormModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        project={selectedProject}
        onSave={handleSaveProject}
      />

      {/* Design Form Modal */}
      <DesignFormModal
        isOpen={isDesignModalOpen}
        onClose={() => setIsDesignModalOpen(false)}
        design={selectedDesign}
        onSave={handleSaveDesign}
      />

      {/* Media Upload Modal */}
      <MediaUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploaded={() => loadData()}
      />
    </div>
  );
};
