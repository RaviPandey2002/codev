import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const getInitialTheme = (): Theme => {
  const saved = localStorage.getItem('codev-theme') as Theme | null;
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'dark'; // Default dark for IDE
};

export const useThemeStore = create<ThemeState>((set) => {
  const initialTheme = getInitialTheme();
  
  // Apply initial class on boot
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }

  return {
    theme: initialTheme,

    setTheme: (theme) => {
      localStorage.setItem('codev-theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
      set({ theme });
    },

    toggleTheme: () => {
      set((state) => {
        const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('codev-theme', nextTheme);
        document.documentElement.classList.toggle('dark', nextTheme === 'dark');
        return { theme: nextTheme };
      });
    },
  };
});