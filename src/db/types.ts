export interface Country {
  code: string; // ISO Code e.g. MAS, SGP
  name: string;
  flag_emoji: string;
}

export interface Club {
  id: string;
  name: string;
  city?: string;
  state?: string;
  logo_url?: string;
  head_coach?: string;
  team_coach?: string;
  club_manager?: string;
  contact_email?: string;
  contact_phone?: string;
  country?: string;
  created_at?: string;
}

export interface Coach {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  club_id?: string;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  gender: 'Male' | 'Female' | 'Mixed';
  min_age: number;
  max_age: number;
  min_weight: number;
  max_weight: number;
  capacity?: number;
  status: 'Open' | 'Closed' | 'Full';
  created_at?: string;
  format?: 'knockout' | 'round_robin' | 'wkf_repechage';
  discipline?: 'Kumite' | 'Kata' | 'Team Kumite' | 'Team Kata';
  category_timer_seconds?: number;
  category_timer_source?: 'category';
  category_timer_updated_at?: string;
  tournament_id?: string;
  draw_status?: 'Draft' | 'Confirmed';
}

export const isKataCategory = (cat: Category | undefined | null): boolean => {
  if (!cat) return false;
  if (cat.discipline === 'Kata' || cat.discipline === 'Team Kata') return true;
  return cat.name.toLowerCase().includes('kata');
};

export const isKumiteCategory = (cat: Category | undefined | null): boolean => {
  if (!cat) return false;
  if (cat.discipline === 'Kumite' || cat.discipline === 'Team Kumite') return true;
  return !isKataCategory(cat);
};

export interface Team {
  id: string;
  name: string;
  club_id: string;
  captain_id?: string;
  coach_id?: string;
  score: number;
  ranking?: number;
  created_at?: string;
}

export interface Participant {
  id: string;
  registration_no: string;
  photo_url?: string;
  full_name: string;
  gender: 'Male' | 'Female';
  dob: string; // YYYY-MM-DD
  age?: number;
  nationality_code?: string;
  passport_ic: string;
  email?: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  club_id?: string;
  coach_id?: string;
  weight: number; // kg
  height: number; // cm
  status: 'Confirmed' | 'Pending' | 'Checked In' | 'Disqualified' | 'Cancelled';
  medical_status: 'Cleared' | 'Review Needed' | 'Action Required';
  payment_status: 'Paid' | 'Unpaid' | 'Pending';
  isKumite?: boolean;
  isKata?: boolean;
  remarks?: string;
  created_at?: string;
  deleted_at?: string; // soft delete timestamp
  tournament_id?: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  participant_id: string;
  joined_at?: string;
}

export interface ParticipantCategory {
  id: string;
  participant_id: string;
  category_id: string;
  manual_override: boolean;
  assigned_at?: string;
  tournament_id?: string;
}

export interface Payment {
  id: string;
  participant_id: string;
  amount: number;
  status: 'Paid' | 'Unpaid' | 'Refunded' | 'Pending';
  payment_method?: string;
  transaction_id?: string;
  created_at?: string;
}

export interface MedicalRecord {
  id: string;
  participant_id: string;
  conditions?: string;
  allergies?: string;
  blood_type?: string;
  has_clearance: boolean;
  remarks?: string;
  updated_at?: string;
}

export interface Document {
  id: string;
  participant_id: string;
  name: string; // e.g. "Passport Scan"
  doc_type: string; // "Identity" | "Medical" | "Waiver"
  file_url: string;
  uploaded_at?: string;
}

export interface ActivityLog {
  id: string;
  participant_id: string | null;
  operator_name: string;
  action: string;
  details?: string;
  created_at?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id: string;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  created_at?: string;
}

export interface Bout {
  id: string;
  category_id: string;
  bout_no: number;
  round_no: number;
  participant_a_id: string | null;
  participant_b_id: string | null;
  winner_id: string | null;
  score_a: number;
  score_b: number;
  status: 'Scheduled' | 'Running' | 'Completed' | 'Walkover';
  scheduled_time?: string;
  tatami?: string;
  created_at?: string;
  senshu_a?: boolean;
  senshu_b?: boolean;
  penalties_a?: string;
  penalties_b?: string;
  penalties_c1_a?: string;
  penalties_c2_a?: string;
  penalties_c3_a?: string;
  penalties_c1_b?: string;
  penalties_c2_b?: string;
  penalties_c3_b?: string;
  victory_method?: string;
  points_aka_history?: string;
  points_ao_history?: string;
  timer_seconds?: number;
  timer_active?: boolean;
  notes?: string;
  vr_file_url?: string;
  vr_metadata?: Record<string, any> | null;
  vr_recorded_at?: string;
  vr_duration_seconds?: number;
  vr_camera_label?: string;
  kata_a?: string;
  kata_b?: string;
  judge_scores_a?: number[];
  judge_scores_b?: number[];
  total_score_a?: number;
  total_score_b?: number;
  tournament_id?: string;
}

