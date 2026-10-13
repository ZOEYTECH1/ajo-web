// Badging API -- shows the unread count directly on the home-screen icon
// once installed, on top of the in-app bell badge that already exists.
// Not universally supported (notably: not iOS Safari as of 17), so this is
// pure progressive enhancement -- feature-detected and silently a no-op
// everywhere it isn't available.

type NavigatorWithBadge = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export function updateAppBadge(unreadCount: number): void {
  const nav = navigator as NavigatorWithBadge;
  try {
    if (unreadCount > 0) {
      void nav.setAppBadge?.(unreadCount);
    } else {
      void nav.clearAppBadge?.();
    }
  } catch {
    // Some browsers advertise the API but throw outside an installed
    // context -- never let a cosmetic badge failure affect the app.
  }
}
