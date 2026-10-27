/**
 * Import Stock Modal
 * Module 11 — Inventory & Stock Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Facilitates bulk physical stock onboarding via structured CSV data.
 * Strictly validates SKUs and locations against catalogue records before applying balances.
 */

import React, { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download, RefreshCw } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { inventoryService } from '../../services/inventory.service';
import { useAuth } from '../../context/AuthContext';
import { StockImportRow, StockImportResult } from '../../types/inventory';

interface ImportStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportStockModal: React.FC<ImportStockModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { profile, currentUser } = useAuth();
  const [csvText, setCsvText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<StockImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sampleCsv = `SKU,LocationCode,Quantity,UnitCost,Notes
XF-BRK-STD-01-RED,WH-MAIN,10000,280,Main factory cured stack A1
XF-BRK-STD-01-RED,SHOWROOM,500,280,Display sample floor stock
XF-PAV-ZIG-RED,WH-MAIN,5000,320,Kiln yard pallet stack B4`;

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'xforce_opening_stock_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePasteSample = () => {
    setCsvText(sampleCsv);
    setResult(null);
    setError(null);
  };

  const parseCsv = (text: string): StockImportRow[] => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      throw new Error('CSV must contain a header row and at least one data row.');
    }

    const header = lines[0].toLowerCase();
    if (!header.includes('sku') || !header.includes('location')) {
      throw new Error("CSV header must contain 'SKU' and 'LocationCode' columns.");
    }

    const rows: StockImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
      if (parts.length < 3) continue;

      const [sku, locCode, qtyStr, unitCostStr, notesStr] = parts;
      const qty = parseFloat(qtyStr);
      const unitCost = unitCostStr ? parseFloat(unitCostStr) : undefined;

      rows.push({
        productSku: sku,
        variantSku: sku,
        locationCode: locCode,
        quantity: isNaN(qty) ? 0 : qty,
        unitCost: isNaN(unitCost || NaN) ? undefined : unitCost,
        notes: notesStr || 'CSV batch opening stock import',
      });
    }

    return rows;
  };

  const handleImport = async () => {
    if (!csvText.trim()) {
      setError('Please provide CSV data to import.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setResult(null);

      const parsedRows = parseCsv(csvText);
      if (parsedRows.length === 0) {
        throw new Error('No valid stock data rows found to import.');
      }

      const res = await inventoryService.importStockBatch(
        parsedRows,
        profile?.id || currentUser?.id || 'system-user',
        profile?.full_name || profile?.email || 'Authorized Officer'
      );

      setResult(res);

      if (res.successfulRows > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Import failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-600">
            <Upload className="h-5 w-5" />
          </div>
          <span>Import Physical Stock (CSV)</span>
        </div>
      }
      description="Quickly onboard existing physical warehouse and showroom stock balances using CSV."
      size="lg"
    >
      <div className="space-y-4 text-left">
        {/* Helper Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <FileSpreadsheet className="h-4 w-4 text-orange-600 shrink-0" />
            <span>Format: <code>SKU, LocationCode, Quantity, [UnitCost], [Notes]</code></span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="h-3.5 w-3.5" />}
              onClick={handleDownloadSample}
            >
              Download Template
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePasteSample}
            >
              Paste Sample Data
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-2 ${
              result.failedRows === 0
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>
                Processed {result.totalRows} rows: {result.successfulRows} succeeded, {result.failedRows} failed.
              </span>
            </div>

            {result.errors.length > 0 && (
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                <span className="font-semibold text-rose-600 dark:text-rose-400 block">
                  Errors discovered:
                </span>
                {result.errors.map((err, idx) => (
                  <p key={idx} className="text-[11px] text-rose-600 dark:text-rose-400">
                    Row {err.row}: {err.error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            CSV Input Data
          </label>
          <textarea
            rows={8}
            placeholder={`SKU,LocationCode,Quantity,UnitCost,Notes\nXF-BRK-STD-01-RED,WH-MAIN,5000,280,Yard batch intake`}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            disabled={isProcessing}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
            {result?.successfulRows ? 'Done' : 'Cancel'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleImport}
            isLoading={isProcessing}
            leftIcon={<Upload className="h-4 w-4" />}
          >
            Process Import
          </Button>
        </div>
      </div>
    </Modal>
  );
};
