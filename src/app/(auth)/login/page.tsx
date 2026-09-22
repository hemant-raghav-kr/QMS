import { Suspense } from 'react';
import { LoginForm } from '@/features/authentication/components/LoginForm';

export const metadata = {
  title: 'Sign In',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center text-slate-400">Loading sign in...</div>}>
      <LoginForm />
    </Suspense>
  );
}
