-- ==========================================================
-- Quartzite Management System (QMS) - Phase 2: Complete Meeting System Schema
-- Migration: 20260921000001_phase2_meetings_schema.sql
-- ==========================================================

-- ==========================================================
-- 1. MEETING ATTENDANCE SESSIONS TABLE
-- Supports multi-session participant tracking (joins, leaves, rejoins)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.meeting_attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  left_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_meeting_user 
  ON public.meeting_attendance_sessions(meeting_id, user_id);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_session_id 
  ON public.meeting_attendance_sessions(session_id);

-- ==========================================================
-- 2. MEETING CHAT MESSAGES TABLE
-- Persistent chat record for meeting sessions
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.meeting_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(trim(content)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_meeting_created 
  ON public.meeting_chat_messages(meeting_id, created_at ASC);

-- ==========================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ==========================================================
ALTER TABLE public.meeting_attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_chat_messages ENABLE ROW LEVEL SECURITY;

-- ATTENDANCE SESSIONS POLICIES
CREATE POLICY "View attendance sessions"
  ON public.meeting_attendance_sessions FOR SELECT
  TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "Insert own attendance session"
  ON public.meeting_attendance_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update own attendance session"
  ON public.meeting_attendance_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- CHAT MESSAGES POLICIES
CREATE POLICY "View meeting chat messages"
  ON public.meeting_chat_messages FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.meeting_participants
      WHERE meeting_participants.meeting_id = meeting_chat_messages.meeting_id
      AND meeting_participants.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = meeting_chat_messages.meeting_id
      AND meetings.created_by = auth.uid()
    )
  );

CREATE POLICY "Insert meeting chat messages"
  ON public.meeting_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND (
      public.is_admin() OR
      EXISTS (
        SELECT 1 FROM public.meeting_participants
        WHERE meeting_participants.meeting_id = meeting_chat_messages.meeting_id
        AND meeting_participants.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.meetings
        WHERE meetings.id = meeting_chat_messages.meeting_id
        AND meetings.created_by = auth.uid()
      )
    )
  );

-- ==========================================================
-- 4. ATTENDANCE AGGREGATION & FINALIZATION FUNCTION
-- Evaluates sessions at meeting conclusion for Phase 3 Points Engine
-- ==========================================================
CREATE OR REPLACE FUNCTION public.finalize_meeting_attendance(target_meeting_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m_record RECORD;
  sess_record RECORD;
  calculated_status TEXT;
  total_secs INTEGER;
  req_present_secs INTEGER;
BEGIN
  -- Retrieve meeting details
  SELECT id, scheduled_at, duration_minutes INTO m_record
  FROM public.meetings
  WHERE id = target_meeting_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  req_present_secs := (m_record.duration_minutes * 60 * 0.80);

  -- Loop through all users who participated in sessions for this meeting
  FOR sess_record IN
    SELECT
      user_id,
      SUM(COALESCE(duration_seconds, 0)) AS total_duration,
      MIN(joined_at) AS first_join,
      MAX(COALESCE(left_at, joined_at)) AS last_leave
    FROM public.meeting_attendance_sessions
    WHERE meeting_id = target_meeting_id
    GROUP BY user_id
  LOOP
    total_secs := sess_record.total_duration;

    IF total_secs >= req_present_secs THEN
      calculated_status := 'PRESENT';
    ELSIF sess_record.first_join > (m_record.scheduled_at + INTERVAL '5 minutes') THEN
      calculated_status := 'LATE';
    ELSIF total_secs > 0 THEN
      calculated_status := 'LEFT_EARLY';
    ELSE
      calculated_status := 'ABSENT';
    END IF;

    -- Upsert attendance record
    INSERT INTO public.attendance (
      meeting_id,
      user_id,
      status,
      joined_at,
      left_at,
      updated_at
    ) VALUES (
      target_meeting_id,
      sess_record.user_id,
      calculated_status,
      sess_record.first_join,
      sess_record.last_leave,
      timezone('utc'::text, now())
    )
    ON CONFLICT (meeting_id, user_id) DO UPDATE SET
      status = EXCLUDED.status,
      joined_at = EXCLUDED.joined_at,
      left_at = EXCLUDED.left_at,
      updated_at = timezone('utc'::text, now());
  END LOOP;
END;
$$;
