import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Package,
  Layers,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Plus,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  FileCheck,
  Building,
  User,
  Phone,
  Printer,
  Calendar,
  ClipboardCheck,
  Eye,
  Store,
  MapPin,
} from 'lucide-react';
import { PageHeader } from '../ui/PageHeader';
import { SearchInput } from '../ui/SearchInput';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import {
  FulfilmentRecord,
  FulfilmentStatus,
  FulfilmentType,
  WarehouseTask,
  WarehouseStats,
  FULFILMENT_STATUS_CONFIG,
  WarehousePriority,
} from '../../types/warehouse';
import { warehouseService, EligibleOrderSummary } from '../../services/warehouse.service';
import { stockLocationRepository } from '../../repositories/stockLocation.repository';
import { StockLocation } from '../../types/inventory';
import { CreateFulfilmentModal } from './CreateFulfilmentModal';
import { FulfilmentDetailModal } from './FulfilmentDetailModal';
import { PickingTaskModal } from './PickingTaskModal';
import { VerificationModal } from './VerificationModal';
import { PackingDispatchModal } from './PackingDispatchModal';
import { ProofOfDeliveryModal } from './ProofOfDeliveryModal';
import { WaybillPrintModal } from './WaybillPrintModal';

export const WarehouseOperationsPanel: React.FC = () => {
  const toast = useToast();
  const { hasPermission } = useAuth();

  // Active top navigation tab
  const [activeTab, setActiveTab] = useState<'fulfilments' | 'tasks' | 'eligible_orders'>('fulfilments');

  // Domain data
  const [fulfilments, setFulfilments] = useState<FulfilmentRecord[]>([]);
  const [tasks, setTasks] = useState<WarehouseTask[]>([]);
  const [eligibleOrders, setEligibleOrders] = useState<EligibleOrderSummary[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [stats, setStats] = useState<WarehouseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FulfilmentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<FulfilmentType | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<WarehousePriority | 'all'>('all');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInitialOrderId, setSelectedInitialOrderId] = useState<string | null>(null);

  const [selectedFulfilment, setSelectedFulfilment] = useState<FulfilmentRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [pickingFulfilment, setPickingFulfilment] = useState<FulfilmentRecord | null>(null);
  const [isPickingOpen, setIsPickingOpen] = useState(false);

  const [verifyFulfilment, setVerifyFulfilment] = useState<FulfilmentRecord | null>(null);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);

  const [packingFulfilment, setPackingFulfilment] = useState<FulfilmentRecord | null>(null);
  const [packModalMode, setPackModalMode] = useState<'pack' | 'dispatch'>('pack');
  const [isPackOpen, setIsPackOpen] = useState(false);

  const [podFulfilment, setPodFulfilment] = useState<FulfilmentRecord | null>(null);
  const [isPodOpen, setIsPodOpen] = useState(false);

  const [waybillFulfilment, setWaybillFulfilment] = useState<FulfilmentRecord | null>(null);
  const [isWaybillOpen, setIsWaybillOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedFulfilments, fetchedTasks, fetchedEligible, fetchedLocs, fetchedStats] =
        await Promise.all([
          warehouseService.getAllFulfilments(),
          warehouseService.getAllTasks(),
          warehouseService.getEligibleOrdersForFulfilment(),
          stockLocationRepository.getAllLocations(),
          warehouseService.getStats(),
        ]);
      setFulfilments(fetchedFulfilments);
      setTasks(fetchedTasks);
      setEligibleOrders(fetchedEligible);
      setLocations(fetchedLocs);
      setStats(fetchedStats);
    } catch (err: any) {
      toast.error('Failed to load warehouse operations data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered fulfilments
  const filteredFulfilments = useMemo(() => {
    return fulfilments.filter((f) => {
      if (statusFilter !== 'all' && f.status !== statusFilter) return false;
      if (typeFilter !== 'all' && f.fulfilmentType !== typeFilter) return false;
      if (locationFilter !== 'all' && f.sourceLocationId !== locationFilter) return false;
      if (priorityFilter !== 'all' && f.priority !== priorityFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matches =
          f.fulfilmentNumber.toLowerCase().includes(term) ||
          f.orderNumber.toLowerCase().includes(term) ||
          f.customerName.toLowerCase().includes(term) ||
          f.customerPhone.toLowerCase().includes(term) ||
          (f.destinationAddress && f.destinationAddress.toLowerCase().includes(term)) ||
          (f.packageDetails?.waybillNumber && f.packageDetails.waybillNumber.toLowerCase().includes(term));
        if (!matches) return false;
      }
      return true;
    });
  }, [fulfilments, statusFilter, typeFilter, locationFilter, priorityFilter, searchTerm]);

  const handleOpenDetail = (f: FulfilmentRecord) => {
    setSelectedFulfilment(f);
    setIsDetailOpen(true);
  };

  const handleFulfilmentUpdated = (updated: FulfilmentRecord) => {
    setFulfilments((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    if (selectedFulfilment?.id === updated.id) {
      setSelectedFulfilment(updated);
    }
    warehouseService.getStats().then(setStats).catch(() => {});
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Warehouse & Delivery Operations"
        description="Physical order fulfilment, stock allocation, yard picking, crate packing, truck dispatch, and site Proof of Delivery."
        primaryAction={
          <Button
            size="sm"
            onClick={() => {
              setSelectedInitialOrderId(null);
              setIsCreateOpen(true);
            }}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Initiate Fulfilment</span>
          </Button>
        }
        secondaryActions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh Yard</span>
          </Button>
        }
      />

      {/* Metrics Banner */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Shipments</span>
              <Truck className="h-4 w-4 text-orange-600" />
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {stats.totalFulfilments}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">All yard consignments</p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">In Picking / Yard</span>
              <Package className="h-4 w-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-amber-600">
              {stats.inPicking}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Allocated & loaders active</p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Staged on Docks</span>
              <FileCheck className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-indigo-600">
              {stats.readyForDispatch}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Palletized & waybill ready</p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">In Transit Fleet</span>
              <Truck className="h-4 w-4 text-blue-500" />
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-blue-600">
              {stats.inTransit}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">En route to site</p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Delivered / Signed</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-emerald-600">
              {stats.delivered}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">POD confirmed</p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Tasks</span>
              <Clock className="h-4 w-4 text-purple-500" />
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-purple-600">
              {stats.openTasks}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Yard loader assignments</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 text-xs font-semibold overflow-x-auto whitespace-nowrap scrollbar-none pb-0.5">
        <button
          type="button"
          onClick={() => setActiveTab('fulfilments')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'fulfilments'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>Fulfilment Shipments ({fulfilments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'tasks'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ClipboardCheck className="h-4 w-4" />
          <span>Yard Tasks Queue ({tasks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('eligible_orders')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'eligible_orders'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Store className="h-4 w-4" />
          <span>Confirmed Orders Ready for Fulfilment ({eligibleOrders.length})</span>
        </button>
      </div>

      {/* Tab 1: Fulfilment Shipments */}
      {activeTab === 'fulfilments' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-[260px]">
              <SearchInput
                value={searchTerm}
                onChange={(val) => setSearchTerm(val)}
                placeholder="Search by Fulfilment #, Order #, Waybill #, Customer name, Phone, or Site..."
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="allocated">Allocated</option>
                <option value="picking">Picking</option>
                <option value="picked">Picked</option>
                <option value="verified">Verified</option>
                <option value="ready_for_dispatch">Ready for Dispatch</option>
                <option value="dispatched">Dispatched</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered (POD)</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              >
                <option value="all">All Methods</option>
                <option value="delivery">Site Delivery</option>
                <option value="pickup">Customer Pickup</option>
              </select>

              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              >
                <option value="all">All Yards</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
                <option value="normal">Normal</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredFulfilments.length === 0 ? (
            <EmptyState
              title="No fulfilments found"
              description="No warehouse fulfilment shipments match the current filters or none have been initiated."
              actionLabel="Initiate First Fulfilment"
              onAction={() => setIsCreateOpen(true)}
            />
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3">Fulfilment #</th>
                    <th className="p-3">Order Ref</th>
                    <th className="p-3">Consignee / Site</th>
                    <th className="p-3">Method</th>
                    <th className="p-3 text-center">Items</th>
                    <th className="p-3">Yard Depot</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredFulfilments.map((f) => {
                    const statusCfg = FULFILMENT_STATUS_CONFIG[f.status];
                    const totalUnits = f.items.reduce((s, it) => s + it.allocatedQuantity, 0);

                    return (
                      <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(f)}
                            className="font-mono font-bold text-orange-600 hover:underline block text-left"
                          >
                            {f.fulfilmentNumber}
                          </button>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(f.createdAt).toLocaleDateString()}
                          </span>
                        </td>

                        <td className="p-3">
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            #{f.orderNumber}
                          </span>
                          {f.priority !== 'normal' && (
                            <span className="block text-[9px] font-bold uppercase text-amber-600">
                              {f.priority}
                            </span>
                          )}
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {f.customerName}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                            {f.fulfilmentType === 'pickup'
                              ? '[Customer Self-Pickup]'
                              : f.destinationAddress || 'Site on record'}
                          </div>
                        </td>

                        <td className="p-3">
                          <Badge variant="outline" size="sm" className="capitalize">
                            {f.fulfilmentType === 'delivery' ? 'Site Haulage' : 'Yard Pickup'}
                          </Badge>
                        </td>

                        <td className="p-3 text-center">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {totalUnits.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {f.items.length} line(s)
                          </span>
                        </td>

                        <td className="p-3">
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            {f.sourceLocationName}
                          </span>
                          {f.packageDetails?.waybillNumber && (
                            <span className="block font-mono text-[10px] text-indigo-600 font-semibold">
                              {f.packageDetails.waybillNumber}
                            </span>
                          )}
                        </td>

                        <td className="p-3">
                          <Badge variant={statusCfg.badgeVariant} size="sm">
                            {statusCfg.label}
                          </Badge>
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDetail(f)}
                              className="text-xs px-2 py-1"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View
                            </Button>

                            {f.status === 'allocated' || f.status === 'picking' ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setPickingFulfilment(f);
                                  setIsPickingOpen(true);
                                }}
                                className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-2 py-1 font-semibold"
                              >
                                Pick
                              </Button>
                            ) : null}

                            {f.status === 'picked' ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setVerifyFulfilment(f);
                                  setIsVerifyOpen(true);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-2 py-1 font-semibold"
                              >
                                Verify
                              </Button>
                            ) : null}

                            {f.status === 'verified' ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setPackingFulfilment(f);
                                  setPackModalMode('pack');
                                  setIsPackOpen(true);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-2 py-1 font-semibold"
                              >
                                Pack
                              </Button>
                            ) : null}

                            {f.status === 'ready_for_dispatch' ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setPackingFulfilment(f);
                                  setPackModalMode('dispatch');
                                  setIsPackOpen(true);
                                }}
                                className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-2 py-1 font-semibold"
                              >
                                Dispatch
                              </Button>
                            ) : null}

                            {f.status === 'dispatched' || f.status === 'in_transit' ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setPodFulfilment(f);
                                  setIsPodOpen(true);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2 py-1 font-semibold"
                              >
                                POD
                              </Button>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => {
                                setWaybillFulfilment(f);
                                setIsWaybillOpen(true);
                              }}
                              title="Print Official Delivery Waybill"
                              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Warehouse Tasks Queue */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg text-purple-900 dark:text-purple-200 text-xs flex justify-between items-center">
            <span>
              Warehouse task tickets are generated automatically from active fulfilments to direct yard loaders and forklift operators.
            </span>
            <span className="font-bold">{tasks.length} Task(s) logged</span>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">Task #</th>
                  <th className="p-3">Fulfilment Ref</th>
                  <th className="p-3">Task Type</th>
                  <th className="p-3">Yard Depot</th>
                  <th className="p-3 text-center">Total Units</th>
                  <th className="p-3">Assigned Staff</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                      {task.taskNumber}
                    </td>
                    <td className="p-3 font-mono text-orange-600 font-semibold">
                      {task.fulfilmentNumber}
                    </td>
                    <td className="p-3 uppercase font-bold text-[10px] text-slate-700 dark:text-slate-300">
                      {task.taskType}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      {task.stockLocationName}
                    </td>
                    <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-200">
                      {task.totalUnits.toLocaleString()}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {task.assignedStaffName || 'Unassigned Loader'}
                    </td>
                    <td className="p-3">
                      <span className="uppercase text-[9px] font-bold text-amber-600">
                        {task.priority}
                      </span>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          task.status === 'completed'
                            ? 'success'
                            : task.status === 'in_progress'
                            ? 'warning'
                            : 'outline'
                        }
                        size="sm"
                        className="capitalize"
                      >
                        {task.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      {task.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const targetFulfilment = fulfilments.find((f) => f.id === task.fulfilmentId);
                            if (targetFulfilment) {
                              setPickingFulfilment(targetFulfilment);
                              setIsPickingOpen(true);
                            }
                          }}
                          className="text-xs"
                        >
                          Execute Task
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Confirmed Orders Ready for Fulfilment */}
      {activeTab === 'eligible_orders' && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg text-blue-900 dark:text-blue-200 text-xs flex justify-between items-center">
            <span>
              Confirmed, paid, or authorized sales orders that contain physical manufacturing products waiting for dispatch.
            </span>
            <span className="font-bold">{eligibleOrders.length} Order(s) Eligible</span>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">Order #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Customer / Site</th>
                  <th className="p-3">Order Status</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3 text-center">Ordered Qty</th>
                  <th className="p-3 text-center">Unfulfilled Units</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {eligibleOrders.map(({ order, totalOrderedQuantity, totalRemainingQuantity }) => (
                  <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                      #{order.orderNumber}
                    </td>
                    <td className="p-3 text-slate-500">{order.orderDate}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-white">{order.customerName}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                        {order.deliveryAddress || 'Self-Pickup'}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="primary" size="sm" className="capitalize">
                        {order.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="success" size="sm" className="capitalize">
                        {order.paymentStatus}
                      </Badge>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-700 dark:text-slate-300">
                      {totalOrderedQuantity.toLocaleString()}
                    </td>
                    <td className="p-3 text-center font-bold text-orange-600">
                      {totalRemainingQuantity.toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedInitialOrderId(order.id);
                          setIsCreateOpen(true);
                        }}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs"
                      >
                        Prepare Fulfilment
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateFulfilmentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        initialOrderId={selectedInitialOrderId}
        onFulfilmentCreated={(created) => {
          setFulfilments((prev) => [created, ...prev]);
          loadData();
        }}
      />

      <FulfilmentDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        fulfilment={selectedFulfilment}
        onOpenPicking={(f) => {
          setPickingFulfilment(f);
          setIsPickingOpen(true);
        }}
        onOpenVerify={(f) => {
          setVerifyFulfilment(f);
          setIsVerifyOpen(true);
        }}
        onOpenPack={(f) => {
          setPackingFulfilment(f);
          setPackModalMode('pack');
          setIsPackOpen(true);
        }}
        onOpenDispatch={(f) => {
          setPackingFulfilment(f);
          setPackModalMode('dispatch');
          setIsPackOpen(true);
        }}
        onOpenPOD={(f) => {
          setPodFulfilment(f);
          setIsPodOpen(true);
        }}
        onOpenPrintWaybill={(f) => {
          setWaybillFulfilment(f);
          setIsWaybillOpen(true);
        }}
        onFulfilmentUpdated={handleFulfilmentUpdated}
      />

      <PickingTaskModal
        isOpen={isPickingOpen}
        onClose={() => setIsPickingOpen(false)}
        fulfilment={pickingFulfilment}
        onFulfilmentUpdated={handleFulfilmentUpdated}
      />

      <VerificationModal
        isOpen={isVerifyOpen}
        onClose={() => setIsVerifyOpen(false)}
        fulfilment={verifyFulfilment}
        onFulfilmentUpdated={handleFulfilmentUpdated}
      />

      <PackingDispatchModal
        isOpen={isPackOpen}
        onClose={() => setIsPackOpen(false)}
        fulfilment={packingFulfilment}
        mode={packModalMode}
        onFulfilmentUpdated={handleFulfilmentUpdated}
      />

      <ProofOfDeliveryModal
        isOpen={isPodOpen}
        onClose={() => setIsPodOpen(false)}
        fulfilment={podFulfilment}
        onFulfilmentUpdated={handleFulfilmentUpdated}
      />

      <WaybillPrintModal
        isOpen={isWaybillOpen}
        onClose={() => setIsWaybillOpen(false)}
        fulfilment={waybillFulfilment}
      />
    </div>
  );
};
