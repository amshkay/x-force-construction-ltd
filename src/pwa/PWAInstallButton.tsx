import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'primary' | 'outline' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'outline',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, do not display
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'primary') {
      return (
        <button
          id="btn-pwa-install-primary"
          onClick={() => void install()}
          className={`flex items-center gap-2 rounded-lg bg-orange-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-orange-700 transition active:scale-95 ${className}`}
        >
          <Download className="h-4 w-4" />
          <span>Install App</span>
        </button>
      );
    }

    return (
      <button
        id="btn-pwa-install-outline"
        onClick={() => void install()}
        className={`flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition ${className}`}
      >
        <Download className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          id="btn-pwa-install-ios"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition ${className}`}
        >
          <Share className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div
            id="ios-install-guide-modal"
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Download className="h-4 w-4 text-orange-600" /> Install on iPhone / iPad
                </h3>
                <button
                  id="btn-close-ios-guide"
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950 text-xs font-bold text-orange-600">
                    1
                  </span>
                  <p>
                    Tap the <strong>Share</strong> button at the bottom of Safari.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950 text-xs font-bold text-orange-600">
                    2
                  </span>
                  <p>
                    Scroll down and select <strong>Add to Home Screen</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950 text-xs font-bold text-orange-600">
                    3
                  </span>
                  <p>
                    Confirm by tapping <strong>Add</strong> in the top right.
                  </p>
                </div>
              </div>
              <button
                id="btn-confirm-ios-guide-close"
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-lg bg-orange-600 py-2 text-xs font-semibold text-white hover:bg-orange-700 transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
