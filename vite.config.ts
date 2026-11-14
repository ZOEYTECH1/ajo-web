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
      // UI to build/maintain).
      //
      // injectManifest (not the default generateSW): PWA Phase 3 needs a
      // hand-written `push`/`notificationclick` listener for Web Push
      // (src/sw.ts), which generateSW's auto-generated worker has no hook
      // for. Workbox only precaches the static build manifest there --
      // there is no runtime-caching route for anything else, so API/
      // WebSocket requests are simply never intercepted by the service
      // worker at all and always go straight to the network (this is a
      // ledger app: no financial response is ever served from a cache).
      // One tradeoff: generateSW's automatic offline SPA navigateFallback
      // is gone too -- direct navigation to any route still works today
      // via vercel.json's rewrite, just not with zero connectivity, which
      // is offline-first territory this project has explicitly deferred.
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
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
      injectManifest: {
        // Keep the precache list to what actually matters for a fast
        // repeat load -- images/fonts aren't worth bloating the manifest
        // with class content-hashed JS/CSS/HTML already covers the shell.
        globPatterns: ['**/*.{js,css,html}'],
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
