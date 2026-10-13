import { afterEach, describe, expect, it, vi } from 'vitest';
import { updateAppBadge } from './appBadge';

afterEach(() => {
  vi.restoreAllMocks();
  // @ts-expect-error -- cleaning up a test-only addition to navigator
  delete navigator.setAppBadge;
  // @ts-expect-error -- same
  delete navigator.clearAppBadge;
});

describe('updateAppBadge', () => {
  it('calls setAppBadge with the count when > 0', () => {
    const setAppBadge = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'setAppBadge', { value: setAppBadge, configurable: true });
    Object.defineProperty(navigator, 'clearAppBadge', { value: vi.fn(), configurable: true });

    updateAppBadge(3);

    expect(setAppBadge).toHaveBeenCalledWith(3);
  });

  it('calls clearAppBadge when count is 0', () => {
    const clearAppBadge = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'setAppBadge', { value: vi.fn(), configurable: true });
    Object.defineProperty(navigator, 'clearAppBadge', { value: clearAppBadge, configurable: true });

    updateAppBadge(0);

    expect(clearAppBadge).toHaveBeenCalled();
  });

  it('does nothing when the Badging API is unsupported', () => {
    expect(() => updateAppBadge(5)).not.toThrow();
  });

  it('swallows an error thrown by setAppBadge', () => {
    Object.defineProperty(navigator, 'setAppBadge', {
      value: vi.fn().mockImplementation(() => { throw new Error('not allowed'); }),
      configurable: true,
    });

    expect(() => updateAppBadge(2)).not.toThrow();
  });
});
