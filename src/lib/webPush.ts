// Web Push (VAPID) subscribe/unsubscribe -- the browser-native push channel
// for ajo-web's PWA install. Separate from ajo-app's Expo push; a user can
// have both registered at once (see PWA Phase 3 in Ajo_backend/PROGRESS.md).
import api from '../services/api';

// Explicit <ArrayBuffer> (not the bare, wider "Uint8Array" alias TS now
// resolves to Uint8Array<ArrayBufferLike>) -- PushManager.subscribe's
// applicationServerKey wants BufferSource, which only accepts a view backed
// by a real ArrayBuffer, never the SharedArrayBuffer branch of ArrayBufferLike.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isWebPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY)
  );
}

/**
 * Requests notification permission, subscribes via the Push API, and
 * registers the subscription with the backend. Returns false (without
 * throwing) for every "can't proceed" case -- unsupported browser, missing
 * VAPID key, or the user declining the permission prompt -- so callers can
 * just treat it as "didn't enable notifications" and move on.
 */
export async function subscribeToWebPush(): Promise<boolean> {
  if (!isWebPushSupported()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
    });
  }

  const json = subscription.toJSON();
  await api.post('/auth/web-push-subscription/', { endpoint: json.endpoint, keys: json.keys });
  return true;
}
