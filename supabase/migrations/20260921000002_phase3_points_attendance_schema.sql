-- ==========================================================
-- Quartzite Management System (QMS) - Phase 3: Points & Attendance Automation
-- Migration: 20260921000002_phase3_points_attendance_schema.sql
-- ==========================================================

-- 1. EXTEND POINT RULES TABLE
ALTER TABLE public.point_rules
  ADD COLUMN IF NOT EXISTS condition_value TEXT;

-- Seed or ensure standard attendance point rules
INSERT INTO public.point_rules (name, description, trigger_type, condition_value, points, active)
VALUES
  ('Meeting Attendance - Present', 'Points awarded for full meeting presence (>= 80% duration)', 'ATTENDANCE_STATUS', 'PRESENT', 5, true),
  ('Meeting Attendance - Late', 'Points awarded for late arrival to scheduled meeting', 'ATTENDANCE_STATUS', 'LATE', 2, true),
  ('Meeting Attendance - Left Early', 'Points awarded for leaving meeting before required duration', 'ATTENDANCE_STATUS', 'LEFT_EARLY', 1, true),
  ('Meeting Attendance - Absent', 'Deduction for unexcused absence from scheduled meeting', 'ATTENDANCE_STATUS', 'ABSENT', -5, true),
  ('Meeting Attendance - Excused', 'Zero-point record for approved absence leave', 'ATTENDANCE_STATUS', 'EXCUSED', 0, true)
ON CONFLICT DO NOTHING;

-- 2. EXTEND POINT TRANSACTIONS TABLE
ALTER TABLE public.point_transactions
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS reversal_of_id UUID REFERENCES public.point_transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Add check constraint for valid transaction types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_point_transaction_type'
  ) THEN
    ALTER TABLE public.point_transactions
      ADD CONSTRAINT check_point_transaction_type
      CHECK (type IN ('AUTOMATIC', 'MANUAL', 'ADJUSTMENT', 'REVERSAL'));
  END IF;
END $$;

