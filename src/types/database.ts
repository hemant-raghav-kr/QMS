export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';
export type MeetingType = 'INTERNAL' | 'EXTERNAL';
export type MeetingStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED' | 'LEFT_EARLY';
export type PointTransactionType = 'AUTOMATIC' | 'MANUAL' | 'ADJUSTMENT' | 'REVERSAL';
export type AnnouncementAudience = 'ALL' | 'MEMBERS' | 'ADMINS';
export type WeeklyReportStatus = 'SENT' | 'FAILED' | 'PENDING';
export type MeetingReminderType = '30_MIN' | '10_MIN' | 'START';

export type GenericRelationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string;
          avatar_url: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email: string;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      meetings: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          scheduled_at: string;
          duration_minutes: number;
          meeting_type: MeetingType;
          external_meeting_url: string | null;
          status: MeetingStatus;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          scheduled_at: string;
          duration_minutes?: number;
          meeting_type?: MeetingType;
          external_meeting_url?: string | null;
          status?: MeetingStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          scheduled_at?: string;
          duration_minutes?: number;
          meeting_type?: MeetingType;
          external_meeting_url?: string | null;
          status?: MeetingStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meetings_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      meeting_participants: {
        Row: {
          meeting_id: string;
          user_id: string;
          invited_at: string;
        };
        Insert: {
          meeting_id: string;
          user_id: string;
          invited_at?: string;
        };
        Update: {
          meeting_id?: string;
          user_id?: string;
          invited_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_participants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      attendance: {
        Row: {
          id: string;
          meeting_id: string;
          user_id: string;
          status: AttendanceStatus;
          joined_at: string | null;
          left_at: string | null;
          marked_by: string | null;
          overridden_by: string | null;
          override_reason: string | null;
          original_status: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          user_id: string;
          status?: AttendanceStatus;
          joined_at?: string | null;
          left_at?: string | null;
          marked_by?: string | null;
          overridden_by?: string | null;
          override_reason?: string | null;
          original_status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          user_id?: string;
          status?: AttendanceStatus;
          joined_at?: string | null;
          left_at?: string | null;
          marked_by?: string | null;
          overridden_by?: string | null;
          override_reason?: string | null;
          original_status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      point_rules: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          trigger_type: string;
          condition_value: string | null;
          points: number;
          active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          trigger_type: string;
          condition_value?: string | null;
          points: number;
          active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          trigger_type?: string;
          condition_value?: string | null;
          points?: number;
          active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      point_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          reason: string;
          type: PointTransactionType;
          rule_id: string | null;
          meeting_id: string | null;
          reversal_of_id: string | null;
          idempotency_key: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          reason: string;
          type?: PointTransactionType;
          rule_id?: string | null;
          meeting_id?: string | null;
          reversal_of_id?: string | null;
          idempotency_key?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          reason?: string;
          type?: PointTransactionType;
          rule_id?: string | null;
          meeting_id?: string | null;
          reversal_of_id?: string | null;
          idempotency_key?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "point_transactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          content: string;
          target_audience: AnnouncementAudience;
          archived: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          target_audience?: AnnouncementAudience;
          archived?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          target_audience?: AnnouncementAudience;
          archived?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          link_url: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type?: string;
          link_url?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string;
          link_url?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          target_type: string;
          target_id: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          target_type: string;
          target_id: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          action?: string;
          target_type?: string;
          target_id?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      meeting_attendance_sessions: {
        Row: {
          id: string;
          meeting_id: string;
          user_id: string;
          session_id: string;
          joined_at: string;
          left_at: string | null;
          duration_seconds: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          user_id: string;
          session_id: string;
          joined_at?: string;
          left_at?: string | null;
          duration_seconds?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          user_id?: string;
          session_id?: string;
          joined_at?: string;
          left_at?: string | null;
          duration_seconds?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_attendance_sessions_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_attendance_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      meeting_chat_messages: {
        Row: {
          id: string;
          meeting_id: string;
          sender_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          sender_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          sender_id?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_chat_messages_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_chat_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      meeting_reminders: {
        Row: {
          id: string;
          meeting_id: string;
          reminder_type: MeetingReminderType;
          sent_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          reminder_type: MeetingReminderType;
          sent_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          reminder_type?: MeetingReminderType;
          sent_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_reminders_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          }
        ];
      };
      weekly_reports: {
        Row: {
          id: string;
          report_key: string;
          period_start: string;
          period_end: string;
          total_transactions: number;
          total_additions: number;
          total_deductions: number;
          net_change: number;
          email_recipient: string;
          email_status: WeeklyReportStatus;
          sent_at: string | null;
          error_message: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_key: string;
          period_start: string;
          period_end: string;
          total_transactions?: number;
          total_additions?: number;
          total_deductions?: number;
          net_change?: number;
          email_recipient: string;
          email_status?: WeeklyReportStatus;
          sent_at?: string | null;
          error_message?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_key?: string;
          period_start?: string;
          period_end?: string;
          total_transactions?: number;
          total_additions?: number;
          total_deductions?: number;
          net_change?: number;
          email_recipient?: string;
          email_status?: WeeklyReportStatus;
          sent_at?: string | null;
          error_message?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_auth_role: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      is_super_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

export type Profile = Tables<'profiles'>;
export type Meeting = Tables<'meetings'>;
export type MeetingParticipant = Tables<'meeting_participants'>;
export type Attendance = Tables<'attendance'>;
export type PointRule = Tables<'point_rules'>;
export type PointTransaction = Tables<'point_transactions'>;
export type Announcement = Tables<'announcements'>;
export type Notification = Tables<'notifications'>;
export type AuditLog = Tables<'audit_logs'>;
export type MeetingAttendanceSession = Tables<'meeting_attendance_sessions'>;
export type MeetingChatMessage = Tables<'meeting_chat_messages'>;
export type PushSubscription = Tables<'push_subscriptions'>;
export type MeetingReminder = Tables<'meeting_reminders'>;
export type WeeklyReport = Tables<'weekly_reports'>;
