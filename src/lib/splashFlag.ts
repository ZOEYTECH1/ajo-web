const KEY = 'show-splash-on-login';

// Set right before navigating to /login after an explicit logout (or
// account deletion), so LoginPage knows to play the welcome splash first --
// it should NOT show on a first-time visit, a direct link to /login, or a
// session-expiry redirect, only on the logout -> login transition itself.
export function markSplashForLogin() {
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    /* ignore */
  }
}

// One-shot: reading it also clears it, so the splash only plays once per
// logout, not on every subsequent visit to /login within the same tab.
export function consumeSplashForLogin(): boolean {
  try {
    const show = sessionStorage.getItem(KEY) === '1';
    sessionStorage.removeItem(KEY);
    return show;
  } catch {
    return false;
  }
}
