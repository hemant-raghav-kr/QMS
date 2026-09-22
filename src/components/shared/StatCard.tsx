import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import { LucideIcon, ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  link?: string;
  linkText?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = 'text-emerald-600 dark:text-emerald-400',
  iconBg = 'bg-emerald-500/10 dark:bg-emerald-500/20',
  trend,
  link,
  linkText,
  className,
}: StatCardProps) {
  const content = (
    <Card className={cn('group overflow-hidden transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md', className)}>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          {Icon && (
            <div className={cn('rounded-xl p-2.5 transition-transform group-hover:scale-105', iconBg, iconColor)}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {value}
          </span>
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full',
                trend.isPositive
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
              )}
            >
              {trend.isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trend.value}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}

        {link && (
          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-medium text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
            <span>{linkText || 'View details'}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (link) {
    return <Link href={link} className="block">{content}</Link>;
  }

  return content;
}
