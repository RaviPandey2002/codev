import { Code2, Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  subtext?: string;
  showSpinner?: boolean;
}

export function LoadingScreen({
  message,
  subtext,
  showSpinner = Boolean(message),
}: LoadingScreenProps) {
  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center bg-background text-foreground animate-in fade-in-0 duration-150 p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2.5 animate-pulse">
          <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
            <Code2 size={20} />
          </div>
          <span className="font-bold tracking-tight text-xl font-mono">
            Code<span className="text-primary">V</span>
          </span>
        </div>

        {(message || showSpinner) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-1">
            {showSpinner && <Loader2 size={13} className="animate-spin text-primary shrink-0" />}
            {message && <span>{message}</span>}
          </div>
        )}

        {subtext && (
          <p className="text-[11px] text-muted-foreground/70 font-mono text-center max-w-xs">{subtext}</p>
        )}
      </div>
    </div>
  );
}
