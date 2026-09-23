/**
 * Central Feature Configuration for Quartzite Management System (QMS)
 * 
 * Allows temporary simplification or gating of subsystems without modifying
 * or erasing underlying schemas, services, API routes, or components.
 */

export const FEATURE_FLAGS = {
  /**
   * Internal LiveKit WebRTC video meetings.
   * - When false: built-in meeting creation, rooms, and LiveKit tokens are disabled.
   *   Only external meeting links (Google Meet, Zoom, Teams) are exposed and active.
   * - When true: full internal WebRTC meeting infrastructure is enabled.
   */
  ENABLE_INTERNAL_MEETINGS: false,

  /**
   * Automatic Point Rule Engine.
   * - When false: automatic point awarding on attendance finalization is inactive.
   *   Manual point additions, deductions, adjustments, and reversals remain fully functional.
   * - When true: automatic attendance status points rules are evaluated upon meeting conclusion.
   */
  ENABLE_AUTOMATIC_POINTS: false,
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
