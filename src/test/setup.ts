import '@testing-library/jest-dom';
import '../i18n'; // same init main.tsx does -- without it, t() falls back to raw keys in tests

// jsdom does not implement ResizeObserver — mock it so GoogleAuthButton (and
// anything else measuring an element's size) works in tests.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// jsdom does not implement window.matchMedia — mock it so ThemeContext works in tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
