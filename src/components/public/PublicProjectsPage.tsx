import React, { useState, useEffect } from 'react';
import { PageHeader } from '../ui/PageHeader';
import { SearchInput } from '../ui/SearchInput';
import { ProjectCard } from '../cards/ProjectCard';
import { ProjectDetailModal } from './ProjectDetailModal';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';
import { publicDataService } from '../../services/publicData.service';
import { PublicProject } from '../../types/public';
import { Building2, MessageSquare, Filter } from 'lucide-react';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { openWhatsAppChat } from '../../utils/whatsapp';

export interface PublicProjectsPageProps {
  onBackHome?: () => void;
  onRequestQuote?: (project?: PublicProject) => void;
}

export const PublicProjectsPage: React.FC<PublicProjectsPageProps> = ({
  onBackHome,
  onRequestQuote,
}) => {
  const { publicSettings } = useBusinessSettings();
  const [projects, setProjects] = useState<PublicProject[]>(() => publicDataService.getProjects());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress'>('all');
  const [search, setSearch] = useState<string>('');
  const [activeProject, setActiveProject] = useState<PublicProject | null>(null);

  useEffect(() => {
    let mounted = true;
    publicDataService.getProjectsAsync().then((items) => {
      if (mounted && items.length > 0) {
        setProjects(items);
      }
    });

    const handleUpdate = () => {
      publicDataService.getProjectsAsync().then((items) => {
        if (mounted) setProjects(items);
      });
    };

    window.addEventListener('xforce_projects_updated', handleUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('xforce_projects_updated', handleUpdate);
    };
  }, []);

  const dynamicCategories = Array.from(
    new Set(projects.map((p) => p.category).filter(Boolean))
  );
  const categories = ['all', ...dynamicCategories];

  const filteredProjects = projects.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'completed' && p.status === 'completed') ||
      (statusFilter === 'in_progress' && p.status === 'in_progress');

    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q);

    return matchesCategory && matchesStatus && matchesSearch;
  });

  const handleWhatsApp = () => {
    const msg = `Hello ${publicSettings.publicBrandName}, I am reviewing your completed projects and would like to discuss a similar paving/building installation.`;
    openWhatsAppChat(publicSettings.whatsappNumber, msg);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-left space-y-6" id="public-projects-showcase">
      <PageHeader
        title="Engineering Showcase & Completed Sites"
        description="Inspect verified commercial pavements, residential interlocking facades, and heavy-duty logistics yards built with X-FORCE materials."
        breadcrumbItems={[
          { label: 'Home', onClick: onBackHome },
          { label: 'Projects Showcase', isCurrent: true },
        ]}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="w-full lg:w-80">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by location, project or category..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Segment */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md transition ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All Status
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1 rounded-md transition ${
                statusFilter === 'completed'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Completed
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('in_progress')}
              className={`px-3 py-1 rounded-md transition ${
                statusFilter === 'in_progress'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              In Progress
            </button>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {cat === 'all' ? 'All Categories' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Projects Grid or Empty State */}
      {filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900 text-center">
          <EmptyState
            title="No Matching Projects Found"
            description={`No showcase sites matched your current filters. Try searching for another location or clearing category filters.`}
            actionLabel="Reset Search Filters"
            onAction={() => {
              setSearch('');
              setSelectedCategory('all');
              setStatusFilter('all');
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProjects.map((proj) => (
            <ProjectCard
              key={proj.id}
              id={proj.id}
              title={proj.title}
              location={proj.location}
              category={proj.category}
              completionDate={proj.completionDate}
              status={proj.status === 'completed' ? 'completed' : 'processing'}
              statusLabel={proj.status === 'completed' ? 'Verified Built' : 'In Progress'}
              coverImageUrl={proj.coverImageUrl}
              onClick={() => setActiveProject(proj)}
            />
          ))}
        </div>
      )}

      {/* Technical Consultation CTA Card */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-orange-50/70 via-white to-slate-50 p-6 sm:p-8 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h4 className="text-base font-bold text-slate-900 dark:text-white">
            Have a site in mind? Request on-site technical inspection.
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
            Our qualified site engineers visit client locations across {publicSettings.contact.address.state} to inspect sub-base compaction, evaluate drainage levels, and compile a verified Bill of Quantities.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<MessageSquare className="h-4 w-4 text-emerald-600" />}
            onClick={handleWhatsApp}
          >
            WhatsApp Support
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onRequestQuote && onRequestQuote()}
          >
            Request Project Quote
          </Button>
        </div>
      </div>

      {/* Project Detail Modal */}
      <ProjectDetailModal
        project={activeProject}
        isOpen={Boolean(activeProject)}
        onClose={() => setActiveProject(null)}
        onRequestQuote={(p) => {
          setActiveProject(null);
          onRequestQuote && onRequestQuote(p);
        }}
      />
    </div>
  );
};
