import { create } from 'zustand';
import { api } from '@/lib/api';

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

let refreshInterval: ReturnType<typeof setInterval> | null = null;

function setupRefreshHeartbeat(isLoggedIn: boolean) {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
  if (!isLoggedIn) return;

  // Silently refresh token every 10 minutes while active in session
  refreshInterval = setInterval(async () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }
    try {
      await api.post('/auth/refresh');
    } catch {
      // If refresh fails, let standard 401 interceptor handle or prompt re-login
    }
  }, 10 * 60 * 1000);
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) => {
    setupRefreshHeartbeat(Boolean(user));
    set({ user, isLoading: false });
  },

  checkAuth: async () => {
    try {
      const res = await api.get<{ user: User }>('/auth/me');
      setupRefreshHeartbeat(true);
      set({ user: res.data.user, isLoading: false });
    } catch {
      setupRefreshHeartbeat(false);
      set({ user: null, isLoading: false });
    }
  },

  logout: async () => {
    setupRefreshHeartbeat(false);
    try {
      await api.post('/auth/logout');
    } finally {
      set({ user: null, isLoading: false });
    }
  }
}))