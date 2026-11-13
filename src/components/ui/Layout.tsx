import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bars3Icon, XMarkIcon, SunIcon, MoonIcon, ComputerDesktopIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Sidebar } from './Sidebar';
import { InstallPrompt } from './InstallPrompt';
import { NotificationPrompt } from './NotificationPrompt';
import { useTheme } from '../../context/ThemeContext';
import { getBreadcrumb } from '../../lib/breadcrumbs';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { pathname } = useLocation();
  const crumbs = getBreadcrumb(pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-(--bg)">
      {/* Skip-to-content link — visible on focus for keyboard/screen-reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-orange-600 focus:text-white focus:font-medium focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:shrink-0" style={{ width: 240 }}>
        <div className="w-full">
          <Sidebar />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 transition-opacity"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="relative flex w-64 flex-col z-50 shadow-xl">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                aria-label="Close sidebar"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top bar -- py-5 deliberately matches Sidebar's logo-block padding
            (also py-5) so the two headers' bottom borders land on the same
            Y-offset and read as one continuous line across the sidebar/
            content seam, instead of two horizontal rules at different
            heights. */}
        <header className="flex items-center justify-between px-4 py-5 lg:px-6 border-b border-(--border) bg-(--surface)">
          {/* Mobile: hamburger + logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              aria-label="Open sidebar"
              className="text-(--text-secondary) hover:text-(--text-primary) transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2">
              <img src="/ajo-logo.svg" alt="Ajo" className="h-7 w-7" />
              <span className="text-lg font-extrabold text-(--primary)">Ajo</span>
            </div>
          </div>

          {/* Desktop breadcrumb -- replaces what used to be an empty spacer
              div here purely to push the theme toggle to the right. */}
          <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-1.5 text-sm min-w-0">
            {crumbs.map((label, i) => (
              <span key={i} className="flex items-center gap-1.5 min-w-0">
                {i > 0 && <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-(--text-muted)" aria-hidden="true" />}
                <span
                  className={
                    i === crumbs.length - 1
                      ? 'font-semibold text-(--text-primary) truncate'
                      : 'text-(--text-muted) truncate'
                  }
                >
                  {label}
                </span>
              </span>
            ))}
          </nav>

          {/* Theme toggle */}
          <div
            role="group"
            aria-label="Theme selection"
            className="flex items-center gap-1 p-1 rounded-lg bg-(--bg) border border-(--border)"
          >
            <ThemeButton active={theme === 'light'} aria-label="Switch to light mode" onClick={() => setTheme('light')}>
              <SunIcon className="h-4 w-4" />
            </ThemeButton>
            <ThemeButton active={theme === 'system'} aria-label="Use system colour preference" onClick={() => setTheme('system')}>
              <ComputerDesktopIcon className="h-4 w-4" />
            </ThemeButton>
            <ThemeButton active={theme === 'dark'} aria-label="Switch to dark mode" onClick={() => setTheme('dark')}>
              <MoonIcon className="h-4 w-4" />
            </ThemeButton>
          </div>
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-6" tabIndex={-1}>
          {children}
        </main>
      </div>

      <InstallPrompt />
      <NotificationPrompt />
    </div>
  );
}

function ThemeButton({
  active,
  onClick,
  'aria-label': ariaLabel,
  children,
}: {
  active: boolean;
  onClick: () => void;
  'aria-label': string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center justify-center h-7 w-7 rounded-md transition-all ${
        active
          ? 'bg-(--primary) text-white shadow-sm'
          : 'text-(--text-muted) hover:text-(--text-primary)'
      }`}
    >
      {children}
    </button>
  );
}
