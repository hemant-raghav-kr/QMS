import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/types/database';
import { ShieldAlert, ShieldCheck, User } from 'lucide-react';

interface RoleBadgeProps {
  role?: UserRole | string | null;
  showIcon?: boolean;
}

export function RoleBadge({ role = 'MEMBER', showIcon = true }: RoleBadgeProps) {
  switch (role) {
    case 'SUPER_ADMIN':
      return (
        <Badge variant="destructive" className="gap-1 font-mono text-[11px]">
          {showIcon && <ShieldAlert className="h-3 w-3" />}
          SUPER ADMIN
        </Badge>
      );
    case 'ADMIN':
      return (
        <Badge variant="warning" className="gap-1 font-mono text-[11px]">
          {showIcon && <ShieldCheck className="h-3 w-3" />}
          ADMIN
        </Badge>
      );
    case 'MEMBER':
    default:
      return (
        <Badge variant="secondary" className="gap-1 font-mono text-[11px]">
          {showIcon && <User className="h-3 w-3" />}
          MEMBER
        </Badge>
      );
  }
}
