import { useState } from 'react';
import { Bars3Icon, XMarkIcon, SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { Sidebar } from './Sidebar';
import { useTheme } from '../../context/ThemeContext';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex h-screen overflow-hidden bg-(--bg)">
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
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-(--border) bg-(--surface)">
          {/* Mobile: hamburger + logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              className="text-(--text-secondary) hover:text-(--text-primary) transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2">
              <img src="/ajo-logo.svg" alt="Ajo" className="h-7 w-7" />
              <span className="text-lg font-extrabold text-(--primary)">Ajo</span>
            </div>
          </div>

          {/* Desktop spacer */}
          <div className="hidden lg:block" />

          {/* Theme toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-(--bg) border border-(--border)">
            <ThemeButton active={theme === 'light'} title="Light mode" onClick={() => setTheme('light')}>
              <SunIcon className="h-4 w-4" />
            </ThemeButton>
            <ThemeButton active={theme === 'system'} title="System preference" onClick={() => setTheme('system')}>
              <ComputerDesktopIcon className="h-4 w-4" />
            </ThemeButton>
            <ThemeButton active={theme === 'dark'} title="Dark mode" onClick={() => setTheme('dark')}>
              <MoonIcon className="h-4 w-4" />
            </ThemeButton>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function ThemeButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
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
