import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowLeft,
  CheckCircle2,
  Code2,
  Download,
  ExternalLink,
  FolderOpen,
  Globe,
  Loader2,
  Puzzle,
  Server,
  Settings,
  Zap,
} from 'lucide-react';
import {
  getExtensionDownloadUrl,
  getExtensionInfoApi,
  type ExtensionInfoResponse,
} from '@/api/extension';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';

export default function ExtensionPage() {
  const user = useAuthStore((s) => s.user);
  const [info, setInfo] = useState<ExtensionInfoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [downloaded, setDownloaded] = useState(false);

  const downloadUrl = getExtensionDownloadUrl();

  useEffect(() => {
    let mounted = true;
    getExtensionInfoApi()
      .then((res) => {
        if (mounted) setInfo(res);
      })
      .catch(() => {
        // Offline / unconfigured fallback info
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleDownloadClick = () => {
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 4000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative overflow-hidden font-sans selection:bg-primary/20 selection:text-primary">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[520px] h-[280px] bg-primary/10 rounded-full blur-[110px] pointer-events-none" />

      {/* Top Navigation */}
      <header className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between z-10 border-b border-border/40">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Link to={user ? '/dashboard' : '/'}>
              <ArrowLeft size={14} />
              <span>{user ? 'Dashboard' : 'Home'}</span>
            </Link>
          </Button>
          <div className="h-4 w-[1px] bg-border/60" />
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Code2 size={15} />
            </div>
            <span className="font-bold tracking-tight text-sm">
              Code<span className="text-primary font-mono">V</span> Companion
            </span>
          </div>
        </div>

        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 z-10 space-y-8">
        {/* Hero Card */}
        <section className="rounded-2xl border border-border/80 bg-card/70 backdrop-blur-sm p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Puzzle size={12} />
                <span>Chrome / Brave / Edge Extension {info?.version ? `v${info.version}` : ''}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                1-Click Import from Codeforces &amp; LeetCode
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Import complete problem stories, math formulas, limits, tags, and all sample test cases directly from your authenticated browser tab—zero Cloudflare issues and no manual copy-pasting.
              </p>
            </div>

            <div className="shrink-0 pt-1">
              <Button
                asChild
                size="lg"
                onClick={handleDownloadClick}
                className="gap-2 font-semibold shadow-sm bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer w-full sm:w-auto"
              >
                <a href={downloadUrl} download="codev-arena-companion.zip">
                  {downloaded ? <CheckCircle2 size={16} /> : <Download size={16} />}
                  <span>{downloaded ? 'Downloading ZIP...' : 'Download Extension (.zip)'}</span>
                </a>
              </Button>
            </div>
          </div>

          {/* Pre-configured Endpoint Preview */}
          <div className="rounded-xl border border-border/60 bg-background/60 p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Server size={13} className="text-primary" />
                <span>Auto-Configured Server Endpoints</span>
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                Baked into download from server env
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                <Loader2 size={13} className="animate-spin" />
                <span>Detecting server configuration...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <div className="px-3 py-2 rounded-lg bg-card border border-border/60 flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Zap size={12} className="text-emerald-500 shrink-0" />
                    <span>API:</span>
                  </span>
                  <span className="text-foreground truncate">{info?.apiUrl || 'http://localhost:3007'}</span>
                </div>
                <div className="px-3 py-2 rounded-lg bg-card border border-border/60 flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Globe size={12} className="text-sky-500 shrink-0" />
                    <span>Web:</span>
                  </span>
                  <span className="text-foreground truncate">{info?.clientUrl || window.location.origin}</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 3-Step Installation Guide */}
        <section className="space-y-4">
          <h2 className="text-base font-bold tracking-tight">Install in 30 Seconds</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border/70 bg-card/50 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="h-6 w-6 rounded-full bg-primary/15 text-primary font-mono text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <Download size={15} className="text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-sm">Download &amp; Extract</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Click the download button above and extract <code className="px-1 py-0.5 rounded bg-muted text-foreground">codev-arena-companion.zip</code> to a permanent folder.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card/50 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="h-6 w-6 rounded-full bg-primary/15 text-primary font-mono text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <Settings size={15} className="text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-sm">Enable Developer Mode</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Open <code className="px-1 py-0.5 rounded bg-muted text-foreground">chrome://extensions</code> in Chrome, Brave, or Edge and toggle <strong>Developer mode</strong> ON in the top-right.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card/50 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="h-6 w-6 rounded-full bg-primary/15 text-primary font-mono text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <FolderOpen size={15} className="text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-sm">Load Unpacked</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Click <strong>Load unpacked</strong>, select the extracted folder, and click <strong>Open in CodeV</strong> directly on any Codeforces or LeetCode problem.
              </p>
            </div>
          </div>
        </section>

        {/* Tip Footer */}
        <section className="rounded-xl border border-border/60 bg-muted/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>
            <strong className="text-foreground">Switching domains later?</strong> Click the gear icon inside the extension popup anytime to edit or test your Backend API URL without reinstalling.
          </div>
          <div className="flex items-center gap-3 shrink-0 font-mono">
            <a
              href="https://codeforces.com/problemset"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>Codeforces</span>
              <ExternalLink size={11} />
            </a>
            <span>&middot;</span>
            <a
              href="https://leetcode.com/problemset/"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>LeetCode</span>
              <ExternalLink size={11} />
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
