'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Layers } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (data.user) {
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials. Please verify your email and password.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-slate-200/80 shadow-xl dark:border-slate-800">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow">
          <Layers className="h-6 w-6" />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold">Sign In to QMS</CardTitle>
          <CardDescription className="mt-1">
            Quartzite Management System internal workspace
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <Alert variant="error" title="Authentication failed">
              {error}
            </Alert>
          )}

          <Input
            label="Email Address"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Sign In
          </Button>

          <div className="pt-2 text-center text-xs text-slate-500">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
            >
              Sign up
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
