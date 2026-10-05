import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Uploads source maps to Sentry on production builds so stack traces show
    // real file/line numbers instead of minified code.
    // Requires SENTRY_AUTH_TOKEN env var (set in CI secrets, never hardcoded).
    // Generate a token at: https://sentry.io/settings/account/api/auth-tokens/
    sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: 'tech-m5',
      project: 'javascript-react',
      telemetry: false,
    }),
    VitePWA({
      // Service worker is only generated/registered in production builds
      // (devOptions.enabled stays false, the default) -- a dev-mode SW would
      // just add a layer of caching confusion on top of Vite's own HMR.
      //
      // autoUpdate: new deploys take over silently in the background (new SW
      // activates via skipWaiting/clientsClaim, no "update available" prompt
      // UI to build/maintain). Since every API call is NetworkOnly anyway,
      // there's no stale-data risk from an old SW lingering a little longer
      // than ideal -- the only thing it ever controls is static shell assets.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'ajo-logo.svg'],
      manifest: {
        name: 'Scribe',
        short_name: 'Scribe',
        description: 'Ajo group savings, thrift, and inventory management.',
        theme_color: '#0035F0',
        background_color: '#F8FAFC',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // SPA fallback so a direct/offline navigation to any route still
        // loads the app shell instead of a service-worker 404.
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Every API call -- same-origin /api/* in dev (irrelevant, SW is
            // prod-only) or the cross-origin Render backend in prod (see
            // VITE_API_URL) -- is a ledger/financial read or write. Never
            // cache these: NetworkOnly means a request with no connectivity
            // fails cleanly instead of silently resolving with stale data.
            // (WebSocket upgrades aren't interceptable by the fetch event at
            // all, so they need no entry here.)
            urlPattern: ({ url, sameOrigin }) =>
              url.pathname.startsWith('/api') || !sameOrigin,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': `${import.meta.dirname}/src` },
  },
  build: {
    // Generate source maps so Sentry can map minified stack traces back to source.
    sourcemap: true,
  },
  // Pre-bundle CJS packages that expose named exports Vite can't statically
  // analyse without esbuild converting them to ESM first (e.g. react-is).
  optimizeDeps: {
    include: ['react-is', 'recharts'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://ajo-backend-q6dp.onrender.com',
        changeOrigin: true,
      },
    },
  },
});
