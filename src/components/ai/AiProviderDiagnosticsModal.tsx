/**
 * AI Provider Diagnostics & Tools Modal
 * Module 19 — Admin AI Business Assistant
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Diagnostic view showing active model configurations, API key presence,
 * prompt defense parameters, and data-access tool declarations.
 */

import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Layers,
  Wrench,
  Clock,
  Terminal,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AiProviderConfig } from '../../types/ai';
import { AI_TOOL_DECLARATIONS } from '../../services/ai/aiToolRegistry';

interface AiProviderDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AiProviderConfig;
}

export const AiProviderDiagnosticsModal: React.FC<AiProviderDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  config,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Business Assistant Architecture & Diagnostics"
      size="xl"
    >
      <div className="space-y-5 text-left text-xs">
        {/* Architecture Card */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-amber-500" />
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Active Intelligence Model
                </h4>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {config.modelName}
                </p>
              </div>
            </div>

            <Badge variant={config.isApiKeyPresent ? 'success' : 'warning'} size="sm">
              {config.isApiKeyPresent ? 'Live Cloud Connected' : 'Local Rule Engine'}
            </Badge>
          </div>

          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
            {config.statusMessage}
          </p>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
            <div>
              <span className="text-slate-400 block font-mono">PROVIDER</span>
              <span className="font-bold text-slate-700 dark:text-slate-200 uppercase">
                {config.providerName}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-mono">TIMEZONE</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                Africa/Lagos (WAT)
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-mono">PERMISSIONS</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                Enforced Server-Side
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-mono">READ-ONLY BY DEFAULT</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                Guaranteed
              </span>
            </div>
          </div>
        </div>

        {/* Security & Prompt Injection Defense */}
        <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/10">
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-slate-900 dark:text-white">
              Data Minimization & Prompt Injection Protection
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
            Customer records, order items, supplier notes, and messages are treated as untrusted data strings.
            Raw SQL execution is completely disabled. Only pre-defined, typed application functions can be executed.
          </p>
        </div>

        {/* Declared Business Tools */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-[11px]">
              Controlled Business Data Tools ({AI_TOOL_DECLARATIONS.length} Registered)
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Strict JSON Schema</span>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
            {AI_TOOL_DECLARATIONS.map((tool) => {
              const toolName = tool.name || 'unnamedTool';
              return (
                <div key={toolName} className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-mono text-amber-700 dark:text-amber-400 text-xs">
                      {toolName}()
                    </span>
                    {toolName.startsWith('propose') && (
                      <Badge variant="warning" size="sm">
                        Requires Confirmation
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {tool.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Diagnostics
          </Button>
        </div>
      </div>
    </Modal>
  );
};
