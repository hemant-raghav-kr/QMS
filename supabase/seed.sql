-- ==========================================================
-- Quartzite Management System (QMS) - Seed Data
-- ==========================================================

-- Default Point Rules
INSERT INTO public.point_rules (name, description, trigger_type, points, active)
VALUES
  ('Meeting Attendance', 'Awarded for attending an internal or external scheduled meeting', 'ATTENDANCE_PRESENT', 5, true),
  ('On-Time Arrival', 'Bonus points for joining a meeting within the first 3 minutes', 'ATTENDANCE_ON_TIME', 2, true),
  ('Active Participation', 'Recognized contribution or presentation during a team session', 'MANUAL_MERIT', 10, true),
  ('Project Milestone Achieved', 'Delivering a key team deliverable on schedule', 'MILESTONE_COMPLETION', 25, true),
  ('Late Arrival Penalty', 'Deduction for joining a mandatory meeting more than 10 minutes late', 'ATTENDANCE_LATE', -2, true),
  ('Unexcused Absence Penalty', 'Deduction for missing a mandatory meeting without prior excuse', 'ATTENDANCE_ABSENT', -5, true)
ON CONFLICT DO NOTHING;

-- Initial System Announcement
INSERT INTO public.announcements (title, content)
VALUES
  ('Welcome to Quartzite Management System', 'Welcome to QMS, the central operational platform for meetings, attendance, and member points. Please review your profile and check upcoming meetings in the navigation menu.')
ON CONFLICT DO NOTHING;
