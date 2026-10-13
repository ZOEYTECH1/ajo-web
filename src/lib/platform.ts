// Shared browser/platform detection for PWA-related UI (InstallPrompt,
// NotificationPrompt) -- kept in one place so the two banners agree on
// what counts as "iOS" and "already installed."

export function isIos(): boolean {
  const ua = window.navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ reports its UA as a regular Mac, so the only way to tell it
  // apart from a real Mac is that it (unlike a Mac) supports multi-touch.
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS-only, non-standard property -- not in the lib.dom.d.ts Navigator type.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
