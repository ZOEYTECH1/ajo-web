import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const postMock = vi.hoisted(() => vi.fn().mockResolvedValue({ data: {} }));
vi.mock('../services/api', () => ({ default: { post: postMock } }));

import { isWebPushSupported, subscribeToWebPush } from './webPush';

const VAPID_KEY = 'BFU01O8Upeg6WxWAUJy26ypH8_mUJU-RI5HFRUO7fkHs4neRynfLKBHWl1l3SWoiBafmWfSSVyInplMUV_nn4MM';

function stubPushSupport({ withVapidKey = true } = {}) {
  vi.stubEnv('VITE_VAPID_PUBLIC_KEY', withVapidKey ? VAPID_KEY : '');
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { ready: Promise.resolve({ pushManager: { getSubscription: vi.fn(), subscribe: vi.fn() } }) },
    configurable: true,
  });
  Object.defineProperty(window, 'PushManager', { value: class {}, configurable: true });
  vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('granted') });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  postMock.mockClear();
  // @ts-expect-error -- test-only cleanup
  delete navigator.serviceWorker;
  // @ts-expect-error -- same
  delete window.PushManager;
});

describe('isWebPushSupported', () => {
  it('is false without the VAPID public key configured', () => {
    stubPushSupport({ withVapidKey: false });
    expect(isWebPushSupported()).toBe(false);
  });

  it('is true when serviceWorker/PushManager/Notification and the key are all present', () => {
    stubPushSupport();
    expect(isWebPushSupported()).toBe(true);
  });
});

describe('subscribeToWebPush', () => {
  beforeEach(() => {
    stubPushSupport();
  });

  it('returns false and never calls the API when unsupported', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '');
    const result = await subscribeToWebPush();
    expect(result).toBe(false);
    expect(postMock).not.toHaveBeenCalled();
  });

  it('returns false and never subscribes when permission is denied', async () => {
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('denied') });
    const result = await subscribeToWebPush();
    expect(result).toBe(false);
    expect(postMock).not.toHaveBeenCalled();
  });

  it('subscribes and registers the subscription with the backend when permission is granted', async () => {
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('granted') });
    const fakeSubscription = {
      toJSON: () => ({ endpoint: 'https://push.example.com/abc', keys: { p256dh: 'p', auth: 'a' } }),
    };
    const getSubscription = vi.fn().mockResolvedValue(null);
    const subscribe = vi.fn().mockResolvedValue(fakeSubscription);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.resolve({ pushManager: { getSubscription, subscribe } }) },
      configurable: true,
    });

    const result = await subscribeToWebPush();

    expect(result).toBe(true);
    expect(subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    );
    expect(postMock).toHaveBeenCalledWith('/auth/web-push-subscription/', {
      endpoint: 'https://push.example.com/abc',
      keys: { p256dh: 'p', auth: 'a' },
    });
  });

  it('reuses an existing subscription instead of creating a new one', async () => {
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('granted') });
    const existing = {
      toJSON: () => ({ endpoint: 'https://push.example.com/existing', keys: { p256dh: 'p', auth: 'a' } }),
    };
    const subscribe = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.resolve({ pushManager: { getSubscription: vi.fn().mockResolvedValue(existing), subscribe } }) },
      configurable: true,
    });

    const result = await subscribeToWebPush();

    expect(result).toBe(true);
    expect(subscribe).not.toHaveBeenCalled();
    expect(postMock).toHaveBeenCalledWith('/auth/web-push-subscription/', {
      endpoint: 'https://push.example.com/existing',
      keys: { p256dh: 'p', auth: 'a' },
    });
  });
});
