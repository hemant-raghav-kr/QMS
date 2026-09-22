-- Fix infinite recursion in meeting_participants and meetings RLS policies
-- ----------------------------------------------------------------------
-- Problem:
-- "View meeting participants" on public.meeting_participants contained:
--   EXISTS (
--     SELECT 1 FROM public.meeting_participants mp
--     WHERE mp.meeting_id = meeting_participants.meeting_id
--     AND mp.user_id = auth.uid()
--   )
-- This recursive self-reference on the same table causes PostgreSQL error:
--   42P17: infinite recursion detected in policy for relation "meeting_participants"
-- Whenever an authenticated user queries meetings, attendance (with meeting join),
-- or point_transactions (with meeting join).
--
-- Solution:
-- 1. Provide a SECURITY DEFINER helper function to safely verify meeting membership
--    without triggering recursive policy evaluations.
-- 2. Update the "View meeting participants" policy to use the helper.
-- 3. Update the "View meetings policy" on public.meetings to also use the helper.

-- 1. Helper Function
CREATE OR REPLACE FUNCTION public.is_meeting_participant(p_meeting_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meeting_participants
    WHERE meeting_id = p_meeting_id AND user_id = p_user_id
  );
$$;

-- 2. Update Meeting Participants Policy
DROP POLICY IF EXISTS "View meeting participants" ON public.meeting_participants;
CREATE POLICY "View meeting participants"
  ON public.meeting_participants FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR
    user_id = auth.uid() OR
    public.is_meeting_participant(meeting_id, auth.uid())
  );

-- 3. Update Meetings Policy
DROP POLICY IF EXISTS "View meetings policy" ON public.meetings;
CREATE POLICY "View meetings policy"
  ON public.meetings FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR
    created_by = auth.uid() OR
    public.is_meeting_participant(id, auth.uid())
  );
