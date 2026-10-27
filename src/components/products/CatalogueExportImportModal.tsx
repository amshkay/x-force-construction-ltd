/**
 * Catalogue Data Export & Import Modal
 * Module 06 — Product Catalogue & Product Variants
 *
 * XFORCE Construction Ltd / X-FORCE BRICKS
 * Single-Business Generic Building Materials Architecture
 */

import React, { useState } from 'react';
import {
  Download,
  Upload,
  Copy,
  Check,
  FileText,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { ProductExportData } from '../../types/product';
import { productService } from '../../services/product.service';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { useToast } from '../ui/Toast';

export interface CatalogueExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
  staffUserId: string;
}

export const CatalogueExportImportModal: React.FC<CatalogueExportImportModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
  staffUserId,
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportJson, setExportJson] = useState<string>('');
  const [importJson, setImportJson] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationSummary, setValidationSummary] = useState<string | null>(null);

  // Generate export data on opening or tab switch
  const loadExport = async () => {
    try {
      setIsLoading(true);
      const data = await productService.exportCatalogue();
      setExportJson(JSON.stringify(data, null, 2));
    } catch (err: any) {
      toast.error('Failed to generate export file.');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && activeTab === 'export') {
      loadExport();
    }
  }, [isOpen, activeTab]);

  const handleCopy = () => {
    if (!exportJson) return;
    navigator.clipboard.writeText(exportJson);
    setIsCopied(true);
    toast.success('Catalogue JSON copied to clipboard.');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!exportJson) return;
    const blob = new Blob([exportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xforce-catalogue-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Catalogue export downloaded.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportJson(content);
      validateJson(content);
    };
    reader.readAsText(file);
  };

  const validateJson = (content: string) => {
    setValidationSummary(null);
    try {
      const parsed = JSON.parse(content);
      if (!parsed || !Array.isArray(parsed.products)) {
        setValidationSummary('Invalid format: Root JSON must include a "products" array.');
        return false;
      }
      setValidationSummary(
        `Valid catalogue payload detected: ${parsed.products.length} products, ${
          parsed.categories?.length || 0
        } categories.`
      );
      return true;
    } catch (e: any) {
      setValidationSummary(`JSON Syntax Error: ${e.message}`);
      return false;
    }
  };

  const handleExecuteImport = async () => {
    if (!validateJson(importJson)) {
      toast.error('Cannot import invalid JSON payload.');
      return;
    }

    try {
      setIsLoading(true);
      const parsed: ProductExportData = JSON.parse(importJson);
      const res = await productService.importCatalogue(parsed, staffUserId);
      toast.success(
        `Imported ${res.importedProducts} products and ${res.importedCategories} categories.`
      );
      onDataChanged();
      onClose();
    } catch (err: any) {
      console.error('[ImportCatalogue] Error:', err);
      toast.error(err.message || 'Import failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Catalogue Import & Export Engine"
    >
      <div className="space-y-4 text-left max-h-[80vh] overflow-y-auto pr-1">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === 'export'
                ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Download className="h-4 w-4" />
            <span>Export Catalogue</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === 'import'
                ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>Import Catalogue</span>
          </button>
        </div>

        {activeTab === 'export' ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Export the complete material catalogue, including active variants, dynamic specifications, images, and category taxonomy into portable standard JSON format.
            </p>

            <div className="relative">
              <Textarea
                id="textarea-export-json"
                value={exportJson}
                readOnly
                rows={12}
                className="font-mono text-[11px] leading-relaxed bg-slate-50 dark:bg-slate-900"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadExport}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                isLoading={isLoading}
              >
                Refresh Data
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  leftIcon={isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                >
                  {isCopied ? 'Copied' : 'Copy JSON'}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleDownload}
                  leftIcon={<Download className="h-3.5 w-3.5" />}
                >
                  Download File
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                <span className="font-bold block">Catalogue Synchronization Notice</span>
                <p>
                  Importing items matching an existing SKU will update their product record. Brand-new SKUs will be inserted as new entries.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Upload JSON File
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Or Paste Raw Catalogue JSON
              </label>
              <Textarea
                id="textarea-import-json"
                value={importJson}
                onChange={(e) => {
                  setImportJson(e.target.value);
                  validateJson(e.target.value);
                }}
                rows={8}
                placeholder="Paste JSON content here..."
                className="font-mono text-[11px]"
              />
            </div>

            {validationSummary && (
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-orange-600" />
                <span>{validationSummary}</span>
              </p>
            )}

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleExecuteImport}
                disabled={!importJson || isLoading}
                isLoading={isLoading}
              >
                Execute Import
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
