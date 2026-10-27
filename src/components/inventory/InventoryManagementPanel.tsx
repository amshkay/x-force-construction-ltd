/**
 * Inventory Management Master Panel
 * Module 11 — Inventory & Stock Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Primary administrative hub for physical inventory across multiple locations,
 * atomic stock movements, threshold alerts, valuation reporting, and CSV import/export.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Layers,
  Warehouse,
  AlertTriangle,
  History,
  Download,
  Upload,
  RefreshCw,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  Sparkles,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  ExternalLink,
  Edit2,
  Power,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SearchInput } from '../ui/SearchInput';
import { EmptyState } from '../ui/EmptyState';
import { inventoryService } from '../../services/inventory.service';
import { stockLocationRepository } from '../../repositories/stockLocation.repository';
import { productRepository } from '../../repositories/product.repository';
import { useAuth } from '../../context/AuthContext';
import { PERMISSION_CODES } from '../../types/auth';
import {
  InventoryItem,
  InventoryStats,
  StockMovement,
  StockLocation,
  StockStatus,
  StockMovementType,
  MOVEMENT_TYPE_CONFIG,
  STOCK_STATUS_CONFIG,
} from '../../types/inventory';
import { ProductCategory } from '../../types/product';
import { formatDate } from '../../utils/formatters';

// Modals
import { ReceiveStockModal } from './ReceiveStockModal';
import { IssueStockModal } from './IssueStockModal';
import { TransferStockModal } from './TransferStockModal';
import { AdjustStockModal } from './AdjustStockModal';
import { OpeningStockModal } from './OpeningStockModal';
import { StockLocationModal } from './StockLocationModal';
import { InventoryDetailModal } from './InventoryDetailModal';
import { ImportStockModal } from './ImportStockModal';

export interface InventoryManagementPanelProps {
  onNavigateToStockCount?: (locationId?: string) => void;
}

export const InventoryManagementPanel: React.FC<InventoryManagementPanelProps> = ({
  onNavigateToStockCount,
}) => {
  const { hasPermission } = useAuth();

  // State
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active Tab: 'stock' | 'movements' | 'locations' | 'low_stock'
  const [activeTab, setActiveTab] = useState<'stock' | 'movements' | 'locations' | 'low_stock'>('stock');

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<StockStatus | 'all'>('all');

  // Movement Filters
  const [movementSearchQuery, setMovementSearchQuery] = useState<string>('');
  const [movementTypeFilter, setMovementTypeFilter] = useState<StockMovementType | 'all'>('all');

  // Modals state
  const [isReceiveOpen, setIsReceiveOpen] = useState<boolean>(false);
  const [isIssueOpen, setIsIssueOpen] = useState<boolean>(false);
  const [isTransferOpen, setIsTransferOpen] = useState<boolean>(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState<boolean>(false);
  const [isOpeningOpen, setIsOpeningOpen] = useState<boolean>(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [locationToEdit, setLocationToEdit] = useState<StockLocation | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [selectedItemForAction, setSelectedItemForAction] = useState<InventoryItem | null>(null);
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [itemsData, statsData, movementsData, locsData, catsRes] = await Promise.all([
        inventoryService.getInventoryItems(),
        inventoryService.getInventoryStats(),
        inventoryService.getStockMovements(),
        stockLocationRepository.getAllLocations(),
        productRepository.getAllCategories(),
      ]);

      setItems(itemsData);
      setStats(statsData);
      setMovements(movementsData);
      setLocations(locsData);
      setCategories(catsRes || []);
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered Stock Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeTab === 'low_stock' && item.status === 'in_stock') {
        return false;
      }

      if (selectedLocationId !== 'all' && item.locationId !== selectedLocationId) {
        return false;
      }

      if (selectedStatus !== 'all' && item.status !== selectedStatus) {
        return false;
      }

      if (selectedCategoryId !== 'all') {
        // Find category for item
        const cat = categories.find((c) => c.name === item.categoryName);
        if (cat && cat.id !== selectedCategoryId) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          item.productName.toLowerCase().includes(q) ||
          (item.variantName && item.variantName.toLowerCase().includes(q)) ||
          item.sku.toLowerCase().includes(q) ||
          item.locationName.toLowerCase().includes(q) ||
          item.locationCode.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [items, activeTab, selectedLocationId, selectedStatus, selectedCategoryId, searchQuery, categories]);

  // Filtered Movements
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (movementTypeFilter !== 'all' && m.movementType !== movementTypeFilter) {
        return false;
      }

      if (movementSearchQuery.trim()) {
        const q = movementSearchQuery.toLowerCase().trim();
        const matches =
          m.movementNumber.toLowerCase().includes(q) ||
          m.productName.toLowerCase().includes(q) ||
          (m.variantName && m.variantName.toLowerCase().includes(q)) ||
          m.sku.toLowerCase().includes(q) ||
          (m.reason && m.reason.toLowerCase().includes(q)) ||
          (m.notes && m.notes.toLowerCase().includes(q)) ||
          (m.sourceLocationName && m.sourceLocationName.toLowerCase().includes(q)) ||
          (m.destinationLocationName && m.destinationLocationName.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [movements, movementTypeFilter, movementSearchQuery]);

  const handleExportCsv = async () => {
    try {
      const csv = await inventoryService.exportInventoryCsv();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `xforce_inventory_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleToggleLocationActive = async (locId: string) => {
    try {
      await stockLocationRepository.toggleActive(locId);
      await loadData();
    } catch (err) {
      console.error('Failed to toggle location:', err);
    }
  };

  const handleSetDefaultLocation = async (locId: string) => {
    try {
      await stockLocationRepository.setDefault(locId);
      await loadData();
    } catch (err) {
      console.error('Failed to set default location:', err);
    }
  };

  return (
    <div className="space-y-6 text-left" id="inventory-management-panel">
      {/* Page Header */}
      <PageHeader
        title="Physical Inventory & Stock Management"
        description="Monitor physical stock across manufacturing yards, curing sheds, and showrooms. Track traceable movements, adjustments, and reorder levels."
        primaryAction={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={handleExportCsv}
            >
              Export CSV
            </Button>

            {hasPermission(PERMISSION_CODES.INVENTORY_RECEIVE) && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Upload className="h-4 w-4" />}
                onClick={() => setIsImportOpen(true)}
              >
                Import CSV
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={loadData}
              disabled={isLoading}
            >
              Refresh
            </Button>

            {hasPermission(PERMISSION_CODES.STOCK_COUNTS_VIEW) && onNavigateToStockCount && (
              <Button
                variant="outline"
                size="sm"
                className="text-orange-700 hover:bg-orange-50 border-orange-200 dark:border-orange-900"
                leftIcon={<ClipboardCheck className="h-4 w-4 text-orange-600" />}
                onClick={() => onNavigateToStockCount()}
              >
                Stock Counts
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Total Products Tracked
              </span>
              <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-orange-600">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">
              {stats.totalItems.toLocaleString()}
            </p>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {stats.totalQuantityOnHand.toLocaleString()} total units on-hand
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                In Stock Items
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-emerald-600 mt-2">
              {stats.inStockCount.toLocaleString()}
            </p>
            <span className="text-[11px] text-slate-500 mt-1 block">Adequate stock levels</span>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                Low Stock Alerts
              </span>
              <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-amber-600 mt-2">
              {stats.lowStockCount.toLocaleString()}
            </p>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 block">
              Requires batch scheduling
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                Out of Stock
              </span>
              <div className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600">
                <XCircle className="h-4 w-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-rose-600 mt-2">
              {stats.outOfStockCount.toLocaleString()}
            </p>
            <span className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 block">
              0 units available
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                Total Valuation
              </span>
              <div className="h-8 w-8 rounded-lg bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-2 truncate">
              ₦{stats.totalValuation.toLocaleString()}
            </p>
            <span className="text-[11px] text-slate-500 mt-1 block">Based on unit costs</span>
          </div>
        </div>
      )}

      {/* Primary Action Button Bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2 hidden sm:inline">
          Inventory Actions:
        </span>

        {hasPermission(PERMISSION_CODES.INVENTORY_RECEIVE) && (
          <Button
            size="sm"
            variant="primary"
            leftIcon={<ArrowDownRight className="h-4 w-4" />}
            onClick={() => {
              setSelectedItemForAction(null);
              setIsReceiveOpen(true);
            }}
          >
            Receive Stock
          </Button>
        )}

        {hasPermission(PERMISSION_CODES.INVENTORY_ISSUE) && (
          <Button
            size="sm"
            variant="outline"
            className="text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900"
            leftIcon={<ArrowUpRight className="h-4 w-4" />}
            onClick={() => {
              setSelectedItemForAction(null);
              setIsIssueOpen(true);
            }}
          >
            Issue Stock
          </Button>
        )}

        {hasPermission(PERMISSION_CODES.INVENTORY_TRANSFER) && (
          <Button
            size="sm"
            variant="outline"
            className="text-amber-700 hover:bg-amber-50 border-amber-200 dark:border-amber-900"
            leftIcon={<ArrowLeftRight className="h-4 w-4" />}
            onClick={() => {
              setSelectedItemForAction(null);
              setIsTransferOpen(true);
            }}
          >
            Transfer Stock
          </Button>
        )}

        {hasPermission(PERMISSION_CODES.INVENTORY_ADJUST) && (
          <Button
            size="sm"
            variant="outline"
            className="text-sky-700 hover:bg-sky-50 border-sky-200 dark:border-sky-900"
            leftIcon={<SlidersHorizontal className="h-4 w-4" />}
            onClick={() => {
              setSelectedItemForAction(null);
              setIsAdjustOpen(true);
            }}
          >
            Adjust Count
          </Button>
        )}

        {hasPermission(PERMISSION_CODES.INVENTORY_RECEIVE) && (
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Sparkles className="h-4 w-4 text-indigo-500" />}
            onClick={() => {
              setSelectedItemForAction(null);
              setIsOpeningOpen(true);
            }}
          >
            Opening Balance
          </Button>
        )}

        {hasPermission(PERMISSION_CODES.INVENTORY_MANAGE_LOCATIONS) && (
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Warehouse className="h-4 w-4 text-orange-600" />}
            onClick={() => {
              setLocationToEdit(null);
              setIsLocationModalOpen(true);
            }}
          >
            Add Location
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'stock'
              ? 'border-orange-600 text-orange-600 dark:text-orange-500'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>All Stock Balances ({items.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('low_stock')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'low_stock'
              ? 'border-orange-600 text-orange-600 dark:text-orange-500'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span>
            Low Stock Alerts (
            {items.filter((i) => i.status === 'low_stock' || i.status === 'out_of_stock').length}
            )
          </span>
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'movements'
              ? 'border-orange-600 text-orange-600 dark:text-orange-500'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Movement History ({movements.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('locations')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'locations'
              ? 'border-orange-600 text-orange-600 dark:text-orange-500'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Warehouse className="h-4 w-4" />
          <span>Stock Locations ({locations.length})</span>
        </button>
      </div>

      {/* Tab 1 & Tab 2: Stock List & Low Stock Views */}
      {(activeTab === 'stock' || activeTab === 'low_stock') && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <SearchInput
                placeholder="Search products, variants, SKUs..."
                value={searchQuery}
                onChange={(val) => setSearchQuery(val)}
              />

              <div>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value="all">All Storage Locations</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} [{loc.code}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value="all">All Material Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {activeTab === 'stock' && (
                <div>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as StockStatus | 'all')}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="all">All Stock Statuses</option>
                    <option value="in_stock">In Stock (Adequate)</option>
                    <option value="low_stock">Low Stock (Alert)</option>
                    <option value="out_of_stock">Out of Stock (Depleted)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="py-16 text-center text-xs text-slate-500">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-orange-600 mb-2" />
                Calculating inventory balances...
              </div>
            ) : filteredItems.length === 0 ? (
              <EmptyState
                icon={<Package className="h-10 w-10 text-slate-400" />}
                title="No Inventory Records Found"
                description={
                  searchQuery || selectedLocationId !== 'all' || selectedStatus !== 'all'
                    ? 'No stock items match your filter criteria. Try clearing search filters.'
                    : 'No physical stock recorded yet. Use Receive Stock or Opening Balance to enter stock.'
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-4">Product & Variant</th>
                      <th className="p-4">SKU</th>
                      <th className="p-4">Location</th>
                      <th className="p-4 text-right">On Hand</th>
                      <th className="p-4 text-right">Reserved</th>
                      <th className="p-4 text-right">Available</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Valuation</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredItems.map((item) => {
                      const statusCfg = STOCK_STATUS_CONFIG[item.status];

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="p-4">
                            <span className="font-semibold text-slate-900 dark:text-white block">
                              {item.productName}
                            </span>
                            {item.variantName ? (
                              <span className="text-[11px] text-orange-600 dark:text-orange-400 font-medium">
                                Variant: {item.variantName}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Standard Base Unit</span>
                            )}
                          </td>

                          <td className="p-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                            {item.sku}
                          </td>

                          <td className="p-4">
                            <span className="font-medium text-slate-900 dark:text-white block">
                              {item.locationName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              [{item.locationCode}]
                            </span>
                          </td>

                          <td className="p-4 text-right font-semibold text-slate-900 dark:text-white">
                            {item.quantityOnHand.toLocaleString()} {item.unit}
                          </td>

                          <td className="p-4 text-right font-medium text-amber-600 dark:text-amber-400">
                            {item.quantityReserved.toLocaleString()} {item.unit}
                          </td>

                          <td className="p-4 text-right font-bold">
                            <span
                              className={
                                item.quantityAvailable > 0 ? 'text-emerald-600' : 'text-rose-600'
                              }
                            >
                              {item.quantityAvailable.toLocaleString()} {item.unit}
                            </span>
                          </td>

                          <td className="p-4">
                            <Badge variant={statusCfg.badgeVariant} size="sm">
                              {statusCfg.label}
                            </Badge>
                          </td>

                          <td className="p-4 text-right font-medium text-slate-900 dark:text-white">
                            ₦{item.totalValuation.toLocaleString()}
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={<Eye className="h-3.5 w-3.5" />}
                                onClick={() => {
                                  setSelectedItemForAction(item);
                                  setIsDetailOpen(true);
                                }}
                              >
                                View
                              </Button>

                              {hasPermission(PERMISSION_CODES.INVENTORY_RECEIVE) && (
                                <button
                                  title="Receive Stock"
                                  onClick={() => {
                                    setSelectedItemForAction(item);
                                    setIsReceiveOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 transition-colors"
                                >
                                  <ArrowDownRight className="h-4 w-4" />
                                </button>
                              )}

                              {hasPermission(PERMISSION_CODES.INVENTORY_ISSUE) && (
                                <button
                                  title="Issue Stock"
                                  onClick={() => {
                                    setSelectedItemForAction(item);
                                    setIsIssueOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition-colors"
                                >
                                  <ArrowUpRight className="h-4 w-4" />
                                </button>
                              )}

                              {hasPermission(PERMISSION_CODES.INVENTORY_TRANSFER) && (
                                <button
                                  title="Transfer Stock"
                                  onClick={() => {
                                    setSelectedItemForAction(item);
                                    setIsTransferOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 transition-colors"
                                >
                                  <ArrowLeftRight className="h-4 w-4" />
                                </button>
                              )}

                              {hasPermission(PERMISSION_CODES.INVENTORY_ADJUST) && (
                                <button
                                  title="Adjust Count"
                                  onClick={() => {
                                    setSelectedItemForAction(item);
                                    setIsAdjustOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-600 transition-colors"
                                >
                                  <SlidersHorizontal className="h-4 w-4" />
                                </button>
                              )}
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
        </div>
      )}

      {/* Tab 3: Stock Movement Audit History */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <SearchInput
                placeholder="Search by ref #, SKU, reason, or location..."
                value={movementSearchQuery}
                onChange={(val) => setMovementSearchQuery(val)}
              />

              <div>
                <select
                  value={movementTypeFilter}
                  onChange={(e) => setMovementTypeFilter(e.target.value as StockMovementType | 'all')}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value="all">All Movement Types</option>
                  <option value="opening_balance">Opening Balance</option>
                  <option value="received">Stock Receipt</option>
                  <option value="issued">Stock Issue</option>
                  <option value="transfer">Internal Transfer</option>
                  <option value="adjustment">Inventory Adjustment</option>
                  <option value="wastage">Waste / Scrap</option>
                  <option value="return">Customer Return</option>
                  <option value="damaged">Damaged Stock</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="py-16 text-center text-xs text-slate-500">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-orange-600 mb-2" />
                Loading stock movements ledger...
              </div>
            ) : filteredMovements.length === 0 ? (
              <EmptyState
                icon={<History className="h-10 w-10 text-slate-400" />}
                title="No Movement Records Found"
                description="No stock movements match the filter criteria."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-4">Movement #</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Product / Variant</th>
                      <th className="p-4">Route / Location</th>
                      <th className="p-4 text-right">Quantity</th>
                      <th className="p-4">Reason / Notes</th>
                      <th className="p-4">Performed By</th>
                      <th className="p-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredMovements.map((m) => {
                      const cfg = MOVEMENT_TYPE_CONFIG[m.movementType] || {
                        label: m.movementType,
                        badgeVariant: 'default',
                        isIncrease: null,
                      };

                      return (
                        <tr
                          key={m.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="p-4 font-mono font-semibold text-[11px] text-slate-900 dark:text-white">
                            {m.movementNumber}
                          </td>

                          <td className="p-4">
                            <Badge variant={cfg.badgeVariant} size="sm">
                              {cfg.label}
                            </Badge>
                          </td>

                          <td className="p-4">
                            <span className="font-semibold text-slate-900 dark:text-white block">
                              {m.productName}
                            </span>
                            {m.variantName && (
                              <span className="text-[11px] text-orange-600 block">
                                {m.variantName}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">{m.sku}</span>
                          </td>

                          <td className="p-4">
                            {m.movementType === 'transfer' ? (
                              <span className="text-xs text-slate-800 dark:text-slate-200 font-medium flex items-center gap-1">
                                {m.sourceLocationName} <ChevronRight className="h-3.5 w-3.5 text-slate-400" />{' '}
                                {m.destinationLocationName}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-700 dark:text-slate-300">
                                {m.destinationLocationName || m.sourceLocationName || '—'}
                              </span>
                            )}
                          </td>

                          <td className="p-4 text-right font-bold text-slate-900 dark:text-white">
                            {cfg.isIncrease === true && <span className="text-emerald-600">+</span>}
                            {cfg.isIncrease === false && <span className="text-rose-600">-</span>}
                            {m.quantity.toLocaleString()} {m.unit}
                          </td>

                          <td className="p-4 max-w-xs text-slate-600 dark:text-slate-400 truncate">
                            {m.reason}
                            {m.notes && <span className="block text-[10px] text-slate-500 italic">{m.notes}</span>}
                          </td>

                          <td className="p-4 text-slate-600 dark:text-slate-400">
                            {m.performedByName}
                          </td>

                          <td className="p-4 text-slate-500 whitespace-nowrap">
                            {formatDate(m.createdAt, 'medium')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Stock Locations Management */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Manage configured physical manufacturing yards, curing bays, and retail showrooms.
            </p>
            {hasPermission(PERMISSION_CODES.INVENTORY_MANAGE_LOCATIONS) && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setLocationToEdit(null);
                  setIsLocationModalOpen(true);
                }}
              >
                Add Storage Location
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.map((loc) => {
              const locationItems = items.filter((i) => i.locationId === loc.id);
              const totalLocationStock = locationItems.reduce((acc, i) => acc + i.quantityOnHand, 0);
              const totalLocationValuation = locationItems.reduce((acc, i) => acc + i.totalValuation, 0);

              return (
                <div
                  key={loc.id}
                  className={`rounded-2xl border p-5 shadow-sm transition-all ${
                    loc.isActive
                      ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {loc.name}
                        </h4>
                        {loc.isDefault && (
                          <Badge variant="info" size="sm">
                            Default
                          </Badge>
                        )}
                      </div>
                      <span className="font-mono text-xs text-orange-600 font-semibold block mt-0.5">
                        Code: {loc.code}
                      </span>
                    </div>

                    <Badge variant={loc.isActive ? 'success' : 'default'} size="sm">
                      {loc.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  {loc.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                      {loc.description}
                    </p>
                  )}

                  {loc.address && (
                    <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
                      <Warehouse className="h-3.5 w-3.5 shrink-0" />
                      <span>{loc.address}</span>
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">
                        Stock Items
                      </span>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {locationItems.length} SKUs
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">
                        Total Units
                      </span>
                      <p className="text-sm font-bold text-emerald-600">
                        {totalLocationStock.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {hasPermission(PERMISSION_CODES.INVENTORY_MANAGE_LOCATIONS) && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        {!loc.isDefault && loc.isActive && (
                          <button
                            onClick={() => handleSetDefaultLocation(loc.id)}
                            className="text-[11px] text-orange-600 hover:underline font-medium"
                          >
                            Set Default
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {hasPermission(PERMISSION_CODES.STOCK_COUNTS_CREATE) && onNavigateToStockCount && (
                          <button
                            title="Start Physical Stock Count for Location"
                            onClick={() => onNavigateToStockCount(loc.id)}
                            className="p-1.5 rounded-lg text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40"
                          >
                            <ClipboardCheck className="h-4 w-4" />
                          </button>
                        )}

                        <button
                          title="Edit Location"
                          onClick={() => {
                            setLocationToEdit(loc);
                            setIsLocationModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        <button
                          title={loc.isActive ? 'Deactivate' : 'Activate'}
                          onClick={() => handleToggleLocationActive(loc.id)}
                          className={`p-1.5 rounded-lg ${
                            loc.isActive
                              ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                              : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          }`}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <ReceiveStockModal
        isOpen={isReceiveOpen}
        onClose={() => setIsReceiveOpen(false)}
        onSuccess={loadData}
        initialItem={selectedItemForAction}
      />

      <IssueStockModal
        isOpen={isIssueOpen}
        onClose={() => setIsIssueOpen(false)}
        onSuccess={loadData}
        initialItem={selectedItemForAction}
      />

      <TransferStockModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        onSuccess={loadData}
        initialItem={selectedItemForAction}
      />

      <AdjustStockModal
        isOpen={isAdjustOpen}
        onClose={() => setIsAdjustOpen(false)}
        onSuccess={loadData}
        initialItem={selectedItemForAction}
      />

      <OpeningStockModal
        isOpen={isOpeningOpen}
        onClose={() => setIsOpeningOpen(false)}
        onSuccess={loadData}
        initialItem={selectedItemForAction}
      />

      <StockLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSuccess={loadData}
        locationToEdit={locationToEdit}
      />

      <InventoryDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        item={selectedItemForAction}
        onReceive={(it) => {
          setSelectedItemForAction(it);
          setIsReceiveOpen(true);
        }}
        onIssue={(it) => {
          setSelectedItemForAction(it);
          setIsIssueOpen(true);
        }}
        onTransfer={(it) => {
          setSelectedItemForAction(it);
          setIsTransferOpen(true);
        }}
        onAdjust={(it) => {
          setSelectedItemForAction(it);
          setIsAdjustOpen(true);
        }}
        onUpdated={loadData}
      />

      <ImportStockModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};
