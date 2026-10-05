import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InstallPrompt } from './InstallPrompt';

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

describe('InstallPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
    setStandalone(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the install instructions for an iOS Safari visitor', () => {
    setUserAgent(IOS_UA);
    render(<InstallPrompt />);
    expect(screen.getByText('Install Scribe')).toBeInTheDocument();
  });

  it('renders nothing for a non-iOS visitor', () => {
    setUserAgent(ANDROID_UA);
    render(<InstallPrompt />);
    expect(screen.queryByText('Install Scribe')).not.toBeInTheDocument();
  });

  it('renders nothing when already running standalone (already installed)', () => {
    setUserAgent(IOS_UA);
    setStandalone(true);
    render(<InstallPrompt />);
    expect(screen.queryByText('Install Scribe')).not.toBeInTheDocument();
  });

  it('renders nothing once previously dismissed', () => {
    setUserAgent(IOS_UA);
    localStorage.setItem('scribe-install-prompt-dismissed', '1');
    render(<InstallPrompt />);
    expect(screen.queryByText('Install Scribe')).not.toBeInTheDocument();
  });

  it('dismissing hides the banner and persists the dismissal', async () => {
    setUserAgent(IOS_UA);
    const user = userEvent.setup();
    render(<InstallPrompt />);
    expect(screen.getByText('Install Scribe')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /dismiss install prompt/i }));

    expect(screen.queryByText('Install Scribe')).not.toBeInTheDocument();
    expect(localStorage.getItem('scribe-install-prompt-dismissed')).toBe('1');
  });
});
