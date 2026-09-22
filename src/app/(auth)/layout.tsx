import * as React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col justify-center items-center p-4 sm:p-6 bg-slate-900 text-slate-100">
      <div className="w-full max-w-md">
        {children}
      </div>
      <footer className="mt-8 text-center text-xs text-slate-500">
        Quartzite Management System · Secure Internal Access
      </footer>
    </div>
  );
}
