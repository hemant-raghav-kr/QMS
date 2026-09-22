-- ==========================================================
-- Quartzite Management System (QMS)
-- Migration: 20260922000001_remove_late_rule.sql
-- Description: Remove late rule and simplify attendance presence calculation
-- ==========================================================

-- 1. Remove late rule from point_rules
DELETE FROM public.point_rules WHERE condition_value = 'LATE';

-- 2. Update finalize_meeting_attendance to remove 5-minute late cutoff
CREATE OR REPLACE FUNCTION public.finalize_meeting_attendance(
  target_meeting_id UUID,
  p_actor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  processed_attendees INT,
  processed_points INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m_record RECORD;
  sess_record RECORD;
  total_secs INT;
  req_present_secs INT;
  calculated_status TEXT;
  attendees_count INT := 0;
  points_count INT := 0;
BEGIN
  -- Fetch meeting details
  SELECT id, scheduled_at, duration_minutes, status, title
  INTO m_record
  FROM public.meetings
  WHERE id = target_meeting_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meeting % not found', target_meeting_id;
  END IF;

  -- Required seconds for full presence: 80% of scheduled duration
  req_present_secs := FLOOR((COALESCE(m_record.duration_minutes, 60) * 60) * 0.80);

  -- 1. Loop through all users who participated in sessions
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

    -- Late rule removed: presence is determined by meeting duration (>= 80% is PRESENT)
    IF total_secs >= req_present_secs THEN
      calculated_status := 'PRESENT';
    ELSIF total_secs > 0 THEN
      calculated_status := 'LEFT_EARLY';
    ELSE
      calculated_status := 'ABSENT';
    END IF;

    -- Upsert attendance record for attendee
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
      status = CASE 
        WHEN attendance.overridden_by IS NOT NULL THEN attendance.status 
        ELSE EXCLUDED.status 
      END,
      joined_at = EXCLUDED.joined_at,
      left_at = EXCLUDED.left_at,
      updated_at = timezone('utc'::text, now());

    attendees_count := attendees_count + 1;
  END LOOP;

  -- 2. Mark invited participants who never joined as ABSENT
  INSERT INTO public.attendance (
    meeting_id,
    user_id,
    status,
    joined_at,
    left_at
  )
  SELECT
    mp.meeting_id,
    mp.user_id,
    'ABSENT',
    NULL,
    NULL
  FROM public.meeting_participants mp
  LEFT JOIN public.attendance a ON a.meeting_id = mp.meeting_id AND a.user_id = mp.user_id
  WHERE mp.meeting_id = target_meeting_id
    AND a.id IS NULL
  ON CONFLICT (meeting_id, user_id) DO NOTHING;

  -- 3. Trigger automated points evaluation via process_meeting_points
  SELECT count INTO points_count
  FROM public.process_meeting_points(target_meeting_id, p_actor_id);

  RETURN QUERY SELECT attendees_count, points_count;
END;
$$;
