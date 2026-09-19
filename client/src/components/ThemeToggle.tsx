import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThemeStore } from '@/stores/theme.store';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={className}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
      ) : (
        <Moon className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}