-- Idempotency unique constraint to prevent duplicate automatic transactions
CREATE UNIQUE INDEX IF NOT EXISTS idx_point_transactions_idempotency
  ON public.point_transactions(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_point_transactions_type
  ON public.point_transactions(type);

CREATE INDEX IF NOT EXISTS idx_point_transactions_reversal_of
  ON public.point_transactions(reversal_of_id);

CREATE INDEX IF NOT EXISTS idx_point_transactions_meeting_user
  ON public.point_transactions(meeting_id, user_id);

-- 3. EXTEND ATTENDANCE TABLE WITH OVERRIDE TRACKING
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS overridden_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS override_reason TEXT,
  ADD COLUMN IF NOT EXISTS original_status TEXT;

-- 4. ENHANCED ATTENDANCE FINALIZATION
-- Calculates durations, handles rejoins, and marks unjoined invitees as ABSENT
CREATE OR REPLACE FUNCTION public.finalize_meeting_attendance(target_meeting_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m_record RECORD;
  sess_record RECORD;
  invitee_record RECORD;
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

    IF total_secs >= req_present_secs THEN
      calculated_status := 'PRESENT';
    ELSIF sess_record.first_join > (m_record.scheduled_at + INTERVAL '5 minutes') THEN
      calculated_status := 'LATE';
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
  END LOOP;

  -- 2. Mark invited participants who never joined as ABSENT
  FOR invitee_record IN
    SELECT mp.user_id
    FROM public.meeting_participants mp
    WHERE mp.meeting_id = target_meeting_id
    AND NOT EXISTS (
      SELECT 1 FROM public.attendance a
      WHERE a.meeting_id = target_meeting_id AND a.user_id = mp.user_id
    )
  LOOP
    INSERT INTO public.attendance (
      meeting_id,
      user_id,
      status,
      joined_at,
      left_at,
      updated_at
    ) VALUES (
      target_meeting_id,
      invitee_record.user_id,
      'ABSENT',
      NULL,
      NULL,
      timezone('utc'::text, now())
    )
    ON CONFLICT (meeting_id, user_id) DO NOTHING;
  END LOOP;
END;
$$;

-- 5. AUTOMATIC POINT EVALUATION FOR MEETING ATTENDANCE
-- Idempotently evaluates finalized attendance and creates point transactions
CREATE OR REPLACE FUNCTION public.process_meeting_points(target_meeting_id UUID, p_actor_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m_title TEXT;
  att_rec RECORD;
  matching_rule RECORD;
  v_idem_key TEXT;
  v_tx_id UUID;
  v_notif_title TEXT;
  v_notif_msg TEXT;
BEGIN
  -- Retrieve meeting title
  SELECT title INTO m_title FROM public.meetings WHERE id = target_meeting_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Loop through all finalized attendance records for this meeting
  FOR att_rec IN
    SELECT a.id AS attendance_id, a.user_id, a.status
    FROM public.attendance a
    WHERE a.meeting_id = target_meeting_id
  LOOP
    -- Look up matching active rule for this status
    SELECT id, name, points INTO matching_rule
    FROM public.point_rules
    WHERE trigger_type = 'ATTENDANCE_STATUS'
      AND condition_value = att_rec.status
      AND active = true
    LIMIT 1;

    IF FOUND THEN
      v_idem_key := 'meeting:' || target_meeting_id || ':user:' || att_rec.user_id;

      -- Check if transaction already recorded for this meeting & user
      IF NOT EXISTS (
        SELECT 1 FROM public.point_transactions
        WHERE idempotency_key = v_idem_key
      ) THEN
        -- Insert point transaction
        INSERT INTO public.point_transactions (
          user_id,
          amount,
          reason,
          type,
          rule_id,
          meeting_id,
          idempotency_key,
          created_by,
          created_at
        ) VALUES (
          att_rec.user_id,
          matching_rule.points,
          matching_rule.name || ' — ' || m_title,
          'AUTOMATIC',
          matching_rule.id,
          target_meeting_id,
          v_idem_key,
          p_actor_id,
          timezone('utc'::text, now())
        )
        RETURNING id INTO v_tx_id;

        -- Create notification
        IF matching_rule.points > 0 THEN
          v_notif_title := '⭐ +' || matching_rule.points || ' points earned';
          v_notif_msg := 'You received ' || matching_rule.points || ' points for attending ' || m_title || '.';
        ELSIF matching_rule.points < 0 THEN
          v_notif_title := matching_rule.points || ' points deduction';
          v_notif_msg := 'Your points changed by ' || matching_rule.points || ' due to ' || att_rec.status || ' status in ' || m_title || '.';
        ELSE
          v_notif_title := 'Attendance Recorded';
          v_notif_msg := 'Attendance recorded as ' || att_rec.status || ' for ' || m_title || '.';
        END IF;

        INSERT INTO public.notifications (
          user_id,
          title,
          message,
          type,
          read,
          created_at
        ) VALUES (
          att_rec.user_id,
          v_notif_title,
          v_notif_msg,
          'POINTS',
          false,
          timezone('utc'::text, now())
        );

        -- Create audit log
        INSERT INTO public.audit_logs (
          actor_id,
          action,
          target_type,
          target_id,
          metadata,
          created_at
        ) VALUES (
          p_actor_id,
          'AUTO_POINT_AWARDED',
          'point_transactions',
          v_tx_id::text,
          jsonb_build_object(
            'meeting_id', target_meeting_id,
            'user_id', att_rec.user_id,
            'status', att_rec.status,
            'amount', matching_rule.points,
            'rule_name', matching_rule.name
          ),
          timezone('utc'::text, now())
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- 6. ATTENDANCE OVERRIDE WITH ATOMIC POINT REVERSAL & RECALCULATION
CREATE OR REPLACE FUNCTION public.override_attendance_with_points(
  p_meeting_id UUID,
  p_user_id UUID,
  p_new_status TEXT,
  p_reason TEXT,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meeting_title TEXT;
  v_old_status TEXT;
  v_old_tx RECORD;
  v_new_rule RECORD;
  v_rev_tx_id UUID;
  v_new_tx_id UUID;
  v_net_change INTEGER := 0;
BEGIN
  -- Verify meeting exists
  SELECT title INTO v_meeting_title FROM public.meetings WHERE id = p_meeting_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Meeting not found');
  END IF;

  -- Get current attendance status
  SELECT status INTO v_old_status
  FROM public.attendance
  WHERE meeting_id = p_meeting_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Attendance record not found');
  END IF;

  IF v_old_status = p_new_status THEN
    RETURN jsonb_build_object('success', false, 'error', 'New status matches current status');
  END IF;

  -- 1. Update attendance record
  UPDATE public.attendance
  SET
    status = p_new_status,
    original_status = COALESCE(original_status, v_old_status),
    overridden_by = p_admin_id,
    override_reason = p_reason,
    updated_at = timezone('utc'::text, now())
  WHERE meeting_id = p_meeting_id AND user_id = p_user_id;

  -- 2. Find any active non-reversed point transaction for this meeting and user
  SELECT pt.id, pt.amount, pt.reason INTO v_old_tx
  FROM public.point_transactions pt
  WHERE pt.meeting_id = p_meeting_id
    AND pt.user_id = p_user_id
    AND pt.type IN ('AUTOMATIC', 'ADJUSTMENT')
    AND NOT EXISTS (
      SELECT 1 FROM public.point_transactions r
      WHERE r.reversal_of_id = pt.id
    )
  ORDER BY pt.created_at DESC
  LIMIT 1;

  -- 3. If an existing transaction exists, create a reversal
  IF FOUND AND v_old_tx.amount != 0 THEN
    INSERT INTO public.point_transactions (
      user_id,
      amount,
      reason,
      type,
      reversal_of_id,
      meeting_id,
      created_by,
      created_at
    ) VALUES (
      p_user_id,
      -v_old_tx.amount,
      'Reversal of ' || v_old_tx.amount || ' pts (' || v_old_status || ' -> ' || p_new_status || '): ' || p_reason,
      'REVERSAL',
      v_old_tx.id,
      p_meeting_id,
      p_admin_id,
      timezone('utc'::text, now())
    )
    RETURNING id INTO v_rev_tx_id;

    v_net_change := v_net_change - v_old_tx.amount;
  END IF;

  -- 4. Find active rule for new status
  SELECT id, name, points INTO v_new_rule
  FROM public.point_rules
  WHERE trigger_type = 'ATTENDANCE_STATUS'
    AND condition_value = p_new_status
    AND active = true
  LIMIT 1;

  -- 5. Create new transaction for the new status
  IF FOUND AND v_new_rule.points != 0 THEN
    INSERT INTO public.point_transactions (
      user_id,
      amount,
      reason,
      type,
      rule_id,
      meeting_id,
      created_by,
      created_at
    ) VALUES (
      p_user_id,
      v_new_rule.points,
      v_new_rule.name || ' (Override: ' || p_new_status || ') — ' || v_meeting_title,
      'ADJUSTMENT',
      v_new_rule.id,
      p_meeting_id,
      p_admin_id,
      timezone('utc'::text, now())
    )
    RETURNING id INTO v_new_tx_id;

    v_net_change := v_net_change + v_new_rule.points;
  END IF;

  -- 6. Send notification to member
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    read,
    created_at
  ) VALUES (
    p_user_id,
    'Attendance & Point Adjustment',
    'Your attendance for "' || v_meeting_title || '" was updated from ' || v_old_status || ' to ' || p_new_status || '. Net points adjustment: ' || (CASE WHEN v_net_change > 0 THEN '+' || v_net_change ELSE v_net_change::text END) || ' points. Reason: ' || p_reason,
    'POINTS',
    false,
    timezone('utc'::text, now())
  );

  -- 7. Create audit log
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    target_type,
    target_id,
    metadata,
    created_at
  ) VALUES (
    p_admin_id,
    'ATTENDANCE_OVERRIDE',
    'attendance',
    p_meeting_id::text || ':' || p_user_id::text,
    jsonb_build_object(
      'meeting_id', p_meeting_id,
      'meeting_title', v_meeting_title,
      'user_id', p_user_id,
      'old_status', v_old_status,
      'new_status', p_new_status,
      'reason', p_reason,
      'reversal_tx_id', v_rev_tx_id,
      'new_tx_id', v_new_tx_id,
      'net_change', v_net_change
    ),
    timezone('utc'::text, now())
  );

  RETURN jsonb_build_object(
    'success', true,
    'old_status', v_old_status,
    'new_status', p_new_status,
    'net_change', v_net_change
  );
END;
$$;
