/**
 * Stock Location Modal
 * Module 11 — Inventory & Stock Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Creation and configuration of physical storage depots, yards, curing bays, and showrooms.
 */

import React, { useState, useEffect } from 'react';
import { Warehouse, AlertCircle, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { stockLocationRepository } from '../../repositories/stockLocation.repository';
import { StockLocation, StockLocationFormData } from '../../types/inventory';

interface StockLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locationToEdit?: StockLocation | null;
}

export const StockLocationModal: React.FC<StockLocationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  locationToEdit,
}) => {
  const [formData, setFormData] = useState<StockLocationFormData>({
    name: '',
    code: '',
    description: '',
    address: '',
    isActive: true,
    isDefault: false,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (locationToEdit) {
        setFormData({
          name: locationToEdit.name,
          code: locationToEdit.code,
          description: locationToEdit.description || '',
          address: locationToEdit.address || '',
          isActive: locationToEdit.isActive,
          isDefault: locationToEdit.isDefault,
        });
      } else {
        setFormData({
          name: '',
          code: '',
          description: '',
          address: '',
          isActive: true,
          isDefault: false,
        });
      }
      setError(null);
    }
  }, [isOpen, locationToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Location name is required.');
      return;
    }
    if (!formData.code.trim()) {
      setError('Location code is required (e.g. WH-MAIN, SHOWROOM).');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (locationToEdit) {
        await stockLocationRepository.updateLocation(locationToEdit.id, formData);
      } else {
        await stockLocationRepository.createLocation(formData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save stock location.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-600">
            <Warehouse className="h-5 w-5" />
          </div>
          <span>{locationToEdit ? 'Edit Stock Location' : 'New Physical Stock Location'}</span>
        </div>
      }
      description="Configure storage warehouses, manufacturing curing yards, and retail showrooms."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Location Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Secondary Storage Yard B"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isLoading}
              required
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Location Code * (Unique Identifier)
            </label>
            <input
              type="text"
              placeholder="e.g. YARD-02 or SHOWROOM"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              disabled={isLoading}
              required
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Physical Address / Yard Sector
            </label>
            <input
              type="text"
              placeholder="e.g. Emene Industrial Layout, Sector C"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Heavy paver storage, curing sprinkler coverage area..."
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                disabled={isLoading}
                className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300">
                Active Location (available for receiving, issuing & transfers)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                disabled={isLoading}
                className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300">
                Set as Default Stock Location
              </span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isLoading}
            leftIcon={<Check className="h-4 w-4" />}
          >
            {locationToEdit ? 'Save Changes' : 'Create Location'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
