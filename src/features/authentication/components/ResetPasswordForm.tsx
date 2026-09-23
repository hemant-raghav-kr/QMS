'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Layers } from 'lucide-react';

export function ResetPasswordForm() {
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password.';
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
          <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
          <CardDescription className="mt-1">
            Choose a strong password for your account
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        {success ? (
          <div className="space-y-4 text-center">
            <Alert variant="success" title="Password Updated">
              Your password has been successfully updated. Redirecting to your dashboard...
            </Alert>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {error && (
              <Alert variant="error" title="Error">
                {error}
              </Alert>
            )}

            <PasswordInput
              label="New Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <PasswordInput
              label="Confirm New Password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Update Password
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
