import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Code2,
  Cpu,
  ExternalLink,
  FolderGit2,
  Loader2,
  Plus,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { getCompanionProblemByTokenApi, getLatestCompanionProblemApi } from '@/api/problems';
import { createRoomApi, listRoomsApi } from '@/api/rooms';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api';
import {
  getProblemExternalUrl,
  type ProblemData,
  type RoomDTO,
  type RoomTemplate,
} from '@codev/shared';

export default function ImportLauncherPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [problem, setProblem] = useState<ProblemData | null>(null);
  const [rooms, setRooms] = useState<RoomDTO[]>([]);
  const [selectedLang, setSelectedLang] = useState<RoomTemplate>('cpp');
  const [isLoading, setIsLoading] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setIsLoading(true);
        setError(null);

        const [probData, roomList] = await Promise.all([
          token
            ? getCompanionProblemByTokenApi(token)
            : getLatestCompanionProblemApi(0).then((res) => {
                if (!res?.problem) {
                  throw new Error('No recently imported problem found. Click Open in CodeV again.');
                }
                return res.problem;
              }),
          listRoomsApi().catch(() => [] as RoomDTO[]),
        ]);

        if (!mounted) return;
        setProblem(probData);

        // Put CP Arena rooms first, sorted by most recently updated
        const sorted = [...roomList].sort((a, b) => {
          const aCp = a.sourceType === 'COMPILER' ? 1 : 0;
          const bCp = b.sourceType === 'COMPILER' ? 1 : 0;
          if (aCp !== bCp) return bCp - aCp;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
        setRooms(sorted);
      } catch (err) {
        if (mounted) {
          setError(getApiErrorMessage(err, 'Could not load imported problem.'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [token]);

  const handleCreateAndOpen = async () => {
    if (!problem || isLaunching) return;
    try {
      setIsLaunching(true);
      setError(null);
      const room = await createRoomApi({
        name: problem.title.slice(0, 60),
        template: selectedLang,
        sourceType: 'COMPILER',
        arenaPlatform: problem.platform || 'CODEFORCES',
      });
      const query = token ? `?importToken=${encodeURIComponent(token)}` : '';
      navigate(`/rooms/${room.id}${query}`, {
        state: { importedProblem: problem },
      });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create workspace'));
      setIsLaunching(false);
    }
  };

  const handleOpenExistingRoom = (roomId: string) => {
    if (!problem || isLaunching) return;
    const query = token ? `?importToken=${encodeURIComponent(token)}` : '';
    navigate(`/rooms/${roomId}${query}`, {
      state: { importedProblem: problem },
    });
  };

  const externalUrl = problem ? getProblemExternalUrl(problem) : null;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative overflow-hidden font-sans selection:bg-primary/20 selection:text-primary">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[260px] bg-primary/10 rounded-full blur-[110px] pointer-events-none" />

      <header className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between z-10 border-b border-border/40">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Link to="/dashboard">
              <ArrowLeft size={14} />
              <span>Dashboard</span>
            </Link>
          </Button>
          <div className="h-4 w-[1px] bg-border/60" />
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Code2 size={15} />
            </div>
            <span className="font-bold tracking-tight text-sm">
              Import to Code<span className="text-primary font-mono">V</span>
            </span>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 z-10 space-y-6">
        {isLoading ? (
          <div className="rounded-2xl border border-border/70 bg-card/70 p-10 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 size={24} className="animate-spin text-primary" />
            <p className="text-xs font-mono">Loading captured problem...</p>
          </div>
        ) : error && !problem ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-4 text-center">
            <p className="text-sm font-semibold text-destructive">{error}</p>
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        ) : problem ? (
          <>
            {error && (
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2.5 font-mono">
                {error}
              </p>
            )}

            {/* Captured Problem Preview */}
            <section className="rounded-2xl border border-border/80 bg-card/75 backdrop-blur-sm p-6 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold border border-emerald-500/25">
                      CAPTURED VIA EXTENSION
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary font-bold">
                      {problem.platform}
                    </span>
                    {problem.difficulty && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 font-semibold">
                        {problem.difficulty}
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl font-bold tracking-tight text-foreground">
                    {problem.title}
                  </h1>
                </div>

                {externalUrl && (
                  <a
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border/60 bg-muted/40 hover:bg-muted text-xs text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                    title="Open original problem"
                  >
                    <span>Source</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} className="text-amber-500" />
                  {problem.timeLimit || '2.0s'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Cpu size={12} className="text-emerald-500" />
                  {problem.memoryLimit || '256 MB'}
                </span>
                <span>&middot;</span>
                <span>{problem.sampleCases?.length || 0} sample test cases</span>
              </div>

              {/* Action 1: Create New CP Arena */}
              <div className="pt-3 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-primary shrink-0" />
                  <label className="text-xs font-medium text-muted-foreground">Language:</label>
                  <select
                    value={selectedLang}
                    onChange={(e) => setSelectedLang(e.target.value as RoomTemplate)}
                    className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="cpp">C++20</option>
                    <option value="python">Python 3</option>
                    <option value="c">C17</option>
                    <option value="typescript">TypeScript</option>
                    <option value="javascript">JavaScript</option>
                  </select>
                </div>

                <Button
                  size="sm"
                  disabled={isLaunching}
                  onClick={handleCreateAndOpen}
                  className="gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                >
                  {isLaunching ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  <span>Create New CP Arena &amp; Open</span>
                  <ArrowRight size={14} />
                </Button>
              </div>
            </section>

            {/* Action 2: Open in Existing Room */}
            {rooms.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-500" />
                  <span>Or Add to Existing Workspace</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {rooms.slice(0, 8).map((ws) => (
                    <button
                      key={ws.id}
                      type="button"
                      disabled={isLaunching}
                      onClick={() => handleOpenExistingRoom(ws.id)}
                      className="p-3 rounded-xl border border-border/70 bg-card/50 hover:bg-accent/40 hover:border-primary/40 transition-all text-left flex items-center justify-between gap-2 cursor-pointer group disabled:opacity-50"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <FolderGit2 size={13} className="text-primary shrink-0" />
                          <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {ws.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground pl-5">
                          <span>#{ws.id}</span>
                          <span>&middot;</span>
                          <span>{ws.sourceType === 'COMPILER' ? ws.arenaPlatform || 'CP Arena' : 'Editor'}</span>
                        </div>
                      </div>
                      <ArrowRight size={13} className="text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
