import { useEffect, useState } from 'react';
import { ArrowUpOnSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';

const DISMISSED_KEY = 'scribe-install-prompt-dismissed';

function isIos(): boolean {
  const ua = window.navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ reports its UA as a regular Mac, so the only way to tell it
  // apart from a real Mac is that it (unlike a Mac) supports multi-touch.
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS-only, non-standard property -- not in the lib.dom.d.ts Navigator type.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * iOS never implemented the `beforeinstallprompt` event Android/Chrome use to
 * show an automatic install banner, so Safari users have no built-in way to
 * discover that this app can be installed at all. This fills that gap with an
 * explicit, dismissible instruction banner (Share -> Add to Home Screen).
 * Android/desktop browsers already prompt on their own and never see this.
 */
export function InstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIos() || isStandalone()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 flex items-start gap-3 rounded-xl border border-(--border) bg-(--surface) p-4 shadow-lg sm:inset-x-auto sm:right-4 sm:max-w-sm"
    >
      <img src="/icons/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-lg" aria-hidden="true" />
      <div className="flex-1 text-sm text-(--text-primary)">
        <p className="font-semibold">Install Scribe</p>
        <p className="text-(--text-secondary) mt-0.5">
          Tap <ArrowUpOnSquareIcon className="inline h-4 w-4 align-text-bottom" aria-hidden="true" /> Share, then
          &ldquo;Add to Home Screen&rdquo; for quick access.
        </p>
      </div>
      <button
        type="button"
        aria-label="Dismiss install prompt"
        onClick={dismiss}
        className="shrink-0 text-(--text-muted) hover:text-(--text-primary)"
      >
        <XMarkIcon className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
