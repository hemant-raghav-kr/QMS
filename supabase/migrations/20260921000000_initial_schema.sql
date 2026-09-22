-- ==========================================================
-- Quartzite Management System (QMS) - Initial Schema & RLS
-- Migration: 20260921000000_initial_schema.sql
-- ==========================================================

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ROLES & STATUS DOMAIN CHECKS
-- Roles: SUPER_ADMIN, ADMIN, MEMBER
-- Meeting Types: INTERNAL, EXTERNAL
-- Meeting Statuses: SCHEDULED, LIVE, COMPLETED, CANCELLED
-- Attendance Statuses: PRESENT, LATE, ABSENT, EXCUSED, LEFT_EARLY

-- ==========================================================
-- 2. TABLE DEFINITIONS
-- ==========================================================

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'MEMBER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- MEETINGS
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  meeting_type TEXT NOT NULL DEFAULT 'INTERNAL' CHECK (meeting_type IN ('INTERNAL', 'EXTERNAL')),
  external_meeting_url TEXT,
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- MEETING PARTICIPANTS
CREATE TABLE IF NOT EXISTS public.meeting_participants (
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (meeting_id, user_id)
);

-- ATTENDANCE
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'LATE', 'ABSENT', 'EXCUSED', 'LEFT_EARLY')),
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  marked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT attendance_meeting_user_unique UNIQUE (meeting_id, user_id)
);

-- POINT RULES
CREATE TABLE IF NOT EXISTS public.point_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  points INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- POINT TRANSACTIONS (Points are derived as a transaction ledger, not a mutable balance)
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  rule_id UUID REFERENCES public.point_rules(id) ON DELETE SET NULL,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'INFO',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================================
-- 3. INDEXES FOR PERFORMANCE
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_at ON public.meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings(status);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user_id ON public.meeting_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_meeting_id ON public.attendance(meeting_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON public.point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ==========================================================
-- 4. SECURITY DEFINER HELPER FUNCTIONS (Prevent RLS recursion)
-- ==========================================================

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
  );
$$;

-- ==========================================================
-- 5. AUTOMATIC PROFILE CREATION & SUPER_ADMIN SEED TRIGGER
-- ==========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role TEXT;
BEGIN
  -- Initial Super Admin recognition for hemantraghavkr@gmail.com
  IF LOWER(NEW.email) = 'hemantraghavkr@gmail.com' THEN
    assigned_role := 'SUPER_ADMIN';
  ELSE
    assigned_role := 'MEMBER';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    LOWER(NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    assigned_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = CASE 
      WHEN LOWER(EXCLUDED.email) = 'hemantraghavkr@gmail.com' THEN 'SUPER_ADMIN' 
      ELSE public.profiles.role 
    END,
    updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_point_rules_updated_at BEFORE UPDATE ON public.point_rules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==========================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- PROFILES POLICIES
-- ----------------------------------------------------------
-- Any authenticated user can read profiles (needed for directory, participant pickers, meeting hosts)
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile details (excluding role)
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND (
      role = (SELECT role FROM public.profiles WHERE id = auth.uid()) 
      OR public.is_super_admin()
    )
  );

-- Only SUPER_ADMIN can update roles of any user
CREATE POLICY "Super Admins can manage any profile"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ----------------------------------------------------------
-- MEETINGS POLICIES
-- ----------------------------------------------------------
-- Admins can view all meetings. Members can view meetings they are invited to, or public meetings they created
CREATE POLICY "View meetings policy"
  ON public.meetings FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.meeting_participants
      WHERE meeting_participants.meeting_id = meetings.id
      AND meeting_participants.user_id = auth.uid()
    )
  );

-- Only Admins and Super Admins can insert/update/delete meetings
CREATE POLICY "Admins can insert meetings"
  ON public.meetings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update meetings"
  ON public.meetings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete meetings"
  ON public.meetings FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ----------------------------------------------------------
-- MEETING PARTICIPANTS POLICIES
-- ----------------------------------------------------------
CREATE POLICY "View meeting participants"
  ON public.meeting_participants FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.meeting_participants mp
      WHERE mp.meeting_id = meeting_participants.meeting_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage meeting participants"
  ON public.meeting_participants FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------
-- ATTENDANCE POLICIES
-- ----------------------------------------------------------
CREATE POLICY "Members view their own attendance, Admins view all"
  ON public.attendance FOR SELECT
  TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "Admins manage attendance"
  ON public.attendance FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------
-- POINT RULES POLICIES
-- ----------------------------------------------------------
-- Active rules viewable by all authenticated users
CREATE POLICY "View active point rules"
  ON public.point_rules FOR SELECT
  TO authenticated
  USING (active = true OR public.is_admin());

-- Only Super Admins can manage rules
CREATE POLICY "Super Admins manage point rules"
  ON public.point_rules FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ----------------------------------------------------------
-- POINT TRANSACTIONS POLICIES
-- ----------------------------------------------------------
-- Members view their own transactions; Admins view all transactions
CREATE POLICY "View point transactions"
  ON public.point_transactions FOR SELECT
  TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

-- Only Admins can insert/manage point transactions
CREATE POLICY "Admins can manage point transactions"
  ON public.point_transactions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------
-- ANNOUNCEMENTS POLICIES
-- ----------------------------------------------------------
-- All authenticated users can view announcements
CREATE POLICY "All authenticated users can view announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (true);

-- Admins can create, update, delete announcements
CREATE POLICY "Admins manage announcements"
  ON public.announcements FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------
-- NOTIFICATIONS POLICIES
-- ----------------------------------------------------------
-- Users can view their own notifications
CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can mark their notifications as read
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins / System can insert notifications
CREATE POLICY "Admins can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() OR user_id = auth.uid());

-- ----------------------------------------------------------
-- AUDIT LOGS POLICIES
-- ----------------------------------------------------------
-- Admins and Super Admins can view audit logs
CREATE POLICY "Admins view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Inserts are allowed by authenticated admins or system functions
CREATE POLICY "Admins can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- ==========================================================
-- 7. INITIAL SUPER ADMIN RETROACTIVE SYNC
-- (If hemantraghavkr@gmail.com is already registered in auth.users)
-- ==========================================================
UPDATE public.profiles
SET role = 'SUPER_ADMIN'
WHERE LOWER(email) = 'hemantraghavkr@gmail.com';
