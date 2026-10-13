import { useEffect, useState } from 'react';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { isIos, isStandalone } from '../../lib/platform';
import { isWebPushSupported, subscribeToWebPush } from '../../lib/webPush';

const DISMISSED_KEY = 'scribe-notification-prompt-dismissed';

/**
 * Prompts for Web Push permission once it's actually possible to grant:
 * on iOS that means already installed (iOS only delivers push to a
 * home-screen PWA, and only on 16.4+); everywhere else push works in a
 * regular browser tab too, so no install is required first.
 *
 * Shown separately from InstallPrompt -- an iOS visitor sees "install
 * this app" first, then (after installing, on a later visit) "enable
 * notifications". Never shown again once permission is granted/denied
 * or the user dismisses it.
 */
export function NotificationPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isWebPushSupported()) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
    if (isIos() && !isStandalone()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  async function enable() {
    await subscribeToWebPush();
    // Whether the user granted or declined the permission prompt, the
    // browser now tracks a non-"default" decision -- don't ask again either way.
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 flex items-start gap-3 rounded-xl border border-(--border) bg-(--surface) p-4 shadow-lg sm:inset-x-auto sm:right-4 sm:max-w-sm"
    >
      <BellIcon className="h-10 w-10 shrink-0 text-(--primary)" aria-hidden="true" />
      <div className="flex-1 text-sm text-(--text-primary)">
        <p className="font-semibold">Enable notifications</p>
        <p className="text-(--text-secondary) mt-0.5">
          Get notified about payments, disputes, and cycle updates even when Scribe isn&apos;t open.
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={enable}
            className="rounded-lg bg-(--primary) px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            Enable
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary)"
          >
            Not now
          </button>
        </div>
      </div>
      <button
        type="button"
        aria-label="Dismiss notification prompt"
        onClick={dismiss}
        className="shrink-0 text-(--text-muted) hover:text-(--text-primary)"
      >
        <XMarkIcon className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
