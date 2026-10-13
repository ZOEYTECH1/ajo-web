import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const subscribeToWebPushMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));
vi.mock('../../lib/webPush', async () => {
  const actual = await vi.importActual<typeof import('../../lib/webPush')>('../../lib/webPush');
  return { ...actual, subscribeToWebPush: subscribeToWebPushMock };
});

import { NotificationPrompt } from './NotificationPrompt';

const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

function setUserAgent(ua: string) {
  Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true });
}

function setStandalone(standalone: boolean) {
  Object.defineProperty(window.navigator, 'standalone', { value: standalone, configurable: true });
}

function stubSupported({ permission = 'default' }: { permission?: NotificationPermission } = {}) {
  vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'fake-vapid-key');
  Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });
  Object.defineProperty(window, 'PushManager', { value: class {}, configurable: true });
  vi.stubGlobal('Notification', { permission, requestPermission: vi.fn() });
}

describe('NotificationPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
    setStandalone(false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    subscribeToWebPushMock.mockClear();
    // @ts-expect-error -- test-only cleanup
    delete navigator.serviceWorker;
    // @ts-expect-error -- same
    delete window.PushManager;
  });

  it('shows the prompt on Android (no install required first)', () => {
    setUserAgent(ANDROID_UA);
    stubSupported();
    render(<NotificationPrompt />);
    expect(screen.getByText('Enable notifications')).toBeInTheDocument();
  });

  it('does not show on iOS before the app is installed', () => {
    setUserAgent(IOS_UA);
    stubSupported();
    render(<NotificationPrompt />);
    expect(screen.queryByText('Enable notifications')).not.toBeInTheDocument();
  });

  it('shows on iOS once installed (standalone mode)', () => {
    setUserAgent(IOS_UA);
    setStandalone(true);
    stubSupported();
    render(<NotificationPrompt />);
    expect(screen.getByText('Enable notifications')).toBeInTheDocument();
  });

  it('does not show when permission is already granted', () => {
    setUserAgent(ANDROID_UA);
    stubSupported({ permission: 'granted' });
    render(<NotificationPrompt />);
    expect(screen.queryByText('Enable notifications')).not.toBeInTheDocument();
  });

  it('does not show when permission is already denied', () => {
    setUserAgent(ANDROID_UA);
    stubSupported({ permission: 'denied' });
    render(<NotificationPrompt />);
    expect(screen.queryByText('Enable notifications')).not.toBeInTheDocument();
  });

  it('does not show once previously dismissed', () => {
    setUserAgent(ANDROID_UA);
    stubSupported();
    localStorage.setItem('scribe-notification-prompt-dismissed', '1');
    render(<NotificationPrompt />);
    expect(screen.queryByText('Enable notifications')).not.toBeInTheDocument();
  });

  it('clicking Enable subscribes and hides the banner', async () => {
    setUserAgent(ANDROID_UA);
    stubSupported();
    const user = userEvent.setup();
    render(<NotificationPrompt />);

    await user.click(screen.getByRole('button', { name: 'Enable' }));

    expect(subscribeToWebPushMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Enable notifications')).not.toBeInTheDocument();
    expect(localStorage.getItem('scribe-notification-prompt-dismissed')).toBe('1');
  });

  it('clicking "Not now" dismisses without subscribing', async () => {
    setUserAgent(ANDROID_UA);
    stubSupported();
    const user = userEvent.setup();
    render(<NotificationPrompt />);

    await user.click(screen.getByRole('button', { name: 'Not now' }));

    expect(subscribeToWebPushMock).not.toHaveBeenCalled();
    expect(screen.queryByText('Enable notifications')).not.toBeInTheDocument();
    expect(localStorage.getItem('scribe-notification-prompt-dismissed')).toBe('1');
  });
});
