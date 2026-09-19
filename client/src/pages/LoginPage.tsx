import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@codev/shared';
import { Link, useNavigate } from 'react-router';
import { Eye, EyeOff, Loader2, Code2, Mail, Lock, Sparkles, ArrowRight } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { api, getApiErrorMessage } from '@/lib/api';
import { useAuthStore, type User } from '@/stores/auth.store';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      setServerError(null);
      const res = await api.post<{ user: User; accessToken: string }>('/auth/login', data);
      setUser(res.data.user);
      navigate('/');
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background text-foreground relative overflow-hidden font-sans selection:bg-primary/20 selection:text-primary">
      {/* 1. Subtle Dev Grid Background + Radial Mask */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* 2. Soft Ambient Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* 3. Top Navigation Bar */}
      <header className="w-full max-w-6xl mx-auto px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
            <Code2 size={18} />
          </div>
          <span className="font-bold tracking-tight text-lg">
            Code<span className="text-primary font-mono">V</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-full border border-border/50">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>CRDT Sync Online</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* 4. Center Auth Card */}
      <main className="w-full max-w-md mx-auto px-6 my-auto z-10">
        <div className="bg-card/75 backdrop-blur-xl border border-border/60 shadow-2xl shadow-black/10 dark:shadow-black/40 rounded-2xl p-7 sm:p-9 space-y-6">
          {/* Card Header */}
          <div className="space-y-2 text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <Sparkles size={12} />
              <span>Real-Time Collaborative IDE</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access your shared workspaces.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
            {/* Server Error Alert */}
            {serverError && (
              <div className="p-3 text-xs font-medium rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-foreground">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={15} />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  disabled={isSubmitting}
                  className="pl-9 h-9.5 text-sm bg-background/50 border-input hover:border-border transition-colors"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-destructive font-medium mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium text-foreground">
                  Password
                </Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={15} />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  className="pl-9 pr-9 h-9.5 text-sm bg-background/50 border-input hover:border-border transition-colors font-mono"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-destructive font-medium mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-9.5 text-sm font-medium mt-2 shadow-xs transition-all flex items-center justify-center gap-2 group"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in to workspace</span>
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </form>

          {/* Footer inside card */}
          <div className="pt-2 text-center text-xs text-muted-foreground border-t border-border/40">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-foreground font-semibold hover:text-primary transition-colors underline-offset-4 hover:underline">
              Create one now
            </Link>
          </div>
        </div>
      </main>

      {/* 5. Bottom Status Bar */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-4 text-center text-xs text-muted-foreground/60 z-10">
        CodeV &middot; Built with Fastify, PostgreSQL, Yjs & WebSockets
      </footer>
    </div>
  );
}