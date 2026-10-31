export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "superadmin" | "admin" | "student";
export type EnrollmentStatus = "pending_payment" | "approved" | "rejected";

export interface Profile {
  id: string;
  full_name: string;
  username: string;
  school_origin: string;
  whatsapp_number: string;
  role: UserRole;
  avatar_url?: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}


export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content?: string | null;
  price: number;
  is_published: boolean;
  whatsapp_group_url: string | null;
  image_url?: string | null;
  gallery?: string[];
  registration_start?: string | null;
  registration_end?: string | null;
  event_start?: string | null;
  event_end?: string | null;
  target_learning?: string[];
  syllabus?: any[];
  level?: string | null;
  category?: string | null;
  created_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: EnrollmentStatus;
  whatsapp_number: string;
  payment_proof_url?: string | null;
  rejection_reason?: string | null;
  certificate_url?: string | null;
  review_rating?: number | null;
  review_text?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface PaymentAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  is_active: boolean;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      payment_accounts: {
        Row: PaymentAccount;
        Insert: {
          id?: string;
          bank_name: string;
          account_number: string;
          account_holder: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          bank_name?: string;
          account_number?: string;
          account_holder?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          full_name: string;
          username: string;
          school_origin: string;
          whatsapp_number: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          username?: string;
          school_origin?: string;
          whatsapp_number?: string;
          role?: UserRole;
          created_at?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: Course;
        Insert: {
          id?: string;
          title: string;
          slug: string;
          description?: string | null;
          price?: number;
          is_published?: boolean;
          whatsapp_group_url?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          description?: string | null;
          price?: number;
          is_published?: boolean;
          whatsapp_group_url?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      enrollments: {
        Row: Enrollment;
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          status?: EnrollmentStatus;
          whatsapp_number: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          status?: EnrollmentStatus;
          whatsapp_number?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      enrollment_status: EnrollmentStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
