/**
 * Customer CSV Import Modal
 * Module 08: Customer Management
 * XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
 */

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileText,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { customerService, CsvImportResult } from '../../services/customer.service';

interface CustomerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCompleted: () => void;
  currentStaffUserId?: string;
}

export const CustomerImportModal: React.FC<CustomerImportModalProps> = ({
  isOpen,
  onClose,
  onImportCompleted,
  currentStaffUserId,
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string>('');
  const [csvContent, setCsvContent] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvContent(text || '');
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const sampleCsv = `Full Name,Phone,Email,Company Name,Address,City,State,Customer Type
"Engr. Adebayo Adeleke","+234 803 111 2222","adebayo@example.com","Adeleke & Sons Ltd","15 Okpara Avenue","Enugu","Enugu","contractor"
"Mrs. Nneka Eze","+234 802 333 4444","nneka@example.com","","Plot 4, Independence Layout","Enugu","Enugu","homeowner"
"Arc. Uche Okeke","+234 805 555 6666","uche@designstudio.ng","Urban Design Studio","8 Ogui Road","Enugu","Enugu","architect"
"Prime Crest Heights","+234 809 777 8888","info@primecrest.ng","Prime Crest Real Estate","Golf Estate Phase 2","Enugu","Enugu","real_estate_developer"`;

    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'XFORCE_Customers_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!csvContent.trim()) {
      toast.warning('Please select a CSV file first.', 'No File');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await customerService.importCustomersFromCsv(csvContent, currentStaffUserId);
      setResult(res);
      if (res.importedCount > 0) {
        toast.success(`Successfully imported ${res.importedCount} customers.`, 'Import Complete');
        onImportCompleted();
      } else {
        toast.warning('No customer records were imported. Check error details.', 'Import Warning');
      }
    } catch (err: any) {
      toast.error(err.message || 'CSV Import failed.', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto text-left space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Import Customers from CSV
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bulk upload existing contractor directories or homeowner contacts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Instructions & Template */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Required CSV Columns:
            </span>
            <button
              type="button"
              onClick={handleDownloadSample}
              className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              <Download className="h-3 w-3" />
              <span>Download Template</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            CSV must have <code>Full Name</code> and <code>Phone</code>. Optional columns include <code>Email</code>, <code>Company Name</code>, <code>Address</code>, <code>City</code>, <code>State</code>, and <code>Customer Type</code>.
          </p>
        </div>

        {/* File Picker */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 text-center hover:border-orange-500 dark:hover:border-orange-500 transition space-y-2 bg-slate-50/50 dark:bg-slate-800/20"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div className="text-xs">
            {fileName ? (
              <span className="font-bold text-slate-800 dark:text-slate-200">{fileName}</span>
            ) : (
              <>
                <span className="font-semibold text-orange-600">Click to upload CSV</span> or drag and drop
              </>
            )}
          </div>
          <p className="text-[10px] text-slate-400">Standard CSV format up to 5MB</p>
        </div>

        {/* Results summary */}
        {result && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Import Summary</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2">
                <span className="block text-slate-400 text-[10px]">Total</span>
                <strong className="text-slate-800 dark:text-white font-bold">{result.totalRows}</strong>
              </div>
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-2 text-emerald-700 dark:text-emerald-300">
                <span className="block text-[10px]">Imported</span>
                <strong className="font-bold">{result.importedCount}</strong>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 p-2 text-amber-700 dark:text-amber-300">
                <span className="block text-[10px]">Skipped</span>
                <strong className="font-bold">{result.skippedCount}</strong>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-1 text-[11px] text-rose-600 dark:text-rose-400">
                <span className="font-semibold">Notices:</span>
                <ul className="list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
            {result ? 'Done' : 'Cancel'}
          </Button>
          {!result && (
            <Button
              variant="primary"
              onClick={handleImport}
              isLoading={isProcessing}
              disabled={!csvContent}
              leftIcon={<Upload className="h-4 w-4" />}
            >
              Start Import
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
