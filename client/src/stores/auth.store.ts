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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) => set({ user }),

  checkAuth: async () => {
    try {
      const res = await api.get<{ user: User }>('/auth/me');
      set({ user: res.data.user, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      set({ user: null })
    }
  }
}))