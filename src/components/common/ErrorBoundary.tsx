/**
 * Production Error Boundary Component
 * Module 25 — Production Deployment & Environment Configuration
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Catches unhandled client runtime rendering exceptions and provides
 * a branded, defensive fallback UI.
 *
 * Security Guarantee:
 * In production mode, raw stack traces, local filesystem paths, environment variables,
 * and database credentials are NEVER exposed to the user.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';
import { errorLogger } from '../../services/diagnostics/errorLogger.service';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorRef?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorRef: undefined,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    let errorRef: string | undefined;
    try {
      const logged = errorLogger.captureError({
        module: 'system',
        operation: 'render',
        severity: 'CRITICAL',
        rawError: error,
        userMessage: 'An unexpected rendering error occurred.',
      });
      errorRef = logged.id;
    } catch {
      // safe fallback
    }

    this.setState({ errorInfo, errorRef });
    if (typeof console !== 'undefined' && console.error) {
      console.error('[XFORCE System Error Boundary Caught Exception]:', {
        name: error.name,
        message: error.message,
        reference: errorRef,
        timestamp: new Date().toISOString(),
      });
    }
  }

  handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleResetToHome = (): void => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  handleClearCacheAndReload = (): void => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
      } catch {
        // Ignore storage access errors
      }
      window.location.href = '/';
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = Boolean(
        typeof import.meta !== 'undefined' &&
          (import.meta as any).env &&
          (import.meta as any).env.DEV
      );

      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400 bg-orange-950/60 px-2.5 py-1 rounded-full border border-orange-800/40">
                XFORCE System Recovery
              </span>
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                An Unexpected Application Error Occurred
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                The application encountered an issue while rendering this view. Your session data and draft records have been preserved in local storage.
              </p>
              {this.state.errorRef && (
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-900 border border-slate-700 text-[11px] font-mono text-orange-400">
                    <span className="text-slate-500">Diagnostic Ref:</span> {this.state.errorRef}
                  </span>
                </div>
              )}
            </div>

            {/* Developer Details ONLY in development environment */}
            {isDev && this.state.error && (
              <div className="text-left bg-slate-950 border border-red-900/50 rounded-lg p-3 text-xs text-red-300 font-mono overflow-auto max-h-40">
                <p className="font-bold text-red-400 mb-1">[Dev Mode Only Diagnostic]</p>
                <p className="break-all">{this.state.error.message}</p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs transition shadow-lg shadow-orange-600/20 cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reload Application</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetToHome}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs transition cursor-pointer"
              >
                <Home className="h-4 w-4" />
                <span>Return to Home Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                className="text-[11px] text-slate-500 hover:text-slate-400 underline cursor-pointer pt-1"
              >
                Clear Session Cache & Restart
              </button>
            </div>

            <div className="border-t border-slate-700/60 pt-4 text-[10px] text-slate-500">
              XFORCE Construction Ltd &bull; X-FORCE BRICKS &bull; System Integrity Protected
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
