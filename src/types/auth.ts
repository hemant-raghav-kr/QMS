import { UserRole } from './database';

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt?: string;
}

export interface AuthState {
  user: CurrentUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