export interface Official {
  id: string;
  name: string;
  photo_url?: string;
  role: 'Referee' | 'Judge' | 'Table Official' | 'Tatami Manager' | 'Coach';
  qualification: string;
  assigned_tatami?: string;
  email?: string;
  phone?: string;
  status: 'Active' | 'Inactive';
  created_at?: string;
  tournament_id?: string;
}

export interface Tournament {
  id: string;
  name: string;
  short_name?: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  banner_gradient?: string;
  discipline?: string; // e.g. "Kumite, Kata"
  
  // Organizer Info
  organizer: string;
  organizer_club?: string;
  organizer_contact?: string;
  organizer_phone?: string;
  organizer_email?: string;
  organizer_website?: string;
  organizer_social?: string;

  // Schedule
  date: string; // Legacy string display
  date_iso: string; // Start Date ISO
  end_date_iso?: string;
  registration_open_iso?: string;
  registration_close: string; // Legacy display
  registration_close_iso: string;
  registration_close_time?: string;
  check_in_datetime?: string;
  draw_datetime?: string;
  briefing_datetime?: string;

  // Venue Info
  venue: string;
  address?: string;
  city: string;
  state?: string;
  country?: string;
  postal_code?: string;
  location?: string; // Maps link
  venue_contact?: string;

  // Registration & Config
  registration_status?: 'Not Yet Open' | 'Open' | 'Closed';
  registration_fee?: string;
  payment_info?: string;
  registration_instructions?: string;
  terms_conditions?: string;
  important_notes?: string;
  
  status: 'Draft' | 'Published' | 'Registration Open' | 'Registration Closed' | 'Tournament Active' | 'Completed' | 'Archived' | 'Deleted' | 'Active' | 'Closing Soon' | 'Full' | 'Open' | 'Canceled';
  is_published?: boolean;
  featured?: boolean;
  deleted_at?: string;

  max_participants?: number;
  max_clubs?: number;
  
  medals_gold?: number;
  medals_silver?: number;
  medals_bronze?: number;
  total_participants?: number;
  total_clubs?: number;
  
  poster_emoji?: string;
  pdf_url?: string;
  additional_docs_url?: string;
  rules_version?: string;
  competition_type?: string;
  
  created_at?: string;
  last_modified?: string;
  settings?: Record<string, any>;
}



export interface DisplayPlaylistSlide {
  id: string;
  type: 'live_scoreboard' | 'kata_scoreboard' | 'bracket' | 'medals' | 'schedule' | 'announcement' | 'image' | 'video' | 'live_stream';
  title: string;
  duration_seconds: number;
  tatami_filter?: string;
  category_filter?: string;
  announcement_text?: string;
  sponsor_image_url?: string;
  media_url?: string;
}

export interface DisplayPlaylist {
  id: string;
  name: string;
  description?: string;
  tatami?: string;
  is_active?: boolean;
  slides: DisplayPlaylistSlide[];
  created_at?: string;
  updated_at?: string;
}

export interface TournamentDatabase {
  tournament: Tournament;
  participants: Participant[];
  categories: Category[];
  clubs: Club[];
  coaches: Coach[];
  bouts: Bout[];
  payments: Payment[];
  medical: MedicalRecord[];
  documents: Document[];
  teams: Team[];
  team_members: TeamMember[];
  participant_categories: ParticipantCategory[];
  activity_logs: ActivityLog[];
  audit_logs: AuditLog[];
  officials: Official[];
  display_playlists: DisplayPlaylist[];
}

export interface TournamentPC {
  id: string;
  pc_name: string;
  pc_identifier: string;
  tatami?: string;
  user_id?: string;
  username?: string;
  tournament_id?: string;
  status: 'online' | 'offline' | 'taken_over';
  last_heartbeat?: string;
  current_category_id?: string;
  current_match_id?: string;
  is_admin_controlled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryLock {
  id: string;
  tournament_id: string;
  category_id: string;
  pc_id: string;
  tatami?: string;
  username?: string;
  locked_at: string;
  last_heartbeat?: string;
  released_at?: string;
  is_active: boolean;
  admin_override: boolean;
  created_at: string;
}
