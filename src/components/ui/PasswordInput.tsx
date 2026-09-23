'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: string;
  label?: string;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, label, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            type={showPassword ? 'text' : 'password'}
            ref={ref}
            className={cn(
              'flex h-10 w-full rounded-lg border border-border bg-card pl-3 pr-10 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
              error && 'border-destructive focus:border-destructive focus:ring-destructive/20',
              className
            )}
            {...props}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-r-lg transition-colors"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
