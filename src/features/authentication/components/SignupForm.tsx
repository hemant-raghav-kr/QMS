'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Layers } from 'lucide-react';

export function SignupForm() {
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.session) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setSuccess('Account created! Check your email for confirmation or sign in below.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
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
          <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
          <CardDescription className="mt-1">
            Join the Quartzite Management System
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <Alert variant="error" title="Registration error">
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success" title="Success">
              {success}
            </Alert>
          )}

          <Input
            label="Full Name"
            type="text"
            placeholder="Jane Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <PasswordInput
            label="Password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Create Account
          </Button>

          <div className="pt-2 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
            >
              Sign in
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
