import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';


interface CustomRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3007',
  // CRITICAL: Tells the browser to send & save httpOnly cookies across ports (5173 ↔ 3007)
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<unknown> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: { code?: string; message?: string } }>) => {
    const originalRequest = error.config as CustomRequestConfig | undefined;

    if (!originalRequest || originalRequest._retry) return Promise.reject(error);

    const errorCode = error.response?.data?.error?.code;
    const status = error.response?.status;
    const url = originalRequest.url || '';

    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh');

    if (status === 401 && errorCode === 'TOKEN_EXPIRED' && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        // Deduplication: If 3 requests fail at the same time, they all await the SAME refresh call
        if (!refreshPromise) {
          refreshPromise = api.post('/auth/refresh').finally(() => {
            refreshPromise = null;
          });
        }
        await refreshPromise;
        // Re-execute original request with fresh cookies now in place
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token was also invalid/expired -> user must re-login
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);

  }
)

export function getApiErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message || error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
