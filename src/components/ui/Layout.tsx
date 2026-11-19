import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bars3Icon, XMarkIcon, SunIcon, MoonIcon, ComputerDesktopIcon, ChevronRightIcon, LanguageIcon } from '@heroicons/react/24/outline';
import { Sidebar } from './Sidebar';
import { InstallPrompt } from './InstallPrompt';
import { NotificationPrompt } from './NotificationPrompt';
import { useTheme } from '../../context/ThemeContext';
import { getBreadcrumb } from '../../lib/breadcrumbs';
import { SUPPORTED_LANGUAGES, setLanguage, type LanguageCode } from '../../i18n';
import api from '../../services/api';
import useAuthStore from '../../store/useAuthStore';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const crumbs = getBreadcrumb(pathname);
  const setUser = useAuthStore((s) => s.setUser);

  const chooseLanguage = (code: LanguageCode) => {
    setLanguage(code);
    setLangOpen(false);
    // Best-effort sync to the backend so server-generated text (notification
    // emails, API error messages) matches too -- failure here just means the
    // frontend's own language changed but the account-level preference
    // didn't sync this time; not worth blocking the UI switch over.
    api.patch('/auth/me/', { language: code })
      .then((res) => setUser(res.data))
      .catch(() => {});
  };

  return (
    <div className="flex h-screen overflow-hidden bg-(--bg)">
      {/* Skip-to-content link — visible on focus for keyboard/screen-reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-(--primary) focus:text-white focus:font-medium focus:shadow-lg"
      >
        {t('layout.skipToContent')}
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
                aria-label={t('layout.closeSidebar')}
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
        {/* Top bar -- a fixed h-24 (not py-*) deliberately matches Sidebar's
            own fixed h-24 logo block, so the two headers' bottom borders
            land on exactly the same pixel row across the sidebar/content
            seam. Padding-based heights on two independent elements can
            round to different pixel heights even with matching classes.
            (Bumped from h-19 to h-24 to give the bigger logo room without
            overflowing the row.) */}
        <header className="flex items-center justify-between px-4 h-24 lg:px-6 border-b border-(--border) bg-(--surface)">
          {/* Mobile: hamburger + logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              aria-label={t('layout.openSidebar')}
              className="text-(--text-secondary) hover:text-(--text-primary) transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2">
              <img src="/ajo-logo.svg" alt="Scribe" className="h-14 w-14" />
              <span className="text-lg font-extrabold text-(--primary)">Scribe</span>
            </div>
          </div>

          {/* Desktop breadcrumb -- replaces what used to be an empty spacer
              div here purely to push the theme toggle to the right. */}
          <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-1.5 text-sm min-w-0">
            {crumbs.map((crumb, i) => (
              <span key={crumb.path} className="flex items-center gap-1.5 min-w-0">
                {/* The first crumb is the main section (Inventory/Ajo
                    Groups/Thrift) -- bigger and bold. Everything after it
                    is a sub-section one level down, so it reads thinner
                    and smaller, same colour throughout. Every crumb,
                    including the current page, is a real link to its own
                    cumulative path -- clicking any of them navigates
                    straight there. */}
                {i > 0 && <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-(--primary)/50" aria-hidden="true" />}
                <Link
                  to={crumb.path}
                  className={
                    i === 0
                      ? 'text-base font-bold text-(--primary) truncate hover:underline'
                      : 'text-xs font-normal text-(--primary) truncate hover:underline'
                  }
                >
                  {crumb.label}
                </Link>
              </span>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/* Language selector */}
            <div className="relative">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={langOpen}
                aria-label={t('layout.languageSelection')}
                onClick={() => setLangOpen((v) => !v)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-(--bg) border border-(--border) text-(--text-secondary) hover:text-(--text-primary) transition-colors"
              >
                <LanguageIcon className="h-4 w-4" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase hidden sm:inline">{i18n.language}</span>
              </button>
              {langOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} aria-hidden="true" />
                  <div
                    role="listbox"
                    aria-label={t('layout.languageSelection')}
                    className="absolute right-0 mt-1 w-40 rounded-lg border border-(--border) bg-(--surface) shadow-lg z-50 py-1"
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        role="option"
                        aria-selected={i18n.language === l.code}
                        onClick={() => chooseLanguage(l.code as LanguageCode)}
                        className={`w-full text-left px-3 py-1.5 text-sm hover:bg-(--primary-tint)/30 ${i18n.language === l.code ? 'font-semibold text-(--primary)' : 'text-(--text-primary)'}`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Theme toggle */}
            <div
              role="group"
              aria-label={t('layout.themeSelection')}
              className="flex items-center gap-1 p-1 rounded-lg bg-(--bg) border border-(--border)"
            >
              <ThemeButton active={theme === 'light'} aria-label={t('layout.lightMode')} onClick={() => setTheme('light')}>
                <SunIcon className="h-4 w-4" />
              </ThemeButton>
              <ThemeButton active={theme === 'system'} aria-label={t('layout.systemMode')} onClick={() => setTheme('system')}>
                <ComputerDesktopIcon className="h-4 w-4" />
              </ThemeButton>
              <ThemeButton active={theme === 'dark'} aria-label={t('layout.darkMode')} onClick={() => setTheme('dark')}>
                <MoonIcon className="h-4 w-4" />
              </ThemeButton>
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto px-3 py-4 sm:p-6" tabIndex={-1}>
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
          ? 'bg-(--accent) text-white shadow-sm'
          : 'text-(--text-muted) hover:text-(--text-primary)'
      }`}
    >
      {children}
    </button>
  );
}
