/**
 * Supplier Management Panel
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Dedicated administrative management panel for external raw material,
 * packaging, heavy plant machinery, and fuel utility vendors.
 */

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Phone,
  Package,
  CreditCard,
  Table as TableIcon,
  LayoutGrid,
  Eye,
  Edit,
  UserX,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { Supplier, SupplierFilters, SupplierCategory, SupplierStatus } from '../../types/supplier';
import { supplierService } from '../../services/supplier.service';
import { DEFAULT_SUPPLIER_CATEGORIES } from '../../repositories/supplier.repository';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSION_CODES } from '../../types/auth';
import { useToast } from '../ui/Toast';
import { SupplierDetailModal } from './SupplierDetailModal';
import { CreateSupplierModal } from './CreateSupplierModal';
import { EditSupplierModal } from './EditSupplierModal';
import { DeactivateSupplierModal } from './DeactivateSupplierModal';

export const SupplierManagementPanel: React.FC = () => {
  const { hasPermission, isAdministrator } = useAuth();
  const toast = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<SupplierCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | 'all'>('all');

  // Modal states
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);

  const canManage = isAdministrator() || hasPermission(PERMISSION_CODES.SUPPLIERS_MANAGE);
  const canCreate = isAdministrator() || hasPermission(PERMISSION_CODES.SUPPLIERS_CREATE) || canManage;

  const loadSuppliers = async () => {
    try {
      setIsLoading(true);
      const filters: SupplierFilters = {
        searchQuery: searchQuery.trim() || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };
      const data = await supplierService.getAllSuppliers(filters);
      setSuppliers(data);
    } catch (err: any) {
      toast.error('Error', 'Failed to load suppliers directory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [searchQuery, categoryFilter, statusFilter]);

  const handleExportCSV = () => {
    const csvContent = supplierService.exportSuppliersToCSV(suppliers);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `xforce_suppliers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Export Complete', 'Suppliers list downloaded as CSV.');
  };

  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter((s) => s.status === 'active').length;
  const rawMaterialSuppliers = suppliers.filter((s) => s.category === 'raw_materials').length;
  const suspendedSuppliers = suppliers.filter((s) => s.status === 'suspended').length;

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Vendors */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Vendors
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {totalSuppliers}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Procurement partners</p>
          </div>
          <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        {/* Active Suppliers */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Suppliers
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {activeSuppliers}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Open for intake orders</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Raw Materials Partners */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Raw Materials
            </p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {rawMaterialSuppliers}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Cement, Sand, Dust, Pigments</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Suspended Vendors */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Under Review / Suspended
            </p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {suspendedSuppliers}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Purchases frozen</p>
          </div>
          <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Action Controls & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-orange-600" />
            Suppliers & Material Vendors Directory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            External manufacturers, quarry operators, packaging, equipment, and fuel vendors.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-white dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${
                viewMode === 'table'
                  ? 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded ${
                viewMode === 'cards'
                  ? 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Onboard Vendor
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by vendor name, number, contact, materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          {/* Category filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as SupplierCategory | 'all')}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              <option value="all">All Supply Categories</option>
              {DEFAULT_SUPPLIER_CATEGORIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SupplierStatus | 'all')}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Content */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-orange-600" />
          <p className="text-xs">Loading vendors directory...</p>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <Truck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No suppliers found</p>
          <p className="text-xs text-slate-400 mt-1">Try modifying your filter parameters.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Supplier / Business</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Lead Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {suppliers.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{s.name}</p>
                        <span className="text-[11px] font-mono text-orange-600 dark:text-orange-400 font-medium">
                          {s.supplierNumber}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 capitalize">
                        {s.category.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{s.contactPerson}</p>
                      <a
                        href={`tel:${s.phone}`}
                        className="text-[11px] text-orange-600 dark:text-orange-400 hover:underline"
                      >
                        {s.phone}
                      </a>
                    </td>

                    <td className="py-3 px-4">
                      <p className="text-slate-700 dark:text-slate-300">{s.city}</p>
                      <span className="text-[11px] text-slate-400">{s.state}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-slate-700 dark:text-slate-300">
                        {s.leadTimeDays ? `${s.leadTimeDays} days` : 'On demand'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {s.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      ) : s.status === 'suspended' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSupplier(s);
                            setDetailModalOpen(true);
                          }}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                          title="View Dossier"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSupplier(s);
                                setEditModalOpen(true);
                              }}
                              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-orange-600"
                              title="Edit Supplier"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSupplier(s);
                                setDeactivateModalOpen(true);
                              }}
                              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600"
                              title="Modify Status"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4 hover:border-orange-300 dark:hover:border-orange-900 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{s.name}</h3>
                    <span className="text-[11px] font-mono text-orange-600 dark:text-orange-400 font-semibold">
                      {s.supplierNumber}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {s.category.replace('_', ' ')}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {s.city}, {s.state}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {s.contactPerson} ({s.phone})
                  </p>
                  {s.suppliedItems && s.suppliedItems.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1">
                      {s.suppliedItems.slice(0, 2).map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-700 dark:text-slate-300"
                        >
                          {item}
                        </span>
                      ))}
                      {s.suppliedItems.length > 2 && (
                        <span className="text-[10px] text-slate-400 self-center">
                          +{s.suppliedItems.length - 2} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Lead time: {s.leadTimeDays ? `${s.leadTimeDays}d` : 'On demand'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSupplier(s);
                    setDetailModalOpen(true);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                >
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <SupplierDetailModal
        supplier={selectedSupplier}
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedSupplier(null);
        }}
        onEdit={(supp) => {
          setSelectedSupplier(supp);
          setEditModalOpen(true);
        }}
        onStatusChange={(supp) => {
          setSelectedSupplier(supp);
          setDeactivateModalOpen(true);
        }}
      />

      <CreateSupplierModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={loadSuppliers}
      />

      <EditSupplierModal
        supplier={selectedSupplier}
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedSupplier(null);
        }}
        onSuccess={loadSuppliers}
      />

      <DeactivateSupplierModal
        supplier={selectedSupplier}
        isOpen={deactivateModalOpen}
        onClose={() => {
          setDeactivateModalOpen(false);
          setSelectedSupplier(null);
        }}
        onSuccess={loadSuppliers}
      />
    </div>
  );
};
