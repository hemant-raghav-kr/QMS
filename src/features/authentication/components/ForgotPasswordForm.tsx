'use client';

import * as React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Layers, ArrowLeft } from 'lucide-react';

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const appUrl = (
        process.env.NEXT_PUBLIC_APP_URL ||
        (typeof window !== 'undefined' ? window.location.origin : 'https://quartzitemanagementsystem.vercel.app')
      ).replace(/\/+$/, '');

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${appUrl}/reset-password`,
      });

      if (resetError) throw resetError;

      setSuccess('If an account exists with this email, a password reset link has been dispatched.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to send password reset email.';
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
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription className="mt-1">
            Enter your email to receive recovery instructions
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleReset} className="space-y-4">
          {error && (
            <Alert variant="error" title="Error">
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success" title="Check your inbox">
              {success}
            </Alert>
          )}

          <Input
            label="Account Email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Send Reset Link
          </Button>

          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sign In
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
