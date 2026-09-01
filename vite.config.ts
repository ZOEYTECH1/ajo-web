import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';

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
  ],
  resolve: {
    alias: { '@': `${import.meta.dirname}/src` },
  },
  build: {
    // Generate source maps so Sentry can map minified stack traces back to source.
    sourcemap: true,
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
