import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem('codev-theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (_) {
    // ignore localstorage errors
  }
  return 'dark'; // Default dark for CodeV IDE
};

export const useThemeStore = create<ThemeState>((set) => {
  const initialTheme = getInitialTheme();

  // Apply initial class on boot
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }

  // Cross-tab theme sync
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === 'codev-theme' && (e.newValue === 'light' || e.newValue === 'dark')) {
        const nextTheme = e.newValue as Theme;
        document.documentElement.classList.toggle('dark', nextTheme === 'dark');
        set({ theme: nextTheme });
      }
    });
  }

  return {
    theme: initialTheme,

    setTheme: (theme) => {
      try {
        localStorage.setItem('codev-theme', theme);
      } catch (_) {}
      document.documentElement.classList.toggle('dark', theme === 'dark');
      set({ theme });
    },

    toggleTheme: () => {
      set((state) => {
        const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
        try {
          localStorage.setItem('codev-theme', nextTheme);
        } catch (_) {}
        document.documentElement.classList.toggle('dark', nextTheme === 'dark');
        return { theme: nextTheme };
      });
    },
  };
});