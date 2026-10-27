import React, { useRef } from 'react';
import { X, Printer, Wrench, Building2, MapPin, Calendar, CheckSquare, Square } from 'lucide-react';
import { ServiceJobRecord } from '../../types/installation';
import { Button } from '../ui/Button';

interface ServiceJobPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: ServiceJobRecord | null;
}

export const ServiceJobPrintModal: React.FC<ServiceJobPrintModalProps> = ({
  isOpen,
  onClose,
  job,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !job) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8 flex flex-col max-h-[92vh]">
        {/* Modal Controls */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Print Official Site Service Work Order & Job Card
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={handlePrint} leftIcon={<Printer className="h-4 w-4" />}>
              Print Job Card
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="p-8 overflow-y-auto flex-1 bg-white text-slate-900 font-sans print:p-0" ref={printAreaRef}>
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-2xl tracking-tight text-orange-600">
                  XFORCE
                </span>
                <span className="text-xs uppercase tracking-widest font-bold text-slate-600">
                  CONSTRUCTION LTD
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Industrial Hydraulic Interlocking Bricks & Automated Masonry Systems
              </div>
              <div className="text-[11px] text-slate-500">
                Main Plant & Yard: KM 12 Enugu-Port Harcourt Expressway, Enugu • Tel: +234 803 111 2233
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                SITE SERVICE WORK ORDER
              </div>
              <div className="text-xl font-mono font-extrabold text-slate-900">
                {job.jobReference}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Status: <span className="font-bold uppercase">{job.status}</span>
              </div>
              <div className="text-xs text-slate-500">
                Priority: <span className="font-semibold uppercase">{job.priority}</span>
              </div>
            </div>
          </div>

          {/* Job & Site Parameters Grid */}
          <div className="grid grid-cols-2 gap-6 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs mb-6">
            <div className="space-y-1.5">
              <div className="font-bold uppercase tracking-wider text-slate-600 text-[10px]">
                CLIENT & PROJECT LOCATION
              </div>
              <div className="font-bold text-sm text-slate-900">{job.customerName}</div>
              {job.companyName && <div className="text-slate-600">{job.companyName}</div>}
              <div>Contact Phone: <span className="font-semibold">{job.customerPhone}</span></div>
              <div>Site Address: <span className="font-semibold">{job.siteAddress}, {job.siteCity || 'Enugu'}</span></div>
              {job.gpsLatitude && job.gpsLongitude && (
                <div className="font-mono text-[10px] text-slate-500">
                  GPS: {job.gpsLatitude}, {job.gpsLongitude}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="font-bold uppercase tracking-wider text-slate-600 text-[10px]">
                SERVICE SPECIFICATION & SCHEDULE
              </div>
              <div>Service Scope: <span className="font-bold text-orange-600">{job.serviceTypeLabel}</span></div>
              <div>Scheduled Date: <span className="font-semibold">{job.scheduledDate || 'Immediate'}</span></div>
              <div>Scheduled Time: <span className="font-semibold">{job.scheduledTime || '08:30 AM'}</span></div>
              <div>Estimated Duration: <span className="font-semibold">{job.estimatedDurationHours || 8} Hours</span></div>
              <div>Linked Order Ref: <span className="font-mono font-bold">{job.orderNumber || 'Independent'}</span></div>
              <div>Lead Field Mason: <span className="font-bold">{job.assignedStaffName || 'Unassigned'}</span></div>
            </div>
          </div>

          {/* Protocol Checklist */}
          <div className="mb-6">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 mb-2">
              Standard Laying & QA Protocol Checklist
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {job.checklists.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  {c.isCompleted ? (
                    <CheckSquare className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Square className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className={c.isCompleted ? 'text-slate-900 font-medium' : 'text-slate-500'}>
                    {c.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* On-Site Measurements if any */}
          {job.measurements.length > 0 && (
            <div className="mb-6">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 mb-2">
                Surveyed Dimensions & Surface Area
              </div>
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-700">
                  <tr>
                    <th className="p-2">Section / Location</th>
                    <th className="p-2">Length (m)</th>
                    <th className="p-2">Height (m)</th>
                    <th className="p-2">Calculated Area</th>
                    <th className="p-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {job.measurements.map((m) => (
                    <tr key={m.id}>
                      <td className="p-2 font-medium">{m.label}</td>
                      <td className="p-2">{m.lengthM || '—'}</td>
                      <td className="p-2">{m.heightM || '—'}</td>
                      <td className="p-2 font-bold">{m.areaSqM ? `${m.areaSqM} m²` : '—'}</td>
                      <td className="p-2 text-slate-500">{m.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Materials Consumed if any */}
          {job.materialsUsed.length > 0 && (
            <div className="mb-6">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 mb-2">
                Materials & Inventory Consumed On Site
              </div>
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-700">
                  <tr>
                    <th className="p-2">Material / Product Description</th>
                    <th className="p-2">SKU</th>
                    <th className="p-2">Quantity Used</th>
                    <th className="p-2">Stock Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {job.materialsUsed.map((u) => (
                    <tr key={u.id}>
                      <td className="p-2 font-medium">{u.productName} ({u.variantName || 'Standard'})</td>
                      <td className="p-2 font-mono text-[11px]">{u.sku}</td>
                      <td className="p-2 font-bold">{u.quantityUsed.toLocaleString()} {u.unit}</td>
                      <td className="p-2">{u.sourceLocationName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Special Instructions */}
          <div className="p-3 rounded bg-slate-50 border border-slate-200 text-xs mb-8">
            <span className="font-bold text-slate-700">Notice to Field Crew: </span>
            <span>
              All interlocking courses must adhere strictly to laser level specifications. Ensure starter course bitumen DPC bond is inspected before stacking. Clean off any efflorescence or mortar spills immediately.
            </span>
          </div>

          {/* Signatures Tripartite Section */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-slate-900 text-xs">
            <div className="space-y-10">
              <div>
                <div className="font-bold uppercase text-[10px] text-slate-500">LEAD FIELD MASON</div>
                <div className="font-semibold text-slate-900 mt-1">{job.assignedStaffName || 'Sunday Nwosu'}</div>
              </div>
              <div className="border-t border-slate-400 pt-1 text-[11px] text-slate-500">
                Signature & Date
              </div>
            </div>

            <div className="space-y-10">
              <div>
                <div className="font-bold uppercase text-[10px] text-slate-500">OPERATIONS SUPERVISOR</div>
                <div className="font-semibold text-slate-900 mt-1">Engr. David Adeleke</div>
              </div>
              <div className="border-t border-slate-400 pt-1 text-[11px] text-slate-500">
                Signature & Date
              </div>
            </div>

            <div className="space-y-10">
              <div>
                <div className="font-bold uppercase text-[10px] text-slate-500">CLIENT / SITE ENGINEER</div>
                <div className="font-semibold text-slate-900 mt-1">
                  {job.customerSignOff?.signedByCustomerName || job.customerName}
                </div>
              </div>
              <div className="border-t border-slate-400 pt-1 text-[11px] text-slate-500">
                Acceptance Signature & Stamp
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
