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
  kata_a?: string;
  kata_b?: string;
  judge_scores_a?: number[];
  judge_scores_b?: number[];
  total_score_a?: number;
  total_score_b?: number;
}

export interface Official {
  id: string;
  name: string;
  role: 'Referee' | 'Judge' | 'Table Official' | 'Tatami Manager' | 'Coach';
  qualification: string;
  assigned_tatami?: string;
  email?: string;
  phone?: string;
  status: 'Active' | 'Inactive';
  created_at?: string;
}

export interface Tournament {
  id: string;
  name: string;
  organizer: string;
  date: string;
  date_iso: string;
  venue: string;
  city: string;
  location?: string;
  registration_close: string;
  registration_close_iso: string;
  status: 'Draft' | 'Active' | 'Closing Soon' | 'Full' | 'Completed' | 'Archived' | 'Open' | 'Deleted';
  banner_gradient?: string;
  featured?: boolean;
  deleted_at?: string;
  discipline?: string;
  medals_gold?: number;
  medals_silver?: number;
  medals_bronze?: number;
  total_participants?: number;
  total_clubs?: number;
  poster_emoji?: string;
  pdf_url?: string;
  created_at?: string;
  last_modified?: string;
  rules_version?: string;
  competition_type?: string;
  logo_url?: string;
  settings?: Record<string, any>;
}



export interface Participant {
  id: string;
  registration_no: string;
  photo_url?: string;
  full_name: string;
  gender: 'Male' | 'Female';
  dob: string; // YYYY-MM-DD
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
  kata_a?: string;
  kata_b?: string;
  judge_scores_a?: number[];
  judge_scores_b?: number[];
  total_score_a?: number;
  total_score_b?: number;
}

export interface Official {
  id: string;
  name: string;
  role: 'Referee' | 'Judge' | 'Table Official' | 'Tatami Manager' | 'Coach';
  qualification: string;
  assigned_tatami?: string;
  email?: string;
  phone?: string;
  status: 'Active' | 'Inactive';
  created_at?: string;
}

export interface Tournament {
  id: string;
  name: string;
  organizer: string;
  date: string;
  date_iso: string;
  venue: string;
  city: string;
  location?: string;
  registration_close: string;
  registration_close_iso: string;
  status: 'Draft' | 'Active' | 'Closing Soon' | 'Full' | 'Completed' | 'Archived' | 'Open' | 'Deleted';
  banner_gradient?: string;
  featured?: boolean;
  deleted_at?: string;
  discipline?: string;
  medals_gold?: number;
  medals_silver?: number;
  medals_bronze?: number;
  total_participants?: number;
  total_clubs?: number;
  poster_emoji?: string;
  pdf_url?: string;
  created_at?: string;
  last_modified?: string;
  rules_version?: string;
  competition_type?: string;
  logo_url?: string;
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
