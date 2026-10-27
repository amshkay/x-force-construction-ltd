import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Input,
  Textarea,
  Select,
  Checkbox,
  RadioGroup,
  Switch,
  Label,
  FormField,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  StatusBadge,
  Avatar,
  Tooltip,
  Popover,
  Modal,
  Drawer,
  Tabs,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Pagination,
  SearchInput,
  DateInput,
  FileUpload,
  Progress,
  Spinner,
  Skeleton,
  Alert,
  EmptyState,
  ErrorState,
  LoadingState,
  ConfirmDialog,
  Breadcrumb,
  Separator,
  FilterPanel,
  PageHeader,
  ConnectionStatusIndicator,
} from '../ui';
import { SystemStatus } from '../../config/theme.tokens';
import { useToast } from '../ui/Toast';
import {
  Sparkles,
  Search,
  Plus,
  Trash2,
  Edit,
  Download,
  AlertCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

export const DesignSystemShowcase: React.FC = () => {
  const toast = useToast();

  // Modals & Drawers state
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Form controls state
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('interlock');
  const [checkboxValue, setCheckboxValue] = useState(true);
  const [radioValue, setRadioValue] = useState('standard');
  const [switchValue, setSwitchValue] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [progressVal, setProgressVal] = useState(65);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('buttons');

  // Filter chips
  const [filterChips, setFilterChips] = useState([
    { id: 'cat', label: 'Category', value: 'Bricks' },
    { id: 'status', label: 'Status', value: 'In Stock' },
  ]);

  const allStatuses: SystemStatus[] = [
    'success',
    'active',
    'completed',
    'pending',
    'processing',
    'warning',
    'error',
    'cancelled',
    'draft',
    'inactive',
  ];

  return (
    <div className="space-y-10 text-left" id="design-system-showcase">
      <PageHeader
        title="Module 01 Design System & UI Specification"
        description="Comprehensive verification workbench for all reusable tokens, primitives, forms, dialogs, and feedback components."
        breadcrumbItems={[
          { label: 'Management Console' },
          { label: 'UI Component Library', isCurrent: true },
        ]}
        primaryAction={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
            leftIcon={<Sparkles className="h-4 w-4" />}
          >
            Launch Modal Dialog
          </Button>
        }
        secondaryActions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDrawerOpen(true)}
          >
            Open Side Drawer
          </Button>
        }
      />

      {/* Tabs navigation for UI components */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'buttons', label: 'Buttons & Icons' },
          { id: 'forms', label: 'Form System' },
          { id: 'badges', label: 'Badges & Statuses' },
          { id: 'feedback', label: 'Feedback & States' },
          { id: 'tables', label: 'Table & Overlays' },
        ]}
      />

      {/* 1. Buttons & Icons */}
      {activeTab === 'buttons' && (
        <div className="space-y-8 animate-in fade-in duration-150">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold">Button Variants</CardTitle>
              <CardDescription className="text-xs">
                Supports primary, secondary, outline, ghost, danger, and link variants.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
                <Button variant="link">Text Link</Button>
              </div>

              <Separator />

              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" variant="primary">Small (sm)</Button>
                <Button size="md" variant="primary">Medium (md)</Button>
                <Button size="lg" variant="primary">Large (lg)</Button>
                <Button isLoading variant="primary">Loading State</Button>
                <Button disabled variant="primary">Disabled</Button>
              </div>

              <Separator />

              <div className="flex flex-wrap items-center gap-3">
                <Button leftIcon={<Plus className="h-4 w-4" />} variant="primary">
                  Left Icon
                </Button>
                <Button rightIcon={<ExternalLink className="h-4 w-4" />} variant="outline">
                  Right Icon
                </Button>
                <IconButton label="Search items" icon={<Search className="h-4 w-4" />} />
                <IconButton label="Delete record" variant="danger" icon={<Trash2 className="h-4 w-4" />} />
                <IconButton label="Edit settings" variant="secondary" icon={<Edit className="h-4 w-4" />} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold">Tooltips & Popovers</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-6">
              <Tooltip content="Tooltip message above control" position="top">
                <Button variant="outline" size="sm">Hover for Tooltip (Top)</Button>
              </Tooltip>

              <Tooltip content="Quick assistance information" position="bottom">
                <Button variant="ghost" size="sm" leftIcon={<HelpCircle className="h-4 w-4" />}>
                  Tooltip (Bottom)
                </Button>
              </Tooltip>

              <Popover
                trigger={
                  <Button variant="secondary" size="sm">
                    Click for Popover
                  </Button>
                }
              >
                <div className="space-y-2 text-left w-48 text-xs">
                  <p className="font-bold">Contextual Popover</p>
                  <p className="text-slate-500">Zero-dependency accessible popover container.</p>
                </div>
              </Popover>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Connection:</span>
                <ConnectionStatusIndicator showText={true} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. Form System */}
      {activeTab === 'forms' && (
        <Card className="animate-in fade-in duration-150">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Reusable Form System</CardTitle>
            <CardDescription className="text-xs">
              Supports accessible labels, required asterisks, helper text, error messages, and disabled states.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Product Name"
                required
                htmlFor="demo-name"
                helperText="Enter official catalogue label"
              >
                <Input
                  id="demo-name"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="e.g. 60mm Interlocking Paver"
                />
              </FormField>

              <FormField
                label="Error Validation Example"
                required
                htmlFor="demo-error"
                error="Batch serial code is required for stock entry"
              >
                <Input
                  id="demo-error"
                  placeholder="XF-9020"
                  error="Invalid code"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Material Category" htmlFor="demo-select">
                <Select
                  id="demo-select"
                  value={selectValue}
                  onChange={(e) => setSelectValue(e.target.value)}
                  options={[
                    { value: 'interlock', label: 'Interlocking Bricks' },
                    { value: 'pavers', label: 'Paving Stones' },
                    { value: 'blocks', label: 'Sandcrete Blocks' },
                    { value: 'coping', label: 'Wall Coping Tiles' },
                  ]}
                />
              </FormField>

              <FormField label="Production Date" htmlFor="demo-date">
                <DateInput id="demo-date" value="2026-03-20" onChange={() => {}} />
              </FormField>
            </div>

            <FormField label="Technical Description & Notes" htmlFor="demo-notes">
              <Textarea
                id="demo-notes"
                rows={3}
                placeholder="Compressive strength specifications, batch ratio, color dye..."
              />
            </FormField>

            <Separator />

            {/* Checkboxes, Radios, Switches */}
            <div className="space-y-4">
              <Checkbox
                id="demo-check"
                label="Include standard wooden pallet deposit fee (₦2,500/pallet)"
                checked={checkboxValue}
                onChange={(e) => setCheckboxValue(e.target.checked)}
              />

              <Switch
                id="demo-switch"
                label="Enable automatic site delivery dispatch notifications"
                checked={switchValue}
                onChange={setSwitchValue}
              />

              <RadioGroup
                label="Delivery Method"
                name="delivery-method"
                value={radioValue}
                onChange={setRadioValue}
                options={[
                  { value: 'standard', label: 'Self-Pickup from Factory Yard (Lekki Yard)' },
                  { value: 'express', label: 'Flatbed Crane Truck Delivery to Site' },
                ]}
              />
            </div>

            <Separator />

            {/* File Upload Component */}
            <FileUpload
              label="Attach Architectural Drawings or Site Survey (Optional)"
              helperText="Accepted formats: PDF, JPG, PNG up to 10 MB"
              onFileSelect={(files) => {
                toast.success(`Attached ${files.length} document(s).`, 'File Upload');
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* 3. Badges & Statuses */}
      {activeTab === 'badges' && (
        <Card className="animate-in fade-in duration-150">
          <CardHeader>
            <CardTitle className="text-sm font-bold">
              Centralized Status Mapping System (Section 9)
            </CardTitle>
            <CardDescription className="text-xs">
              Centralized mapping for: Success, Pending, Processing, Warning, Error, Inactive, Active, Draft, Completed, Cancelled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">
                System Status Badges
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {allStatuses.map((st) => (
                  <StatusBadge key={st} status={st} />
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">
                Small Size Variant
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {allStatuses.map((st) => (
                  <StatusBadge key={st} status={st} size="sm" />
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">
                Filter Panel Foundation (Section 25)
              </p>
              <FilterPanel
                activeFilters={filterChips}
                onRemoveFilter={(id) => {
                  setFilterChips(filterChips.filter((c) => c.id !== id));
                }}
                onClearAllFilters={() => setFilterChips([])}
              >
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  <p className="font-semibold mb-2">Expanded Filter Parameters</p>
                  <p>Date ranges, supplier accounts, and warehouse zones will populate here.</p>
                </div>
              </FilterPanel>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Feedback & States */}
      {activeTab === 'feedback' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold">Semantic Alert Boxes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert variant="info" title="Informational Notice">
                System maintenance scheduled for Sunday at 02:00 AM UTC.
              </Alert>
              <Alert variant="success" title="Batch Cured Successfully">
                5,000 interlocking pavers passed compressive strength 45MPa testing.
              </Alert>
              <Alert variant="warning" title="Low Raw Material Reserve">
                River sand stock is below 15 tonnes. Reorder suggested.
              </Alert>
              <Alert variant="destructive" title="Dispatch Authorization Required">
                Waybill #WB-2026-088 requires driver signoff before site departure.
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold">Toast Notification Triggers (Section 27)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.success('Quotation draft saved successfully.', 'Success')}
                >
                  Trigger Success Toast
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.warning('Connection intermittent. Queuing action locally.', 'Network')}
                >
                  Trigger Warning Toast
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.error('Unable to reach storage bucket.', 'Service Error')}
                >
                  Trigger Error Toast
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info('New offline transaction synchronized.', 'Information')}
                >
                  Trigger Info Toast
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold">Loading & Empty States (Section 28, 29, 30)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Progress Bar</p>
                <Progress value={progressVal} showValueText label="Curing Progress (72 Hours)" />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Spinner size="sm" />
                  <span className="text-xs text-slate-500">Small</span>
                </div>
                <div className="flex items-center gap-2">
                  <Spinner size="md" />
                  <span className="text-xs text-slate-500">Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <Spinner size="lg" />
                  <span className="text-xs text-slate-500">Large</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500">Content Skeleton Placeholders</p>
                <div className="space-y-2 max-w-md">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>

              <EmptyState
                icon={<Search className="h-8 w-8 text-slate-400" />}
                title="No customers matching search query"
                description="Try refining your telephone number or business name search."
                actionLabel="Reset Search Filter"
                onAction={() => toast.info('Reset filters', 'Reset')}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5. Table & Overlays */}
      {activeTab === 'tables' && (
        <Card className="animate-in fade-in duration-150">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Responsive Table & Pagination Foundation</CardTitle>
            <CardDescription className="text-xs">
              Includes mobile-responsive card fallback and horizontal scrolling.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material ID</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono text-xs text-slate-500">MAT-001</TableCell>
                    <TableCell className="font-semibold">Interlocking Brick (Red)</TableCell>
                    <TableCell>Facing Bricks</TableCell>
                    <TableCell className="font-mono">₦350.00</TableCell>
                    <TableCell><StatusBadge status="active" size="sm" /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Inspect</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs text-slate-500">MAT-002</TableCell>
                    <TableCell className="font-semibold">Industrial Paver 80mm</TableCell>
                    <TableCell>Paving Stones</TableCell>
                    <TableCell className="font-mono">₦4,600.00</TableCell>
                    <TableCell><StatusBadge status="processing" size="sm" /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Inspect</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs text-slate-500">MAT-003</TableCell>
                    <TableCell className="font-semibold">Sandcrete Block 9-Inch</TableCell>
                    <TableCell>Hollow Blocks</TableCell>
                    <TableCell className="font-mono">₦850.00</TableCell>
                    <TableCell><StatusBadge status="draft" size="sm" /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Inspect</Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={5}
              onPageChange={setCurrentPage}
            />

            <div className="pt-4 flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
                Trigger Confirmation Dialog
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reusable Modal Dialog */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Sample Modal Dialog"
      >
        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 text-left">
          <p>
            This accessible modal supports focus management, escape-key closure, overlay backdrop clicking, and clean entry transitions.
          </p>
          <FormField label="Batch Confirmation Reference" htmlFor="modal-ref">
            <Input id="modal-ref" placeholder="REF-2026-XF" />
          </FormField>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setModalOpen(false);
                toast.success('Action acknowledged from modal.', 'Modal Confirm');
              }}
            >
              Confirm Action
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reusable Drawer / Sheet */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Side Context Drawer"
      >
        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 text-left">
          <p>
            Reusable side drawer ideal for mobile filter overlays, customer contact details, and contextual edit panes.
          </p>
          <FormField label="Filter By Warehouse Bay" htmlFor="drawer-bay">
            <Select
              id="drawer-bay"
              options={[
                { value: 'bay-a', label: 'Bay A (Curing Yard)' },
                { value: 'bay-b', label: 'Bay B (Hydraulic Press)' },
                { value: 'bay-c', label: 'Bay C (Dispatch Dock)' },
              ]}
            />
          </FormField>
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={() => {
              setDrawerOpen(false);
              toast.info('Applied filters from drawer.', 'Drawer Action');
            }}
          >
            Apply Bay Filter
          </Button>
        </div>
      </Drawer>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          toast.success('Confirmed item deletion safely.', 'Action Confirmed');
        }}
        title="Delete Material Record?"
        message="Are you sure you want to delete this material item? This action will create an immutable audit record in Module 21."
        confirmLabel="Yes, Delete Record"
        variant="danger"
      />
    </div>
  );
};
