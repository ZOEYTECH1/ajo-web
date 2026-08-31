/**
 * Centralised Axios instance for all backend API calls.
 *
 * Features:
 *  - JWT Bearer token automatically attached from localStorage
 *  - 401 handling: transparent token-refresh with request queuing
 *  - 429 handling: exponential back-off with up to MAX_RETRIES attempts
 */
import axios, { type AxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor ────────────────────────────────────────────────────

/** Attach JWT token to every outgoing request. */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Token-refresh state ────────────────────────────────────────────────────

/** Whether a token refresh is already in-flight (prevents loops). */
let isRefreshing = false;
/** Callbacks to replay once the new token arrives. */
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

// ─── Exponential back-off helper ────────────────────────────────────────────

const MAX_RETRIES = 4;

/**
 * Sleep for `ms` milliseconds.
 * Used by the 429 back-off logic.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate the delay (ms) for a given retry attempt using exponential
 * back-off with jitter: base * 2^attempt + random jitter (up to 200 ms).
 *
 * @param attempt - Zero-based attempt index (0 = first retry)
 * @param baseMs  - Initial delay in milliseconds (default 1 000 ms)
 */
function backoffDelay(attempt: number, baseMs = 1000): number {
  return baseMs * Math.pow(2, attempt) + Math.random() * 200;
}

// ─── Response interceptor ────────────────────────────────────────────────────

/**
 * Intercepts API responses to handle:
 *  - 401 Unauthorized → attempt token refresh, then replay the original request
 *  - 429 Too Many Requests → retry with exponential back-off (up to MAX_RETRIES)
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
      _retryCount?: number;
    };

    const status: number | undefined = error.response?.status;

    // ── 429 Too Many Requests — exponential back-off ─────────────────────
    if (status === 429) {
      const attempt = originalRequest._retryCount ?? 0;

      if (attempt < MAX_RETRIES) {
        // Honour Retry-After header when present; fall back to exponential delay.
        const retryAfterHeader = error.response?.headers?.['retry-after'];
        const delayMs = retryAfterHeader
          ? Number(retryAfterHeader) * 1000
          : backoffDelay(attempt);

        originalRequest._retryCount = attempt + 1;
        await sleep(delayMs);
        return api(originalRequest);
      }

      // Exhausted retries — reject with a friendly error message.
      const rateLimitError = new Error(
        'Too many requests. Please wait a moment and try again.',
      );
      return Promise.reject(rateLimitError);
    }

    // ── 401 Unauthorized — try to refresh the access token ───────────────
    const isAuthEndpoint = originalRequest.url?.includes('/auth/');

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      const refresh = localStorage.getItem('refresh');

      if (!refresh) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken: string) => {
            if (originalRequest.headers) {
              (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
            } else {
              originalRequest.headers = { Authorization: `Bearer ${newToken}` };
            }
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post('/api/auth/token/refresh/', { refresh });
        const newAccess: string = response.data.access;
        localStorage.setItem('access', newAccess);
        isRefreshing = false;
        onRefreshed(newAccess);

        if (originalRequest.headers) {
          (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newAccess}`;
        } else {
          originalRequest.headers = { Authorization: `Bearer ${newAccess}` };
        }
        return api(originalRequest);
      } catch {
        isRefreshing = false;
        refreshSubscribers = [];
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
