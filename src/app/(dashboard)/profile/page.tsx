'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { updateCurrentUserProfile } from '@/features/profiles/services/profileService';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils/formatters';
import { User, Shield, KeyRound, CheckCircle2, Mail, Calendar } from 'lucide-react';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const supabase = createClient();

  // Profile Details Form State
  const [fullName, setFullName] = React.useState('');
  const [avatarUrl, setAvatarUrl] = React.useState('');
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [profileSuccess, setProfileSuccess] = React.useState<string | null>(null);
  const [profileError, setProfileError] = React.useState<string | null>(null);

  // Password Update Form State
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);
  const [passwordSuccess, setPasswordSuccess] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);

  // Initialize with current user values
  React.useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!fullName.trim()) {
      setProfileError('Full name cannot be empty.');
      return;
    }

    setIsSavingProfile(true);

    try {
      const res = await updateCurrentUserProfile({
        full_name: fullName.trim(),
        avatar_url: avatarUrl.trim() || null,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to update profile.');
      }

      setProfileSuccess('Profile details updated successfully!');
      await refreshUser();
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while saving profile.';
      setProfileError(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordSuccess('Password successfully updated!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password.';
      setPasswordError(msg);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Profile & Settings"
        description="View your role, edit personal information, and update your security credentials"
      />

      {/* Profile Overview Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar
              src={avatarUrl || user?.avatarUrl}
              fallback={fullName || user?.fullName || user?.email || 'User'}
              size="lg"
              className="h-20 w-20 text-xl border-2 border-primary/20 shadow-sm"
            />
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">
                  {fullName || user?.fullName || 'QMS Member'}
                </h2>
                <RoleBadge role={user?.role} />
              </div>

              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {user?.email}
                </span>
                {user?.createdAt && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Member since {formatDate(user.createdAt)}
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground pt-1">
                Role and system permissions are managed by organization administrators.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Edit Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Personal Details
            </CardTitle>
            <CardDescription>
              Update your display name and public avatar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {profileSuccess && (
                <Alert variant="success" title="Success">
                  {profileSuccess}
                </Alert>
              )}

              {profileError && (
                <Alert variant="error" title="Error">
                  {profileError}
                </Alert>
              )}

              <Input
                label="Full Name"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <Input
                label="Avatar URL (Optional)"
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="flex h-10 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                />
                <p className="text-[11px] text-muted-foreground">
                  Registered account email is protected. Contact an administrator to request changes.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full sm:w-auto"
                  isLoading={isSavingProfile}
                >
                  Save Profile Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Change Password Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              Security & Credentials
            </CardTitle>
            <CardDescription>
              Update your account password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {passwordSuccess && (
                <Alert variant="success" title="Success">
                  {passwordSuccess}
                </Alert>
              )}

              {passwordError && (
                <Alert variant="error" title="Error">
                  {passwordError}
                </Alert>
              )}

              <PasswordInput
                label="New Password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

              <PasswordInput
                label="Confirm New Password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full sm:w-auto"
                  isLoading={isUpdatingPassword}
                >
                  Update Password
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
