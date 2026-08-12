import { 
  Country, Club, Coach, Category, Team, Participant, 
  TeamMember, ParticipantCategory, Payment, MedicalRecord, 
  Document, ActivityLog, AuditLog, Bout, Official, Tournament, DisplayPlaylist
} from './types';

// Seed data
const SEED_COUNTRIES: Country[] = [
  { code: 'MAS', name: 'Malaysia', flag_emoji: '🇲🇾' },
  { code: 'SGP', name: 'Singapore', flag_emoji: '🇸🇬' },
  { code: 'THA', name: 'Thailand', flag_emoji: '🇹🇭' },
  { code: 'INA', name: 'Indonesia', flag_emoji: '🇮🇩' },
  { code: 'JPN', name: 'Japan', flag_emoji: '🇯🇵' },
  { code: 'BRU', name: 'Brunei', flag_emoji: '🇧🇳' },
  { code: 'VIE', name: 'Vietnam', flag_emoji: '🇻🇳' },
  { code: 'PHI', name: 'Philippines', flag_emoji: '🇵🇭' }
];

const SEED_CLUBS: Club[] = [
  { id: 'club-1', name: 'Senshi Karate Academy', city: 'Kuala Lumpur', state: 'W.P. Kuala Lumpur' },
  { id: 'club-2', name: 'Goju-Ryu Karate Club', city: 'Petaling Jaya', state: 'Selangor' },
  { id: 'club-3', name: 'Tiger Claw Dojo', city: 'Penang', state: 'Penang' },
  { id: 'club-4', name: 'Budokan Singapore', city: 'Singapore', state: 'Central' },
  { id: 'club-5', name: 'Kyokushin Jakarta', city: 'Jakarta', state: 'DKI Jakarta' }
];

const SEED_COACHES: Coach[] = [
  { id: 'coach-1', name: 'Sensei Haris', email: 'haris@senshikarate.com', phone: '+6012-3456789', club_id: 'club-1' },
  { id: 'coach-2', name: 'Sensei Tan', email: 'tan@gojuryu.com', phone: '+6013-9876543', club_id: 'club-2' },
  { id: 'coach-3', name: 'Coach Somchai', email: 'somchai@tigerclaw.com', phone: '+66-81-234-5678', club_id: 'club-3' }
];

const SEED_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Male Kumite -60kg (18+)', gender: 'Male', min_age: 18, max_age: 99, min_weight: 0, max_weight: 60, capacity: 32, status: 'Open', format: 'knockout' },
  { id: 'cat-2', name: 'Male Kumite -67kg (18+)', gender: 'Male', min_age: 18, max_age: 99, min_weight: 60.01, max_weight: 67, capacity: 32, status: 'Open', format: 'knockout' },
  { id: 'cat-3', name: 'Male Kumite -75kg (18+)', gender: 'Male', min_age: 18, max_age: 99, min_weight: 67.01, max_weight: 75, capacity: 32, status: 'Open', format: 'knockout' },
  { id: 'cat-4', name: 'Male Kumite +75kg (18+)', gender: 'Male', min_age: 18, max_age: 99, min_weight: 75.01, max_weight: 999, capacity: 32, status: 'Open', format: 'knockout' },
  { id: 'cat-5', name: 'Female Kumite -50kg (18+)', gender: 'Female', min_age: 18, max_age: 99, min_weight: 0, max_weight: 50, capacity: 16, status: 'Open', format: 'knockout' },
  { id: 'cat-6', name: 'Female Kumite -55kg (18+)', gender: 'Female', min_age: 18, max_age: 99, min_weight: 50.01, max_weight: 55, capacity: 16, status: 'Open', format: 'knockout' },
  { id: 'cat-7', name: 'Female Kumite +55kg (18+)', gender: 'Female', min_age: 18, max_age: 99, min_weight: 55.01, max_weight: 999, capacity: 16, status: 'Open', format: 'knockout' },
  { id: 'cat-8', name: 'Male Kata (18+)', gender: 'Male', min_age: 18, max_age: 99, min_weight: 0, max_weight: 999, capacity: 32, status: 'Open', format: 'knockout' },
  { id: 'cat-9', name: 'Female Kata (18+)', gender: 'Female', min_age: 18, max_age: 99, min_weight: 0, max_weight: 999, capacity: 32, status: 'Open', format: 'knockout' },
  { id: 'cat-10', name: 'Junior Male Kumite -55kg (16-17)', gender: 'Male', min_age: 16, max_age: 17, min_weight: 0, max_weight: 55, capacity: 16, status: 'Open', format: 'knockout' },
  { id: 'cat-11', name: 'Junior Male Kumite -61kg (16-17)', gender: 'Male', min_age: 16, max_age: 17, min_weight: 55.01, max_weight: 61, capacity: 16, status: 'Open', format: 'knockout' },
  { id: 'cat-12', name: 'Junior Female Kumite -48kg (16-17)', gender: 'Female', min_age: 16, max_age: 17, min_weight: 0, max_weight: 48, capacity: 16, status: 'Open', format: 'knockout' }
];

const SEED_DISPLAY_PLAYLISTS: DisplayPlaylist[] = [
  {
    id: 'playlist-default-main',
    name: 'Main Stage Arena Presentation',
    description: 'Complete rotation of Live Scoreboards, Category Brackets, Medals Leaderboard, and Match Schedule.',
    tatami: 'ALL',
    is_active: true,
    slides: [
      { id: 's1', type: 'live_scoreboard', title: 'Live Kumite Scoreboard', duration_seconds: 25, tatami_filter: 'ALL' },
      { id: 's2', type: 'kata_scoreboard', title: 'WKF Kata Scoreboard', duration_seconds: 25, tatami_filter: 'ALL' },
      { id: 's3', type: 'bracket', title: 'Category Brackets & Draws', duration_seconds: 20 },
      { id: 's4', type: 'medals', title: 'Club Medal Standings Leaderboard', duration_seconds: 15 },
      { id: 's5', type: 'schedule', title: 'Upcoming Tatami Match Schedule', duration_seconds: 15 },
      { id: 's6', type: 'announcement', title: 'Official Championship Announcement', duration_seconds: 12, announcement_text: 'Welcome to KarateTech Open Championship 2026! Respect rules, honor opponents.' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'playlist-tatami-1',
    name: 'Tatami 1 Arena Dedicated Loop',
    description: 'Focused rotation for Ring 1 featuring live match scoreboard and Tatami 1 schedule.',
    tatami: 'Tatami 1',
    is_active: false,
    slides: [
      { id: 't1-s1', type: 'live_scoreboard', title: 'Tatami 1 Live Match', duration_seconds: 30, tatami_filter: 'Tatami 1' },
      { id: 't1-s2', type: 'schedule', title: 'Tatami 1 Upcoming Bouts', duration_seconds: 15, tatami_filter: 'Tatami 1' },
      { id: 't1-s3', type: 'medals', title: 'Medal Standings', duration_seconds: 15 }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const SEED_PARTICIPANTS: Participant[] = [
  // ── Original 8 participants ──────────────────────────────────────────
  {
    id: 'part-1',
    registration_no: 'REG-2026-001',
    photo_url: '',
    full_name: 'Ahmad Daniel',
    gender: 'Male',
    dob: '2005-04-12', // 21 years old
    nationality_code: 'MAS',
    passport_ic: '050412-14-1235',
    email: 'daniel@example.com',
    phone: '+6017-1234567',
    emergency_contact_name: 'Fatimah Ali',
    emergency_contact_phone: '+6017-9999999',
    club_id: 'club-1',
    coach_id: 'coach-1',
    weight: 64.5,
    height: 172.0,
    status: 'Confirmed',
    medical_status: 'Cleared',
    payment_status: 'Paid',
    remarks: 'Pre-selected for national selections',
    created_at: '2026-06-15T08:30:00Z'
  },
  {
    id: 'part-2',
    registration_no: 'REG-2026-002',
    photo_url: '',
    full_name: 'Chloe Tan',
    gender: 'Female',
    dob: '2004-09-22', // 21 years old
    nationality_code: 'MAS',
    passport_ic: '040922-10-8888',
    email: 'chloe@example.com',
    phone: '+6012-9876543',
    emergency_contact_name: 'Tan Kok Wai',
    emergency_contact_phone: '+6012-1112222',
    club_id: 'club-2',
    coach_id: 'coach-2',
    weight: 52.0,
    height: 161.0,
    status: 'Confirmed',
    medical_status: 'Cleared',
    payment_status: 'Paid',
    remarks: 'None',
    created_at: '2026-06-16T09:15:00Z'
  },
  {
    id: 'part-3',
    registration_no: 'REG-2026-003',
    photo_url: '',
    full_name: 'Subramaniam Krishnan',
    gender: 'Male',
    dob: '2000-01-15', // 26 years old
    nationality_code: 'MAS',
    passport_ic: '000115-08-5431',
    email: 'subra@example.com',
    phone: '+6011-2223334',
    emergency_contact_name: 'Krishnan Murugan',
    emergency_contact_phone: '+6011-8889999',
    club_id: 'club-1',
    coach_id: 'coach-1',
    weight: 78.2,
    height: 178.0,
    status: 'Checked In',
    medical_status: 'Cleared',
    payment_status: 'Paid',
    remarks: 'Ready for draw',
    created_at: '2026-06-18T14:22:00Z'
  },
  {
    id: 'part-4',
    registration_no: 'REG-2026-004',
    photo_url: '',
    full_name: 'Muhammad Ryan',
    gender: 'Male',
    dob: '2009-08-30', // 16 years old
    nationality_code: 'MAS',
    passport_ic: '090830-14-1111',
    email: 'ryan@example.com',
    phone: '+6019-3334445',
    emergency_contact_name: 'Rohana Ahmad',
    emergency_contact_phone: '+6019-2222111',
    club_id: 'club-3',
    coach_id: 'coach-3',
    weight: 58.5,
    height: 168.0,
    status: 'Pending',
    medical_status: 'Review Needed',
    payment_status: 'Pending',
    remarks: 'Requires guardian waiver sign-off',
    created_at: '2026-06-20T10:05:00Z'
  },
  {
    id: 'part-5',
    registration_no: 'REG-2026-005',
    photo_url: '',
    full_name: 'Kenji Sato',
    gender: 'Male',
    dob: '1998-11-05', // 27 years old
    nationality_code: 'JPN',
    passport_ic: 'TK1234567',
    email: 'kenji@example.jp',
    phone: '+81-90-1234-5678',
    emergency_contact_name: 'Yoko Sato',
    emergency_contact_phone: '+81-90-8765-4321',
    club_id: 'club-5',
    weight: 72.0,
    height: 175.0,
    status: 'Confirmed',
    medical_status: 'Cleared',
    payment_status: 'Paid',
    remarks: 'International entry',
    created_at: '2026-06-22T11:45:00Z'
  },
  {
    id: 'part-6',
    registration_no: 'REG-2026-006',
    photo_url: '',
    full_name: 'Anisha Putri',
    gender: 'Female',
    dob: '2002-05-18', // 24 years old
    nationality_code: 'INA',
    passport_ic: 'B9876543',
    email: 'anisha@example.id',
    phone: '+62-812-345-678',
    emergency_contact_name: 'Budi Putri',
    emergency_contact_phone: '+62-812-999-888',
    club_id: 'club-5',
    weight: 48.5,
    height: 158.0,
    status: 'Pending',
    medical_status: 'Action Required',
    payment_status: 'Unpaid',
    remarks: 'ECG certificate needed',
    created_at: '2026-06-25T13:12:00Z'
  },
  {
    id: 'part-7',
    registration_no: 'REG-2026-007',
    photo_url: '',
    full_name: 'Ethan Lim',
    gender: 'Male',
    dob: '2005-12-01', // 20 years old
    nationality_code: 'SGP',
    passport_ic: 'T0599999A',
    email: 'ethan@example.sg',
    phone: '+65-9876-5432',
    emergency_contact_name: 'Lim Guan Eng',
    emergency_contact_phone: '+65-8123-4567',
    club_id: 'club-4',
    weight: 66.8,
    height: 170.0,
    status: 'Checked In',
    medical_status: 'Cleared',
    payment_status: 'Paid',
    remarks: 'No accommodations requested',
    created_at: '2026-06-26T15:40:00Z'
  },
  {
    id: 'part-8',
    registration_no: 'REG-2026-008',
    photo_url: '',
    full_name: 'Somporn Yodrak',
    gender: 'Male',
    dob: '1995-07-14', // 30 years old
    nationality_code: 'THA',
    passport_ic: 'AA112233',
    email: 'somporn@example.th',
    phone: '+66-89-999-8888',
    emergency_contact_name: 'Yodrak Sen',
    emergency_contact_phone: '+66-89-111-2222',
    club_id: 'club-3',
    coach_id: 'coach-3',
    weight: 84.0,
    height: 182.0,
    status: 'Disqualified',
    medical_status: 'Cleared',
    payment_status: 'Paid',
    remarks: 'Missed official weigh-in limits initially, re-registered',
    created_at: '2026-06-27T16:10:00Z'
  },

  // ── cat-1: Male Kumite -60kg (18+) ──────────────────────────────────
  { id: 'part-9',  registration_no: 'REG-2026-009', photo_url: '', full_name: 'Hazwan Faris',       gender: 'Male', dob: '2004-03-10', nationality_code: 'MAS', passport_ic: '040310-05-1234', email: 'hazwan@example.com',    phone: '+6011-1122334', emergency_contact_name: 'Faris Hamid',    emergency_contact_phone: '+6011-4433221', club_id: 'club-1', coach_id: 'coach-1', weight: 58.0, height: 167.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-15T09:00:00Z' },
  { id: 'part-10', registration_no: 'REG-2026-010', photo_url: '', full_name: 'Remy Azlan',         gender: 'Male', dob: '2002-07-22', nationality_code: 'MAS', passport_ic: '020722-03-5678', email: 'remy@example.com',      phone: '+6013-2233445', emergency_contact_name: 'Azlan Yusof',   emergency_contact_phone: '+6013-5544332', club_id: 'club-2', coach_id: 'coach-2', weight: 59.5, height: 165.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-15T09:10:00Z' },
  { id: 'part-11', registration_no: 'REG-2026-011', photo_url: '', full_name: 'Tan Wei Jie',        gender: 'Male', dob: '2006-01-05', nationality_code: 'MAS', passport_ic: '060105-07-9012', email: 'weijie@example.com',    phone: '+6016-3344556', emergency_contact_name: 'Tan Ah Kow',    emergency_contact_phone: '+6016-6655443', club_id: 'club-2', coach_id: 'coach-2', weight: 57.5, height: 163.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-15T09:20:00Z' },
  { id: 'part-12', registration_no: 'REG-2026-012', photo_url: '', full_name: 'Wan Ariff',          gender: 'Male', dob: '2007-11-18', nationality_code: 'MAS', passport_ic: '071118-02-3456', email: 'ariff@example.com',     phone: '+6019-4455667', emergency_contact_name: 'Wan Nordin',    emergency_contact_phone: '+6019-7766554', club_id: 'club-3', coach_id: 'coach-3', weight: 60.0, height: 169.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-15T09:30:00Z' },

  // ── cat-2: Male Kumite -67kg (18+) ──────────────────────────────────
  { id: 'part-13', registration_no: 'REG-2026-013', photo_url: '', full_name: 'Syafiq Hakim',       gender: 'Male', dob: '2001-05-14', nationality_code: 'MAS', passport_ic: '010514-14-7890', email: 'syafiq@example.com',    phone: '+6011-5566778', emergency_contact_name: 'Hakim Saari',   emergency_contact_phone: '+6011-8877665', club_id: 'club-1', coach_id: 'coach-1', weight: 65.0, height: 172.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-16T09:00:00Z' },
  { id: 'part-14', registration_no: 'REG-2026-014', photo_url: '', full_name: 'Bryan Ng',           gender: 'Male', dob: '2004-08-30', nationality_code: 'SGP', passport_ic: 'S8765432B',      email: 'bryan@example.sg',     phone: '+65-9111-2222', emergency_contact_name: 'Ng Beng Huat', emergency_contact_phone: '+65-9333-4444', club_id: 'club-4',                    weight: 63.0, height: 170.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-16T09:10:00Z' },
  { id: 'part-15', registration_no: 'REG-2026-015', photo_url: '', full_name: 'Nguyen Minh Duc',    gender: 'Male', dob: '1999-02-25', nationality_code: 'VIE', passport_ic: 'B12345678',      email: 'duc@example.vn',       phone: '+84-90-123-4567', emergency_contact_name: 'Nguyen Van A',  emergency_contact_phone: '+84-90-765-4321', club_id: 'club-5',               weight: 66.5, height: 174.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-16T09:20:00Z' },
  { id: 'part-16', registration_no: 'REG-2026-016', photo_url: '', full_name: 'Faiz Irfan',         gender: 'Male', dob: '2007-09-03', nationality_code: 'MAS', passport_ic: '070903-05-2345', email: 'faiz@example.com',      phone: '+6017-6677889', emergency_contact_name: 'Irfan Zain',   emergency_contact_phone: '+6017-9988776', club_id: 'club-1', coach_id: 'coach-1', weight: 62.0, height: 168.0, status: 'Checked In', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-16T09:30:00Z' },

  // ── cat-3: Male Kumite -75kg (18+) ──────────────────────────────────
  { id: 'part-17', registration_no: 'REG-2026-017', photo_url: '', full_name: 'Amirul Hafiz',       gender: 'Male', dob: '2000-12-01', nationality_code: 'MAS', passport_ic: '001201-01-3456', email: 'amirul@example.com',    phone: '+6012-7788990', emergency_contact_name: 'Hafiz Osman',  emergency_contact_phone: '+6012-0099887', club_id: 'club-2', coach_id: 'coach-2', weight: 73.0, height: 176.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-17T09:00:00Z' },
  { id: 'part-18', registration_no: 'REG-2026-018', photo_url: '', full_name: 'Wanchai Burakorn',   gender: 'Male', dob: '2003-04-17', nationality_code: 'THA', passport_ic: 'TH4567890',      email: 'wanchai@example.th',   phone: '+66-81-234-9876', emergency_contact_name: 'Burakorn Sri', emergency_contact_phone: '+66-81-876-5432', club_id: 'club-3', coach_id: 'coach-3', weight: 74.5, height: 177.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-17T09:10:00Z' },
  { id: 'part-19', registration_no: 'REG-2026-019', photo_url: '', full_name: 'Ruzaini Musa',       gender: 'Male', dob: '2005-06-20', nationality_code: 'MAS', passport_ic: '050620-08-4567', email: 'ruzaini@example.com',   phone: '+6013-8899001', emergency_contact_name: 'Musa Daud',    emergency_contact_phone: '+6013-1100998', club_id: 'club-1', coach_id: 'coach-1', weight: 70.5, height: 173.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-17T09:20:00Z' },
  { id: 'part-20', registration_no: 'REG-2026-020', photo_url: '', full_name: 'Dani Prasetyo',      gender: 'Male', dob: '1998-03-11', nationality_code: 'INA', passport_ic: 'C3456789',       email: 'dani@example.id',      phone: '+62-878-901-2345', emergency_contact_name: 'Prasetyo Sr',  emergency_contact_phone: '+62-878-543-2109', club_id: 'club-5',              weight: 68.0, height: 171.0, status: 'Checked In', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-17T09:30:00Z' },

  // ── cat-4: Male Kumite +75kg (18+) ──────────────────────────────────
  { id: 'part-21', registration_no: 'REG-2026-021', photo_url: '', full_name: 'Norzaidi Hamdan',    gender: 'Male', dob: '1996-08-05', nationality_code: 'MAS', passport_ic: '960805-14-5678', email: 'zaidi@example.com',     phone: '+6016-9900112', emergency_contact_name: 'Hamdan Salleh', emergency_contact_phone: '+6016-2211009', club_id: 'club-1', coach_id: 'coach-1', weight: 80.0, height: 183.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-18T09:00:00Z' },
  { id: 'part-22', registration_no: 'REG-2026-022', photo_url: '', full_name: 'Takeshi Yamamoto',   gender: 'Male', dob: '2001-01-29', nationality_code: 'JPN', passport_ic: 'TK9876543',      email: 'takeshi@example.jp',   phone: '+81-80-9876-5432', emergency_contact_name: 'Yamamoto Jun', emergency_contact_phone: '+81-80-2345-6789', club_id: 'club-4',              weight: 82.5, height: 184.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-18T09:10:00Z' },
  { id: 'part-23', registration_no: 'REG-2026-023', photo_url: '', full_name: 'Khairul Anwar',      gender: 'Male', dob: '2004-10-30', nationality_code: 'MAS', passport_ic: '041030-07-6789', email: 'khairul@example.com',   phone: '+6019-0011223', emergency_contact_name: 'Anwar Bakar',   emergency_contact_phone: '+6019-3322110', club_id: 'club-3', coach_id: 'coach-3', weight: 76.5, height: 179.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-18T09:20:00Z' },
  { id: 'part-24', registration_no: 'REG-2026-024', photo_url: '', full_name: 'Fernando Santos',    gender: 'Male', dob: '2003-07-15', nationality_code: 'PHI', passport_ic: 'P1234567A',      email: 'fernando@example.ph',  phone: '+63-917-123-4567', emergency_contact_name: 'Santos Elena', emergency_contact_phone: '+63-917-765-4321', club_id: 'club-5',              weight: 79.0, height: 180.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-18T09:30:00Z' },

  // ── cat-5: Female Kumite -50kg (18+) ────────────────────────────────
  { id: 'part-25', registration_no: 'REG-2026-025', photo_url: '', full_name: 'Nurul Ain Siti',     gender: 'Female', dob: '2004-02-14', nationality_code: 'MAS', passport_ic: '040214-04-7890', email: 'ain@example.com',       phone: '+6011-1234987', emergency_contact_name: 'Siti Rahimah', emergency_contact_phone: '+6011-7899321', club_id: 'club-1', coach_id: 'coach-1', weight: 48.0, height: 155.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-19T09:00:00Z' },
  { id: 'part-26', registration_no: 'REG-2026-026', photo_url: '', full_name: 'Priya Nambiar',      gender: 'Female', dob: '2007-06-08', nationality_code: 'MAS', passport_ic: '070608-10-8901', email: 'priya@example.com',     phone: '+6012-2345098', emergency_contact_name: 'Nambiar Ram',  emergency_contact_phone: '+6012-8900234', club_id: 'club-2', coach_id: 'coach-2', weight: 49.5, height: 157.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-19T09:10:00Z' },
  { id: 'part-27', registration_no: 'REG-2026-027', photo_url: '', full_name: 'Mei Lin Chan',       gender: 'Female', dob: '2002-11-22', nationality_code: 'MAS', passport_ic: '021122-01-9012', email: 'meilin@example.com',    phone: '+6016-3456109', emergency_contact_name: 'Chan Boon',    emergency_contact_phone: '+6016-9011345', club_id: 'club-2', coach_id: 'coach-2', weight: 47.0, height: 153.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-19T09:20:00Z' },
  { id: 'part-28', registration_no: 'REG-2026-028', photo_url: '', full_name: 'Nattaya Kaewkla',    gender: 'Female', dob: '2005-04-03', nationality_code: 'THA', passport_ic: 'TH1234560',      email: 'nattaya@example.th',   phone: '+66-82-345-6789', emergency_contact_name: 'Kaewkla Pim', emergency_contact_phone: '+66-82-987-6543', club_id: 'club-3', coach_id: 'coach-3', weight: 50.0, height: 160.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-19T09:30:00Z' },

  // ── cat-6: Female Kumite -55kg (18+) ────────────────────────────────
  { id: 'part-29', registration_no: 'REG-2026-029', photo_url: '', full_name: 'Aisyah Zainudin',    gender: 'Female', dob: '2003-08-19', nationality_code: 'MAS', passport_ic: '030819-06-0123', email: 'aisyah@example.com',    phone: '+6017-4567210', emergency_contact_name: 'Zainudin Mus', emergency_contact_phone: '+6017-0122456', club_id: 'club-1', coach_id: 'coach-1', weight: 53.0, height: 162.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-20T09:00:00Z' },
  { id: 'part-30', registration_no: 'REG-2026-030', photo_url: '', full_name: 'Lisa Nguyen',        gender: 'Female', dob: '2006-03-27', nationality_code: 'VIE', passport_ic: 'C34567890',      email: 'lisa@example.vn',      phone: '+84-91-234-5678', emergency_contact_name: 'Nguyen Kim',   emergency_contact_phone: '+84-91-876-5432', club_id: 'club-5',               weight: 54.5, height: 163.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-20T09:10:00Z' },
  { id: 'part-31', registration_no: 'REG-2026-031', photo_url: '', full_name: 'Siti Hajar',         gender: 'Female', dob: '2001-12-14', nationality_code: 'MAS', passport_ic: '011214-09-1234', email: 'hajar@example.com',     phone: '+6013-5678321', emergency_contact_name: 'Hajar Wahab',  emergency_contact_phone: '+6013-1233567', club_id: 'club-3', coach_id: 'coach-3', weight: 51.5, height: 160.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-20T09:20:00Z' },
  { id: 'part-32', registration_no: 'REG-2026-032', photo_url: '', full_name: 'Grace Seah',         gender: 'Female', dob: '2004-05-31', nationality_code: 'SGP', passport_ic: 'S4567890C',      email: 'grace@example.sg',     phone: '+65-9222-3333', emergency_contact_name: 'Seah Ah Lian', emergency_contact_phone: '+65-9444-5555', club_id: 'club-4',                    weight: 52.5, height: 161.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-20T09:30:00Z' },

  // ── cat-7: Female Kumite +55kg (18+) ────────────────────────────────
  { id: 'part-33', registration_no: 'REG-2026-033', photo_url: '', full_name: 'Roszaida Othman',    gender: 'Female', dob: '2002-07-08', nationality_code: 'MAS', passport_ic: '020708-12-2345', email: 'roszaida@example.com',  phone: '+6019-6789432', emergency_contact_name: 'Othman Taib',  emergency_contact_phone: '+6019-2344678', club_id: 'club-1', coach_id: 'coach-1', weight: 58.0, height: 165.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-21T09:00:00Z' },
  { id: 'part-34', registration_no: 'REG-2026-034', photo_url: '', full_name: 'Hana Kobayashi',     gender: 'Female', dob: '2005-10-15', nationality_code: 'JPN', passport_ic: 'TK5678901',      email: 'hana@example.jp',      phone: '+81-70-1234-9876', emergency_contact_name: 'Kobayashi M', emergency_contact_phone: '+81-70-6789-0123', club_id: 'club-4',              weight: 60.5, height: 167.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-21T09:10:00Z' },
  { id: 'part-35', registration_no: 'REG-2026-035', photo_url: '', full_name: 'Natasha Yip',        gender: 'Female', dob: '1998-01-20', nationality_code: 'MAS', passport_ic: '980120-10-3456', email: 'natasha@example.com',   phone: '+6011-7890543', emergency_contact_name: 'Yip Chong',   emergency_contact_phone: '+6011-3455789', club_id: 'club-2', coach_id: 'coach-2', weight: 56.5, height: 166.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-21T09:20:00Z' },
  { id: 'part-36', registration_no: 'REG-2026-036', photo_url: '', full_name: 'Sofia Cruz',         gender: 'Female', dob: '2003-09-25', nationality_code: 'PHI', passport_ic: 'P2345678B',      email: 'sofia@example.ph',     phone: '+63-918-234-5678', emergency_contact_name: 'Cruz Maria',   emergency_contact_phone: '+63-918-876-5432', club_id: 'club-5',              weight: 57.5, height: 164.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-21T09:30:00Z' },

  // ── cat-8: Male Kata (18+) ───────────────────────────────────────────
  { id: 'part-37', registration_no: 'REG-2026-037', photo_url: '', full_name: 'Zulfahmi Arif',      gender: 'Male', dob: '2002-04-11', nationality_code: 'MAS', passport_ic: '020411-14-4567', email: 'zulfahmi@example.com',  phone: '+6012-8901654', emergency_contact_name: 'Arif Bakri',   emergency_contact_phone: '+6012-4566890', club_id: 'club-1', coach_id: 'coach-1', weight: 68.0, height: 173.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-22T09:00:00Z' },
  { id: 'part-38', registration_no: 'REG-2026-038', photo_url: '', full_name: 'Hideki Tanaka',      gender: 'Male', dob: '2000-08-28', nationality_code: 'JPN', passport_ic: 'TK6789012',      email: 'hideki@example.jp',    phone: '+81-90-2345-6780', emergency_contact_name: 'Tanaka Akira', emergency_contact_phone: '+81-90-8901-2345', club_id: 'club-4',              weight: 72.0, height: 176.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-22T09:10:00Z' },
  { id: 'part-39', registration_no: 'REG-2026-039', photo_url: '', full_name: 'Luqmanul Hakim',     gender: 'Male', dob: '2005-02-14', nationality_code: 'MAS', passport_ic: '050214-02-5678', email: 'luqman@example.com',    phone: '+6017-9012765', emergency_contact_name: 'Hakim Razali', emergency_contact_phone: '+6017-5677901', club_id: 'club-2', coach_id: 'coach-2', weight: 65.0, height: 170.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-22T09:20:00Z' },
  { id: 'part-40', registration_no: 'REG-2026-040', photo_url: '', full_name: 'Panya Suthirak',     gender: 'Male', dob: '2007-07-07', nationality_code: 'THA', passport_ic: 'TH2345671',      email: 'panya@example.th',     phone: '+66-83-456-7890', emergency_contact_name: 'Suthirak Pol', emergency_contact_phone: '+66-83-098-7654', club_id: 'club-3', coach_id: 'coach-3', weight: 70.0, height: 172.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-22T09:30:00Z' },

  // ── cat-9: Female Kata (18+) ─────────────────────────────────────────
  { id: 'part-41', registration_no: 'REG-2026-041', photo_url: '', full_name: 'Zara Hidayah',       gender: 'Female', dob: '2004-11-03', nationality_code: 'MAS', passport_ic: '041103-03-6789', email: 'zara@example.com',      phone: '+6013-0123876', emergency_contact_name: 'Hidayah Omar', emergency_contact_phone: '+6013-6788012', club_id: 'club-1', coach_id: 'coach-1', weight: 55.0, height: 162.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-23T09:00:00Z' },
  { id: 'part-42', registration_no: 'REG-2026-042', photo_url: '', full_name: 'Yui Watanabe',       gender: 'Female', dob: '2001-06-16', nationality_code: 'JPN', passport_ic: 'TK7890123',      email: 'yui@example.jp',       phone: '+81-80-3456-7891', emergency_contact_name: 'Watanabe Eri', emergency_contact_phone: '+81-80-9012-3456', club_id: 'club-4',              weight: 52.0, height: 159.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-23T09:10:00Z' },
  { id: 'part-43', registration_no: 'REG-2026-043', photo_url: '', full_name: 'Indah Permata',      gender: 'Female', dob: '2006-09-09', nationality_code: 'INA', passport_ic: 'D4567890',       email: 'indah@example.id',     phone: '+62-856-789-0123', emergency_contact_name: 'Permata Sri',  emergency_contact_phone: '+62-856-321-0987', club_id: 'club-5',              weight: 48.0, height: 156.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-23T09:20:00Z' },
  { id: 'part-44', registration_no: 'REG-2026-044', photo_url: '', full_name: 'Amira Farida',       gender: 'Female', dob: '2005-12-28', nationality_code: 'MAS', passport_ic: '051228-11-7890', email: 'amira@example.com',     phone: '+6016-1234987', emergency_contact_name: 'Farida Zulk',  emergency_contact_phone: '+6016-7899123', club_id: 'club-3', coach_id: 'coach-3', weight: 58.0, height: 163.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-23T09:30:00Z' },

  // ── cat-10: Junior Male Kumite -55kg (16-17) ─────────────────────────
  { id: 'part-45', registration_no: 'REG-2026-045', photo_url: '', full_name: 'Hafiz Amsyar',       gender: 'Male', dob: '2010-01-17', nationality_code: 'MAS', passport_ic: '100117-05-8901', email: 'amsyar@example.com',    phone: '+6017-2345098', emergency_contact_name: 'Amsyar Johari', emergency_contact_phone: '+6017-8900234', club_id: 'club-1', coach_id: 'coach-1', weight: 53.0, height: 163.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-24T09:00:00Z' },
  { id: 'part-46', registration_no: 'REG-2026-046', photo_url: '', full_name: 'Kevin Chong',        gender: 'Male', dob: '2009-05-23', nationality_code: 'MAS', passport_ic: '090523-07-9012', email: 'kevin@example.com',     phone: '+6012-3456109', emergency_contact_name: 'Chong Seng',   emergency_contact_phone: '+6012-9011345', club_id: 'club-2', coach_id: 'coach-2', weight: 54.0, height: 164.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-24T09:10:00Z' },
  { id: 'part-47', registration_no: 'REG-2026-047', photo_url: '', full_name: 'Syamil Aqil',        gender: 'Male', dob: '2010-08-11', nationality_code: 'MAS', passport_ic: '100811-09-0123', email: 'aqil@example.com',      phone: '+6019-4567210', emergency_contact_name: 'Aqil Rusdi',   emergency_contact_phone: '+6019-0122456', club_id: 'club-3', coach_id: 'coach-3', weight: 52.0, height: 161.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-24T09:20:00Z' },
  { id: 'part-48', registration_no: 'REG-2026-048', photo_url: '', full_name: 'Danial Akmal',       gender: 'Male', dob: '2009-11-29', nationality_code: 'MAS', passport_ic: '091129-06-1234', email: 'danial@example.com',    phone: '+6011-5678321', emergency_contact_name: 'Akmal Hadi',   emergency_contact_phone: '+6011-1233567', club_id: 'club-1', coach_id: 'coach-1', weight: 55.0, height: 165.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-24T09:30:00Z' },

  // ── cat-11: Junior Male Kumite -61kg (16-17) ─────────────────────────
  { id: 'part-49', registration_no: 'REG-2026-049', photo_url: '', full_name: 'Rizwan Hakimi',      gender: 'Male', dob: '2009-02-07', nationality_code: 'MAS', passport_ic: '090207-04-2345', email: 'rizwan@example.com',    phone: '+6013-6789432', emergency_contact_name: 'Hakimi Zaini', emergency_contact_phone: '+6013-2344678', club_id: 'club-2', coach_id: 'coach-2', weight: 59.0, height: 166.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-25T09:00:00Z' },
  { id: 'part-50', registration_no: 'REG-2026-050', photo_url: '', full_name: 'Darren Khor',        gender: 'Male', dob: '2010-07-14', nationality_code: 'MAS', passport_ic: '100714-08-3456', email: 'darren@example.com',    phone: '+6016-7890543', emergency_contact_name: 'Khor Ah Beng', emergency_contact_phone: '+6016-3455789', club_id: 'club-2', coach_id: 'coach-2', weight: 60.5, height: 167.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-25T09:10:00Z' },
  { id: 'part-51', registration_no: 'REG-2026-051', photo_url: '', full_name: 'Aiman Zulkifli',     gender: 'Male', dob: '2009-04-18', nationality_code: 'MAS', passport_ic: '090418-14-4567', email: 'aiman@example.com',     phone: '+6017-8901654', emergency_contact_name: 'Zulkifli Nor', emergency_contact_phone: '+6017-4566890', club_id: 'club-1', coach_id: 'coach-1', weight: 57.5, height: 165.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-25T09:20:00Z' },
  { id: 'part-52', registration_no: 'REG-2026-052', photo_url: '', full_name: 'Isyraf Izzat',       gender: 'Male', dob: '2010-10-02', nationality_code: 'MAS', passport_ic: '101002-11-5678', email: 'isyraf@example.com',    phone: '+6012-9012765', emergency_contact_name: 'Izzat Kamal',  emergency_contact_phone: '+6012-5677901', club_id: 'club-3', coach_id: 'coach-3', weight: 58.5, height: 164.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-25T09:30:00Z' },

  // ── cat-12: Junior Female Kumite -48kg (16-17) ───────────────────────
  { id: 'part-53', registration_no: 'REG-2026-053', photo_url: '', full_name: 'Anis Husna',         gender: 'Female', dob: '2010-03-21', nationality_code: 'MAS', passport_ic: '100321-06-6789', email: 'anishusna@example.com', phone: '+6019-0123876', emergency_contact_name: 'Husna Saad',   emergency_contact_phone: '+6019-6788012', club_id: 'club-1', coach_id: 'coach-1', weight: 46.0, height: 155.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-26T09:00:00Z' },
  { id: 'part-54', registration_no: 'REG-2026-054', photo_url: '', full_name: 'Yee Xin Rong',       gender: 'Female', dob: '2009-08-05', nationality_code: 'MAS', passport_ic: '090805-08-7890', email: 'xinrong@example.com',   phone: '+6011-1234076', emergency_contact_name: 'Yee Ah Mooi',  emergency_contact_phone: '+6011-7899312', club_id: 'club-2', coach_id: 'coach-2', weight: 47.0, height: 156.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-26T09:10:00Z' },
  { id: 'part-55', registration_no: 'REG-2026-055', photo_url: '', full_name: 'Batrisyia Nadhira',  gender: 'Female', dob: '2010-06-13', nationality_code: 'MAS', passport_ic: '100613-03-8901', email: 'batrisyia@example.com', phone: '+6013-2345187', emergency_contact_name: 'Nadhira Fuad', emergency_contact_phone: '+6013-8900423', club_id: 'club-3', coach_id: 'coach-3', weight: 45.0, height: 153.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-26T09:20:00Z' },
  { id: 'part-56', registration_no: 'REG-2026-056', photo_url: '', full_name: 'Suri Aina',          gender: 'Female', dob: '2009-12-30', nationality_code: 'MAS', passport_ic: '091230-05-9012', email: 'suri@example.com',      phone: '+6016-3456298', emergency_contact_name: 'Aina Roslan',  emergency_contact_phone: '+6016-9011534', club_id: 'club-1', coach_id: 'coach-1', weight: 48.0, height: 157.0, status: 'Confirmed', medical_status: 'Cleared', payment_status: 'Paid', remarks: '', created_at: '2026-06-26T09:30:00Z' },
];


const SEED_TEAMS: Team[] = [
  { id: 'team-1', name: 'Senshi Warriors', club_id: 'club-1', coach_id: 'coach-1', captain_id: 'part-1', score: 120, ranking: 1 },
  { id: 'team-2', name: 'PJ Tigers', club_id: 'club-2', coach_id: 'coach-2', captain_id: 'part-2', score: 90, ranking: 2 },
  { id: 'team-3', name: 'Penang Tiger Dojo', club_id: 'club-3', coach_id: 'coach-3', score: 45, ranking: 3 }
];

const SEED_TEAM_MEMBERS: TeamMember[] = [
  { id: 'tm-1', team_id: 'team-1', participant_id: 'part-1' },
  { id: 'tm-2', team_id: 'team-1', participant_id: 'part-3' },
  { id: 'tm-3', team_id: 'team-2', participant_id: 'part-2' }
];

const SEED_PARTICIPANT_CATEGORIES: ParticipantCategory[] = [
  // Original 8
  { id: 'pc-1',  participant_id: 'part-1', category_id: 'cat-2',  manual_override: false },
  { id: 'pc-2',  participant_id: 'part-2', category_id: 'cat-6',  manual_override: false },
  { id: 'pc-3',  participant_id: 'part-3', category_id: 'cat-4',  manual_override: false },
  { id: 'pc-4',  participant_id: 'part-4', category_id: 'cat-11', manual_override: false },
  { id: 'pc-5',  participant_id: 'part-5', category_id: 'cat-3',  manual_override: false },
  { id: 'pc-6',  participant_id: 'part-6', category_id: 'cat-5',  manual_override: false },
  { id: 'pc-7',  participant_id: 'part-7', category_id: 'cat-2',  manual_override: false },
  { id: 'pc-8',  participant_id: 'part-8', category_id: 'cat-4',  manual_override: false },
  // cat-1: Male Kumite -60kg (18+)
  { id: 'pc-9',  participant_id: 'part-9',  category_id: 'cat-1', manual_override: false },
  { id: 'pc-10', participant_id: 'part-10', category_id: 'cat-1', manual_override: false },
  { id: 'pc-11', participant_id: 'part-11', category_id: 'cat-1', manual_override: false },
  { id: 'pc-12', participant_id: 'part-12', category_id: 'cat-1', manual_override: false },
  // cat-2: Male Kumite -67kg (18+)
  { id: 'pc-13', participant_id: 'part-13', category_id: 'cat-2', manual_override: false },
  { id: 'pc-14', participant_id: 'part-14', category_id: 'cat-2', manual_override: false },
  { id: 'pc-15', participant_id: 'part-15', category_id: 'cat-2', manual_override: false },
  { id: 'pc-16', participant_id: 'part-16', category_id: 'cat-2', manual_override: false },
  // cat-3: Male Kumite -75kg (18+)
  { id: 'pc-17', participant_id: 'part-17', category_id: 'cat-3', manual_override: false },
  { id: 'pc-18', participant_id: 'part-18', category_id: 'cat-3', manual_override: false },
  { id: 'pc-19', participant_id: 'part-19', category_id: 'cat-3', manual_override: false },
  { id: 'pc-20', participant_id: 'part-20', category_id: 'cat-3', manual_override: false },
  // cat-4: Male Kumite +75kg (18+)
  { id: 'pc-21', participant_id: 'part-21', category_id: 'cat-4', manual_override: false },
  { id: 'pc-22', participant_id: 'part-22', category_id: 'cat-4', manual_override: false },
  { id: 'pc-23', participant_id: 'part-23', category_id: 'cat-4', manual_override: false },
  { id: 'pc-24', participant_id: 'part-24', category_id: 'cat-4', manual_override: false },
  // cat-5: Female Kumite -50kg (18+)
  { id: 'pc-25', participant_id: 'part-25', category_id: 'cat-5', manual_override: false },
  { id: 'pc-26', participant_id: 'part-26', category_id: 'cat-5', manual_override: false },
  { id: 'pc-27', participant_id: 'part-27', category_id: 'cat-5', manual_override: false },
  { id: 'pc-28', participant_id: 'part-28', category_id: 'cat-5', manual_override: false },
  // cat-6: Female Kumite -55kg (18+)
  { id: 'pc-29', participant_id: 'part-29', category_id: 'cat-6', manual_override: false },
  { id: 'pc-30', participant_id: 'part-30', category_id: 'cat-6', manual_override: false },
  { id: 'pc-31', participant_id: 'part-31', category_id: 'cat-6', manual_override: false },
  { id: 'pc-32', participant_id: 'part-32', category_id: 'cat-6', manual_override: false },
  // cat-7: Female Kumite +55kg (18+)
  { id: 'pc-33', participant_id: 'part-33', category_id: 'cat-7', manual_override: false },
  { id: 'pc-34', participant_id: 'part-34', category_id: 'cat-7', manual_override: false },
  { id: 'pc-35', participant_id: 'part-35', category_id: 'cat-7', manual_override: false },
  { id: 'pc-36', participant_id: 'part-36', category_id: 'cat-7', manual_override: false },
  // cat-8: Male Kata (18+)
  { id: 'pc-37', participant_id: 'part-37', category_id: 'cat-8', manual_override: false },
  { id: 'pc-38', participant_id: 'part-38', category_id: 'cat-8', manual_override: false },
  { id: 'pc-39', participant_id: 'part-39', category_id: 'cat-8', manual_override: false },
  { id: 'pc-40', participant_id: 'part-40', category_id: 'cat-8', manual_override: false },
  // cat-9: Female Kata (18+)
  { id: 'pc-41', participant_id: 'part-41', category_id: 'cat-9', manual_override: false },
  { id: 'pc-42', participant_id: 'part-42', category_id: 'cat-9', manual_override: false },
  { id: 'pc-43', participant_id: 'part-43', category_id: 'cat-9', manual_override: false },
  { id: 'pc-44', participant_id: 'part-44', category_id: 'cat-9', manual_override: false },
  // cat-10: Junior Male Kumite -55kg (16-17)
  { id: 'pc-45', participant_id: 'part-45', category_id: 'cat-10', manual_override: false },
  { id: 'pc-46', participant_id: 'part-46', category_id: 'cat-10', manual_override: false },
  { id: 'pc-47', participant_id: 'part-47', category_id: 'cat-10', manual_override: false },
  { id: 'pc-48', participant_id: 'part-48', category_id: 'cat-10', manual_override: false },
  // cat-11: Junior Male Kumite -61kg (16-17)
  { id: 'pc-49', participant_id: 'part-49', category_id: 'cat-11', manual_override: false },
  { id: 'pc-50', participant_id: 'part-50', category_id: 'cat-11', manual_override: false },
  { id: 'pc-51', participant_id: 'part-51', category_id: 'cat-11', manual_override: false },
  { id: 'pc-52', participant_id: 'part-52', category_id: 'cat-11', manual_override: false },
  // cat-12: Junior Female Kumite -48kg (16-17)
  { id: 'pc-53', participant_id: 'part-53', category_id: 'cat-12', manual_override: false },
  { id: 'pc-54', participant_id: 'part-54', category_id: 'cat-12', manual_override: false },
  { id: 'pc-55', participant_id: 'part-55', category_id: 'cat-12', manual_override: false },
  { id: 'pc-56', participant_id: 'part-56', category_id: 'cat-12', manual_override: false },
];


const SEED_PAYMENTS: Payment[] = [
  { id: 'pay-1', participant_id: 'part-1', amount: 150.00, status: 'Paid', payment_method: 'Credit Card', transaction_id: 'TXN-9871625', created_at: '2026-06-15T08:35:00Z' },
  { id: 'pay-2', participant_id: 'part-2', amount: 150.00, status: 'Paid', payment_method: 'Bank Transfer', transaction_id: 'TXN-1284729', created_at: '2026-06-16T09:20:00Z' },
  { id: 'pay-3', participant_id: 'part-3', amount: 150.00, status: 'Paid', payment_method: 'Cash', created_at: '2026-06-18T14:25:00Z' },
  { id: 'pay-4', participant_id: 'part-5', amount: 200.00, status: 'Paid', payment_method: 'PayPal', transaction_id: 'TXN-9988221', created_at: '2026-06-22T11:50:00Z' },
  { id: 'pay-5', participant_id: 'part-7', amount: 200.00, status: 'Paid', payment_method: 'Credit Card', transaction_id: 'TXN-8877112', created_at: '2026-06-26T15:45:00Z' },
  { id: 'pay-6', participant_id: 'part-8', amount: 150.00, status: 'Paid', payment_method: 'Cash', created_at: '2026-06-27T16:15:00Z' }
];

const SEED_MEDICAL_RECORDS: MedicalRecord[] = [
  { id: 'med-1', participant_id: 'part-1', conditions: 'None', allergies: 'Peanuts', blood_type: 'O+', has_clearance: true, remarks: 'Cleared for high impact' },
  { id: 'med-2', participant_id: 'part-2', conditions: 'Mild Asthma', allergies: 'Dust', blood_type: 'A+', has_clearance: true, remarks: 'Uses inhaler when needed' },
  { id: 'med-3', participant_id: 'part-3', conditions: 'None', allergies: 'Penicillin', blood_type: 'B-', has_clearance: true, remarks: 'Excellent physical conditioning' },
  { id: 'med-4', participant_id: 'part-4', conditions: 'None', allergies: 'None', blood_type: 'O-', has_clearance: false, remarks: 'Guardian consent signature pending' },
  { id: 'med-5', participant_id: 'part-5', conditions: 'None', allergies: 'None', blood_type: 'AB+', has_clearance: true, remarks: 'Full clearance submitted' },
  { id: 'med-6', participant_id: 'part-6', conditions: 'Heart Murmur history', allergies: 'None', blood_type: 'A-', has_clearance: false, remarks: 'Needs doctor review letter' }
];

const SEED_DOCUMENTS: Document[] = [
  { id: 'doc-1', participant_id: 'part-1', name: 'Passport Copy.pdf', doc_type: 'Identity', file_url: '/mock/docs/daniel_passport.pdf', uploaded_at: '2026-06-15T08:32:00Z' },
  { id: 'doc-2', participant_id: 'part-2', name: 'Waiver Form.pdf', doc_type: 'Waiver', file_url: '/mock/docs/chloe_waiver.pdf', uploaded_at: '2026-06-16T09:18:00Z' },
  { id: 'doc-3', participant_id: 'part-3', name: 'Medical Release.pdf', doc_type: 'Medical', file_url: '/mock/docs/subra_medical.pdf', uploaded_at: '2026-06-18T14:24:00Z' }
];

const SEED_ACTIVITY_LOGS: ActivityLog[] = [
  { id: 'act-1', participant_id: 'part-1', operator_name: 'System', action: 'Registration Created', details: 'Ahmad Daniel registered online', created_at: '2026-06-15T08:30:00Z' },
  { id: 'act-2', participant_id: 'part-1', operator_name: 'Admin Haris', action: 'Status Updated', details: 'Status changed from Pending to Confirmed', created_at: '2026-06-15T10:00:00Z' },
  { id: 'act-3', participant_id: 'part-2', operator_name: 'System', action: 'Registration Created', details: 'Chloe Tan registered online', created_at: '2026-06-16T09:15:00Z' }
];

const SEED_OFFICIALS: Official[] = [
  { id: 'off-1', name: 'Sensei Haris Ahmad', role: 'Referee', qualification: 'WKF Referee A', assigned_tatami: 'Tatami 1', email: 'haris@senshikarate.com', phone: '+6012-3456789', status: 'Active' },
  { id: 'off-2', name: 'Sensei Chloe Tan', role: 'Tatami Manager', qualification: 'National Referee A', assigned_tatami: 'Tatami 2', email: 'chloe@senshikarate.com', phone: '+6013-9876543', status: 'Active' },
  { id: 'off-3', name: 'Judith Lim', role: 'Judge', qualification: 'State Judge B', assigned_tatami: 'Tatami 1', email: 'judith@gmail.com', phone: '+6017-1234567', status: 'Active' },
  { id: 'off-4', name: 'Tan Wei Jin', role: 'Table Official', qualification: 'Scorekeeper Cert', assigned_tatami: 'Tatami 1', email: 'weijin@gmail.com', phone: '+6016-5551234', status: 'Active' },
  { id: 'off-5', name: 'Sensei Somporn', role: 'Referee', qualification: 'National Judge A', assigned_tatami: 'Tatami 3', email: 'somporn@karate.or.th', phone: '+662-1112222', status: 'Active' },
  { id: 'off-6', name: 'Ahmad Syafiq', role: 'Judge', qualification: 'State Referee C', assigned_tatami: 'Tatami 2', email: 'syafiq@yahoo.com', phone: '+6018-4443333', status: 'Active' }
];

// Helper to check if we are running in browser context
const isClient = () => typeof window !== 'undefined';

// ── Seed versioning ─────────────────────────────────────────────────────────
// Bump this string whenever SEED_* data changes. The app will automatically
// wipe the old localStorage cache and re-seed on the next page load.
const SEED_VERSION = 'v2026-06-30-off';
import { localStore } from './localStore';
import { TournamentDatabase } from './types';

export let activeTournamentDb: TournamentDatabase | null = null;

let saveTimeout: NodeJS.Timeout | null = null;
const triggerAutoSave = () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    if (activeTournamentDb) {
      localStore.saveTournament(activeTournamentDb).catch(console.error);
    }
  }, 1000);
};

export const setActiveTournamentDb = (db: TournamentDatabase | null) => {
  activeTournamentDb = db;
};

const keyMap: Record<string, keyof TournamentDatabase> = {
  'ts_clubs': 'clubs',
  'ts_coaches': 'coaches',
  'ts_categories': 'categories',
  'ts_teams': 'teams',
  'ts_team_members': 'team_members',
  'ts_participant_categories': 'participant_categories',
  'ts_participants': 'participants',
  'ts_payments': 'payments',
  'ts_medical_records': 'medical',
  'ts_documents': 'documents',
  'ts_activity_logs': 'activity_logs',
  'ts_bouts': 'bouts',
  'ts_officials': 'officials',
  'ts_display_playlists': 'display_playlists'
};

// Fetch a key from active DB, localStorage, or return default seed data
function getStoreData<T>(key: string, seed: T[]): T[] {
  if (activeTournamentDb && keyMap[key]) {
    const prop = keyMap[key];
    if (activeTournamentDb[prop]) {
      return activeTournamentDb[prop] as T[];
    }
    // initialize empty array if not present in the loaded DB
    (activeTournamentDb as any)[prop] = [];
    return [];
  }

  if (!isClient()) return seed;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch (e) {
    return seed;
  }
}

// Write a key to active DB or localStorage
function saveStoreData<T>(key: string, data: T[]) {
  if (activeTournamentDb && keyMap[key]) {
    const prop = keyMap[key];
    (activeTournamentDb as any)[prop] = data;
    triggerAutoSave();
    return;
  }

  if (!isClient()) return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving data to localStorage', e);
  }
}

const SEED_VERSION_KEY = 'ts_seed_version';

const SEED_KEYS = [
  'ts_countries', 'ts_clubs', 'ts_coaches', 'ts_categories',
  'ts_teams', 'ts_team_members', 'ts_participant_categories',
  'ts_participants', 'ts_payments', 'ts_medical_records',
  'ts_documents', 'ts_activity_logs', 'ts_bouts', 'ts_officials',
  'ts_display_playlists'
];

function initSeedStore() {
  if (!isClient()) return;
  try {
    const storedVersion = localStorage.getItem(SEED_VERSION_KEY);
    if (storedVersion !== SEED_VERSION) {
      // Clear all cached seed data so getStoreData() re-seeds from SEED_* arrays
      SEED_KEYS.forEach(k => localStorage.removeItem(k));
      localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
      console.info('[mockStore] Seed version changed → cache cleared and re-seeded.');
    }
  } catch (e) {
    console.warn('[mockStore] localStorage not available (Safari Private Browsing?)', e);
  }
}
try { initSeedStore(); } catch (e) { /* Safari Private Browsing / localStorage blocked */ }
// ────────────────────────────────────────────────────────────────────────────



// Global Store interface using local persistence
export const mockStore = {
  // 1. Countries
  countries: {
    list: (): Country[] => getStoreData('ts_countries', SEED_COUNTRIES),
  },

  // 2. Clubs
  clubs: {
    list: (): Club[] => getStoreData('ts_clubs', SEED_CLUBS),
    add: (club: Omit<Club, 'id'>): Club => {
      const list = getStoreData('ts_clubs', SEED_CLUBS);
      const newClub = { ...club, id: `club-${Date.now()}` };
      list.push(newClub);
      saveStoreData('ts_clubs', list);
      return newClub;
    },
    update: (id: string, updates: Partial<Club>): Club => {
      const list = getStoreData('ts_clubs', SEED_CLUBS);
      const idx = list.findIndex(c => c.id === id);
      if (idx === -1) throw new Error('Club not found');
      const updated = { ...list[idx], ...updates };
      list[idx] = updated;
      saveStoreData('ts_clubs', list);
      return updated;
    },
    delete: (id: string): void => {
      const list = getStoreData('ts_clubs', SEED_CLUBS);
      const filtered = list.filter(c => c.id !== id);
      saveStoreData('ts_clubs', filtered);
    }
  },

  // 3. Coaches
  coaches: {
    list: (): Coach[] => getStoreData('ts_coaches', SEED_COACHES),
    add: (coach: Omit<Coach, 'id'>): Coach => {
      const list = getStoreData('ts_coaches', SEED_COACHES);
      const newCoach = { ...coach, id: `coach-${Date.now()}` };
      list.push(newCoach);
      saveStoreData('ts_coaches', list);
      return newCoach;
    }
  },

  // 4. Categories
  categories: {
    list: (): Category[] => getStoreData('ts_categories', SEED_CATEGORIES),
    update: (id: string, updates: Partial<Category>): Category => {
      const list = getStoreData('ts_categories', SEED_CATEGORIES);
      const idx = list.findIndex(c => c.id === id);
      if (idx === -1) throw new Error('Category not found');
      const updated = { ...list[idx], ...updates };
      list[idx] = updated;
      saveStoreData('ts_categories', list);
      return updated;
    },
    add: (cat: Omit<Category, 'id'>): Category => {
      const list = getStoreData('ts_categories', SEED_CATEGORIES);
      const newCat = { ...cat, id: `cat-${Date.now()}` };
      list.push(newCat);
      saveStoreData('ts_categories', list);
      return newCat;
    },
    delete: (id: string): void => {
      const list = getStoreData('ts_categories', SEED_CATEGORIES);
      const filtered = list.filter(c => c.id !== id);
      saveStoreData('ts_categories', filtered);
    },
    merge: (catIds: string[], mergedName: string): Category => {
      const list = getStoreData('ts_categories', SEED_CATEGORIES);
      const selected = list.filter(c => catIds.includes(c.id));
      if (selected.length < 2) throw new Error('Need at least 2 categories to merge');
      
      // Determine boundaries based on selection
      const minAge = Math.min(...selected.map(s => s.min_age));
      const maxAge = Math.max(...selected.map(s => s.max_age));
      const minWeight = Math.min(...selected.map(s => s.min_weight));
      const maxWeight = Math.max(...selected.map(s => s.max_weight));
      const gender = selected[0].gender;

      const mergedCat = mockStore.categories.add({
        name: mergedName,
        gender,
        min_age: minAge,
        max_age: maxAge,
        min_weight: minWeight,
        max_weight: maxWeight,
        capacity: 32,
        status: 'Open'
      });

      // Reassign participants from old categories to new
      const mappings = getStoreData('ts_participant_categories', SEED_PARTICIPANT_CATEGORIES);
      mappings.forEach(m => {
        if (catIds.includes(m.category_id)) {
          m.category_id = mergedCat.id;
        }
      });
      saveStoreData('ts_participant_categories', mappings);

      // Disable/delete merged categories or close them
      const updatedList = getStoreData('ts_categories', SEED_CATEGORIES).map(c => {
        if (catIds.includes(c.id)) {
          return { ...c, status: 'Closed' as const };
        }
        return c;
      });
      saveStoreData('ts_categories', updatedList);

      return mergedCat;
    },
    split: (catId: string, split1: Omit<Category, 'id' | 'status'>, split2: Omit<Category, 'id' | 'status'>): [Category, Category] => {
      const list = getStoreData('ts_categories', SEED_CATEGORIES);
      const original = list.find(c => c.id === catId);
      if (!original) throw new Error('Original category not found');

      const cat1 = mockStore.categories.add({ ...split1, status: 'Open' });
      const cat2 = mockStore.categories.add({ ...split2, status: 'Open' });

      // Split participants based on new criteria (automatically redistribute or prompt override)
      const participants = mockStore.participants.list();
      const mappings = getStoreData('ts_participant_categories', SEED_PARTICIPANT_CATEGORIES);
      
      mappings.forEach(m => {
        if (m.category_id === catId) {
          const p = participants.find(part => part.id === m.participant_id);
          if (p) {
            const age = mockStore.helpers.calculateAge(p.dob);
            if (
              age >= cat1.min_age && age <= cat1.max_age &&
              p.weight >= cat1.min_weight && p.weight <= cat1.max_weight
            ) {
              m.category_id = cat1.id;
            } else {
              m.category_id = cat2.id;
            }
          }
        }
      });
      saveStoreData('ts_participant_categories', mappings);

      // Close original category
      const updatedList = getStoreData('ts_categories', SEED_CATEGORIES).map(c => {
        if (c.id === catId) {
          return { ...c, status: 'Closed' as const };
        }
        return c;
      });
      saveStoreData('ts_categories', updatedList);

      return [cat1, cat2];
    }
  },

  // 5. Teams
  teams: {
    list: (): Team[] => getStoreData('ts_teams', SEED_TEAMS),
    get: (id: string): Team | undefined => getStoreData('ts_teams', SEED_TEAMS).find(t => t.id === id),
    add: (team: Omit<Team, 'id' | 'score'>): Team => {
      const list = getStoreData('ts_teams', SEED_TEAMS);
      const newTeam = { ...team, id: `team-${Date.now()}`, score: 0 };
      list.push(newTeam);
      saveStoreData('ts_teams', list);
      return newTeam;
    },
    update: (id: string, updates: Partial<Team>): Team => {
      const list = getStoreData('ts_teams', SEED_TEAMS);
      const idx = list.findIndex(t => t.id === id);
      if (idx === -1) throw new Error('Team not found');
      const updated = { ...list[idx], ...updates };
      list[idx] = updated;
      saveStoreData('ts_teams', list);
      return updated;
    },
    members: (teamId: string): Participant[] => {
      const mapping = getStoreData('ts_team_members', SEED_TEAM_MEMBERS);
      const participantIds = mapping.filter(m => m.team_id === teamId).map(m => m.participant_id);
      return mockStore.participants.list().filter(p => participantIds.includes(p.id));
    },
    addMember: (teamId: string, participantId: string): TeamMember => {
      const teams = getStoreData('ts_teams', SEED_TEAMS);
      const team = teams.find(t => t.id === teamId);
      if (!team) throw new Error('Team not found');

      const participant = mockStore.participants.get(participantId);
      if (!participant) throw new Error('Participant not found');

      // Auto validation: Only same club allowed
      if (participant.club_id !== team.club_id) {
        throw new Error('Verification failed: Participant must belong to the same club as the team.');
      }

      const mapping = getStoreData('ts_team_members', SEED_TEAM_MEMBERS);
      
      // Check if already in this team
      const existing = mapping.find(m => m.team_id === teamId && m.participant_id === participantId);
      if (existing) return existing;

      const newMember: TeamMember = {
        id: `tm-${Date.now()}`,
        team_id: teamId,
        participant_id: participantId,
        joined_at: new Date().toISOString()
      };
      
      mapping.push(newMember);
      saveStoreData('ts_team_members', mapping);
      return newMember;
    },
    removeMember: (teamId: string, participantId: string): void => {
      const mapping = getStoreData('ts_team_members', SEED_TEAM_MEMBERS);
      const filtered = mapping.filter(m => !(m.team_id === teamId && m.participant_id === participantId));
      saveStoreData('ts_team_members', filtered);
    }
  },

  // 5b. Participant Category Mappings
  participantCategories: {
    list: (): ParticipantCategory[] => getStoreData('ts_participant_categories', SEED_PARTICIPANT_CATEGORIES),
  },

  // 6. Participants
  participants: {
    list: (): Participant[] => {
      const list = getStoreData('ts_participants', SEED_PARTICIPANTS);
      // Filter out soft-deleted
      return list.filter(p => !p.deleted_at);
    },
    listDeleted: (): Participant[] => {
      const list = getStoreData('ts_participants', SEED_PARTICIPANTS);
      return list.filter(p => !!p.deleted_at);
    },
    get: (id: string): Participant | undefined => {
      return getStoreData('ts_participants', SEED_PARTICIPANTS).find(p => p.id === id);
    },
    add: (participant: Omit<Participant, 'id' | 'registration_no' | 'created_at'>): Participant => {
      const list = getStoreData('ts_participants', SEED_PARTICIPANTS);
      const count = list.length + 1;
      const regNo = `REG-2026-${String(count).padStart(3, '0')}`;
      const id = `part-${Date.now()}`;
      
      const newParticipant: Participant = {
        ...participant,
        id,
        registration_no: regNo,
        created_at: new Date().toISOString()
      };

      list.push(newParticipant);
      saveStoreData('ts_participants', list);

      // Initialize medical clearance & payments automatically
      mockStore.medical.create(id, {
        conditions: participant.remarks || 'None',
        allergies: 'None',
        blood_type: 'O+',
        has_clearance: participant.medical_status === 'Cleared',
        remarks: 'Auto-created'
      });

      mockStore.payments.create(id, {
        amount: 150.00,
        status: participant.payment_status,
        payment_method: participant.payment_status === 'Paid' ? 'Credit Card' : undefined
      });

      // Auto-assign category
      mockStore.categories.list(); // Load categories
      mockStore.participants.autoAssignCategory(newParticipant);

      // Create Audit Log
      mockStore.audit.log('System', 'INSERT', 'participants', id, null, { ...newParticipant } as Record<string, unknown>);
      mockStore.activityLogs.log(id, 'System', 'Registration Created', `Participant ${participant.full_name} registered successfully`);

      return newParticipant;
    },
    update: (id: string, updates: Partial<Participant>, operator = 'Admin'): Participant => {
      const list = getStoreData('ts_participants', SEED_PARTICIPANTS);
      const idx = list.findIndex(p => p.id === id);
      if (idx === -1) throw new Error('Participant not found');

      const original = { ...list[idx] };
      const updated = { ...list[idx], ...updates };
      list[idx] = updated;
      saveStoreData('ts_participants', list);

      // Check if age, weight, or gender changed - recalculate category
      const dobChanged = updates.dob && updates.dob !== original.dob;
      const weightChanged = updates.weight && updates.weight !== original.weight;
      const genderChanged = updates.gender && updates.gender !== original.gender;

      if (dobChanged || weightChanged || genderChanged) {
        mockStore.participants.autoAssignCategory(updated);
      }

      // Sync medical record status if changed
      if (updates.medical_status) {
        const med = mockStore.medical.get(id);
        if (med) {
          mockStore.medical.update(med.id, { has_clearance: updates.medical_status === 'Cleared' });
        }
      }

      // Sync payment status if changed
      if (updates.payment_status) {
        const pays = mockStore.payments.list().filter(p => p.participant_id === id);
        if (pays.length > 0) {
          mockStore.payments.update(pays[0].id, { status: updates.payment_status as Payment['status'] });
        }
      }

      // Audit and activity logging
      mockStore.audit.log(operator, 'UPDATE', 'participants', id, { ...original } as Record<string, unknown>, { ...updated } as Record<string, unknown>);
      
      const changeDesc: string[] = [];
      if (updates.status && updates.status !== original.status) changeDesc.push(`status changed from ${original.status} to ${updates.status}`);
      if (updates.weight && updates.weight !== original.weight) changeDesc.push(`weight updated to ${updates.weight}kg`);
      if (updates.club_id && updates.club_id !== original.club_id) changeDesc.push(`club reassigned`);
      
      mockStore.activityLogs.log(
        id, 
        operator, 
        'Details Edited', 
        changeDesc.length > 0 ? `Updated details: ${changeDesc.join(', ')}` : 'Personal details updated'
      );

      return updated;
    },
    delete: (id: string, operator = 'Admin'): void => {
      const list = getStoreData('ts_participants', SEED_PARTICIPANTS);
      const idx = list.findIndex(p => p.id === id);
      if (idx === -1) throw new Error('Participant not found');

      const original = { ...list[idx] };
      // Soft delete by setting deleted_at
      list[idx].deleted_at = new Date().toISOString();
      saveStoreData('ts_participants', list);

      // Log activity and audit
      mockStore.audit.log(operator, 'DELETE', 'participants', id, { ...original } as Record<string, unknown>, null);
      mockStore.activityLogs.log(id, operator, 'Soft Deleted', 'Participant soft-deleted from active list');
    },
    restore: (id: string, operator = 'Admin'): Participant => {
      const list = getStoreData('ts_participants', SEED_PARTICIPANTS);
      const idx = list.findIndex(p => p.id === id);
      if (idx === -1) throw new Error('Participant not found');

      const original = { ...list[idx] };
      list[idx].deleted_at = undefined;
      saveStoreData('ts_participants', list);

      mockStore.audit.log(operator, 'INSERT', 'participants', id, { ...original } as Record<string, unknown>, { ...list[idx] } as Record<string, unknown>);
      mockStore.activityLogs.log(id, operator, 'Restored', 'Participant restored from bin');

      return list[idx];
    },
    autoAssignCategory: (p: Participant): Category | null => {
      const categories = mockStore.categories.list();
      const age = mockStore.helpers.calculateAge(p.dob);
      const pGenderNorm = (p.gender || '').toLowerCase().startsWith('f') ? 'Female' : (p.gender || '').toLowerCase().startsWith('m') ? 'Male' : 'Mixed';

      // Find matching category based on age, weight, and gender
      const matched = categories.find(c => {
        const cGenderNorm = c.gender || 'Male';
        const genderMatches = cGenderNorm === 'Mixed' || cGenderNorm === pGenderNorm;
        const ageMatches = age >= c.min_age && age <= c.max_age;
        const isKataOrOpenWeight = (c.min_weight === 0 && (c.max_weight === 0 || c.max_weight >= 100)) || c.name.toLowerCase().includes('kata');
        const weightMatches = isKataOrOpenWeight || (p.weight >= c.min_weight && p.weight <= c.max_weight);

        return genderMatches && ageMatches && weightMatches && c.status !== 'Closed';
      });

      if (matched) {
        // Save mapping
        const mappings = getStoreData('ts_participant_categories', SEED_PARTICIPANT_CATEGORIES);
        // Remove previous mapping if exists
        const filtered = mappings.filter(m => m.participant_id !== p.id);
        
        filtered.push({
          id: `pc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          participant_id: p.id,
          category_id: matched.id,
          manual_override: false,
          assigned_at: new Date().toISOString()
        });

        saveStoreData('ts_participant_categories', filtered);
        return matched;
      }
      return null;
    },
    assignCategoryManually: (participantId: string, categoryId: string, operator = 'Admin'): void => {
      const mappings = getStoreData('ts_participant_categories', SEED_PARTICIPANT_CATEGORIES);
      const filtered = mappings.filter(m => m.participant_id !== participantId);
      
      filtered.push({
        id: `pc-${Date.now()}`,
        participant_id: participantId,
        category_id: categoryId,
        manual_override: true,
        assigned_at: new Date().toISOString()
      });
      saveStoreData('ts_participant_categories', filtered);

      const cat = mockStore.categories.list().find(c => c.id === categoryId);
      mockStore.activityLogs.log(
        participantId, 
        operator, 
        'Category Moved (Manual)', 
        `Moved category manually to: ${cat ? cat.name : 'Unknown Category'}`
      );
    },
    removeCategoryMapping: (participantId: string, categoryId: string): void => {
      const mappings = getStoreData('ts_participant_categories', SEED_PARTICIPANT_CATEGORIES);
      const filtered = mappings.filter(m => !(m.participant_id === participantId && m.category_id === categoryId));
      saveStoreData('ts_participant_categories', filtered);
    },
    getAssignedCategory: (participantId: string): Category | undefined => {
      const mappings = getStoreData('ts_participant_categories', SEED_PARTICIPANT_CATEGORIES);
      const mapping = mappings.find(m => m.participant_id === participantId);
      if (!mapping) return undefined;
      return mockStore.categories.list().find(c => c.id === mapping.category_id);
    }
  },

  // 7. Payments
  payments: {
    list: (): Payment[] => getStoreData('ts_payments', SEED_PAYMENTS),
    create: (participantId: string, pay: Partial<Payment>): Payment => {
      const list = getStoreData('ts_payments', SEED_PAYMENTS);
      const newPay: Payment = {
        id: `pay-${Date.now()}`,
        participant_id: participantId,
        amount: pay.amount || 150.00,
        status: pay.status ?? 'Unpaid',
        payment_method: pay.payment_method,
        transaction_id: pay.transaction_id,
        created_at: new Date().toISOString()
      };
      list.push(newPay);
      saveStoreData('ts_payments', list);
      return newPay;
    },
    update: (id: string, updates: Partial<Payment>): Payment => {
      const list = getStoreData('ts_payments', SEED_PAYMENTS);
      const idx = list.findIndex(p => p.id === id);
      if (idx === -1) throw new Error('Payment not found');
      const updated = { ...list[idx], ...updates };
      list[idx] = updated;
      saveStoreData('ts_payments', list);
      return updated;
    }
  },

  // 8. Medical Records
  medical: {
    get: (participantId: string): MedicalRecord | undefined => {
      return getStoreData('ts_medical_records', SEED_MEDICAL_RECORDS).find(m => m.participant_id === participantId);
    },
    create: (participantId: string, med: Partial<MedicalRecord>): MedicalRecord => {
      const list = getStoreData('ts_medical_records', SEED_MEDICAL_RECORDS);
      const newMed: MedicalRecord = {
        id: `med-${Date.now()}`,
        participant_id: participantId,
        conditions: med.conditions || 'None',
        allergies: med.allergies || 'None',
        blood_type: med.blood_type || 'O+',
        has_clearance: med.has_clearance !== undefined ? med.has_clearance : true,
        remarks: med.remarks,
        updated_at: new Date().toISOString()
      };
      list.push(newMed);
      saveStoreData('ts_medical_records', list);
      return newMed;
    },
    update: (id: string, updates: Partial<MedicalRecord>): MedicalRecord => {
      const list = getStoreData('ts_medical_records', SEED_MEDICAL_RECORDS);
      const idx = list.findIndex(m => m.id === id);
      if (idx === -1) throw new Error('Medical record not found');
      const updated = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
      list[idx] = updated;
      saveStoreData('ts_medical_records', list);
      return updated;
    }
  },

  // 9. Documents
  documents: {
    list: (participantId: string): Document[] => {
      return getStoreData('ts_documents', SEED_DOCUMENTS).filter(d => d.participant_id === participantId);
    },
    upload: (participantId: string, name: string, doc_type: string, file_url: string): Document => {
      const list = getStoreData('ts_documents', SEED_DOCUMENTS);
      const newDoc: Document = {
        id: `doc-${Date.now()}`,
        participant_id: participantId,
        name,
        doc_type,
        file_url,
        uploaded_at: new Date().toISOString()
      };
      list.push(newDoc);
      saveStoreData('ts_documents', list);
      
      mockStore.activityLogs.log(participantId, 'Admin', 'Document Uploaded', `Uploaded document: ${name} (${doc_type})`);
      return newDoc;
    },
    delete: (id: string): void => {
      const list = getStoreData('ts_documents', SEED_DOCUMENTS);
      const filtered = list.filter(d => d.id !== id);
      saveStoreData('ts_documents', filtered);
    }
  },

  // 10. Activity Logs
  activityLogs: {
    list: (participantId: string): ActivityLog[] => {
      const list = getStoreData('ts_activity_logs', SEED_ACTIVITY_LOGS);
      return list.filter(l => l.participant_id === participantId).sort((a,b) => {
        return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
      });
    },
    log: (participantId: string | null, operator: string, action: string, details: string): ActivityLog => {
      const list = getStoreData('ts_activity_logs', SEED_ACTIVITY_LOGS);
      const newLog: ActivityLog = {
        id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        participant_id: participantId,
        operator_name: operator,
        action,
        details,
        created_at: new Date().toISOString()
      };
      list.push(newLog);
      saveStoreData('ts_activity_logs', list);
      return newLog;
    }
  },

  // 11. Audit Logs
  audit: {
    list: (): AuditLog[] => {
      return getStoreData<AuditLog>('ts_audit_logs', []).sort((a,b) => {
        return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
      });
    },
    log: (operator: string, action: 'INSERT' | 'UPDATE' | 'DELETE', table: string, recordId: string, oldVal: Record<string, unknown> | null, newVal: Record<string, unknown> | null): AuditLog => {
      const list = getStoreData<AuditLog>('ts_audit_logs', []);
      const newLog: AuditLog = {
        id: `aud-${Date.now()}`,
        user_email: operator.includes('@') ? operator : `${operator.toLowerCase()}@senshikarate.com`,
        action,
        table_name: table,
        record_id: recordId,
        old_values: oldVal,
        new_values: newVal,
        created_at: new Date().toISOString()
      };
      list.push(newLog);
      saveStoreData('ts_audit_logs', list);
      return newLog;
    }
  },

  // 12. Bouts & Brackets Generation
  bouts: {
    list: (): Bout[] => {
      return getStoreData<Bout>('ts_bouts', []);
    },
    listForCategory: (catId: string): Bout[] => {
      return getStoreData<Bout>('ts_bouts', []).filter(b => b.category_id === catId);
    },
    clearDraw: (catId: string): void => {
      const list = getStoreData<Bout>('ts_bouts', []);
      const filtered = list.filter(b => b.category_id !== catId);
      saveStoreData('ts_bouts', filtered);
    },
    clearAllDraws: (): void => {
      saveStoreData('ts_bouts', []);
    },
    saveBouts: (catId: string, newBouts: Bout[]): void => {
      const list = getStoreData<Bout>('ts_bouts', []).filter(b => b.category_id !== catId);
      saveStoreData('ts_bouts', [...list, ...newBouts]);
    },
    generateDraw: (catId: string, drawType: string, hasThirdPlace: boolean, passedAthletes?: Participant[]): Bout[] => {
      console.log('[mockStore.generateDraw] catId:', catId, 'passedAthletes count:', passedAthletes?.length);
      let athletes = passedAthletes;
      if (!athletes) {
        const mappings = getStoreData<ParticipantCategory>('ts_participant_categories', SEED_PARTICIPANT_CATEGORIES);
        const athleteIds = mappings.filter(m => m.category_id === catId).map(m => m.participant_id);
        console.log('[mockStore.generateDraw] fallback to local storage. mappings for category:', athleteIds.length);
        const participants = getStoreData<Participant>('ts_participants', SEED_PARTICIPANTS);
        athletes = participants.filter(p => athleteIds.includes(p.id) && !p.deleted_at && p.status !== 'Cancelled');
        console.log('[mockStore.generateDraw] fallback local active athletes filtered:', athletes.length);
      }

      if (athletes.length === 0) {
        throw new Error('Cannot generate draws: No active participants in this category.');
      }

      mockStore.bouts.clearDraw(catId);

      const generatedBouts: Bout[] = [];
      const allBouts = getStoreData<Bout>('ts_bouts', []);

      if (drawType === 'Round-robin' || drawType === 'round_robin') {
        let boutIndex = 1;
        for (let i = 0; i < athletes.length; i++) {
          for (let j = i + 1; j < athletes.length; j++) {
            const newBout: Bout = {
              id: `bout-${catId}-${boutIndex}-${Date.now()}`,
              category_id: catId,
              bout_no: boutIndex,
              round_no: 1,
              participant_a_id: athletes[i].id,
              participant_b_id: athletes[j].id,
              winner_id: null,
              score_a: 0,
              score_b: 0,
              status: 'Scheduled',
              tatami: 'Tatami 1',
              senshu_a: false,
              senshu_b: false,
              penalties_a: '',
              penalties_b: '',
              penalties_c1_a: '0',
              penalties_c2_a: '0',
              penalties_c3_a: '0',
              penalties_c1_b: '0',
              penalties_c2_b: '0',
              penalties_c3_b: '0',
              points_aka_history: '',
              points_ao_history: '',
              victory_method: '',
              timer_seconds: 180,
              timer_active: false
            };
            generatedBouts.push(newBout);
            boutIndex++;
          }
        }
      } else {
        const count = athletes.length;
        const slots = Math.max(2, Math.pow(2, Math.ceil(Math.log2(count))));
        
        // Generate standard WKF seed order for symmetrical bye distribution
        let seedOrder = [1, 2];
        let currentSize = 2;
        while (currentSize < slots) {
          const nextOrder: number[] = [];
          for (let i = 0; i < seedOrder.length; i++) {
            nextOrder.push(seedOrder[i]);
            nextOrder.push(currentSize * 2 + 1 - seedOrder[i]);
          }
          seedOrder = nextOrder;
          currentSize *= 2;
        }

        const bracketList: (string | null)[] = new Array(slots).fill(null);
        for (let i = 0; i < slots; i++) {
          const seedIndex = seedOrder[i] - 1; // 1-based seed to 0-based index
          if (seedIndex < count) {
            bracketList[i] = athletes[seedIndex].id;
          }
        }

        let boutNo = 1;
        const totalRound1Bouts = slots / 2;
        
        for (let i = 0; i < slots; i += 2) {
          const partA = bracketList[i];
          const partB = bracketList[i + 1];
          
          let status: 'Scheduled' | 'Completed' | 'Walkover' = 'Scheduled';
          let winner: string | null = null;
          
          if (partA && !partB) {
            winner = partA;
            status = 'Walkover';
          } else if (!partA && partB) {
            winner = partB;
            status = 'Walkover';
          } else if (!partA && !partB) {
            status = 'Walkover';
          }

          const newBout: Bout = {
            id: `bout-${catId}-r1-${boutNo}-${Date.now()}`,
            category_id: catId,
            bout_no: boutNo,
            round_no: 1,
            participant_a_id: partA,
            participant_b_id: partB,
            winner_id: winner,
            score_a: 0,
            score_b: 0,
            status,
            tatami: `Tatami ${Math.ceil(boutNo / 4) === 1 ? '1' : '2'}`,
            senshu_a: false,
            senshu_b: false,
            penalties_a: '',
            penalties_b: '',
            penalties_c1_a: '0',
            penalties_c2_a: '0',
            penalties_c3_a: '0',
            penalties_c1_b: '0',
            penalties_c2_b: '0',
            penalties_c3_b: '0',
            points_aka_history: '',
            points_ao_history: '',
            victory_method: '',
            timer_seconds: 180,
            timer_active: false
          };
          generatedBouts.push(newBout);
          boutNo++;
        }

        let currentRoundBoutsCount = totalRound1Bouts;
        let roundNo = 2;
        
        while (currentRoundBoutsCount > 1) {
          const nextRoundBoutsCount = currentRoundBoutsCount / 2;
          for (let b = 1; b <= nextRoundBoutsCount; b++) {
            const newBout: Bout = {
              id: `bout-${catId}-r${roundNo}-${b}-${Date.now()}`,
              category_id: catId,
              bout_no: b,
              round_no: roundNo,
              participant_a_id: null,
              participant_b_id: null,
              winner_id: null,
              score_a: 0,
              score_b: 0,
              status: 'Scheduled',
              tatami: `Tatami 1`,
              senshu_a: false,
              senshu_b: false,
              penalties_a: '',
              penalties_b: '',
              penalties_c1_a: '0',
              penalties_c2_a: '0',
              penalties_c3_a: '0',
              penalties_c1_b: '0',
              penalties_c2_b: '0',
              penalties_c3_b: '0',
              points_aka_history: '',
              points_ao_history: '',
              victory_method: '',
              timer_seconds: 180,
              timer_active: false
            };
            generatedBouts.push(newBout);
          }
          currentRoundBoutsCount = nextRoundBoutsCount;
          roundNo++;
        }

        if (drawType !== 'wkf_repechage' && hasThirdPlace && count >= 4) {
          const newBout: Bout = {
            id: `bout-${catId}-r3rd-1-${Date.now()}`,
            category_id: catId,
            bout_no: 99,
            round_no: 99,
            participant_a_id: null,
            participant_b_id: null,
            winner_id: null,
            score_a: 0,
            score_b: 0,
            status: 'Scheduled',
            tatami: 'Tatami 1',
            senshu_a: false,
            senshu_b: false,
            penalties_a: '',
            penalties_b: '',
            penalties_c1_a: '0',
            penalties_c2_a: '0',
            penalties_c3_a: '0',
            penalties_c1_b: '0',
            penalties_c2_b: '0',
            penalties_c3_b: '0',
            points_aka_history: '',
            points_ao_history: '',
            victory_method: '',
            timer_seconds: 180,
            timer_active: false
          };
          generatedBouts.push(newBout);
        }
      }

      if (drawType !== 'Round-robin' && drawType !== 'round_robin') {
        const maxRound = Math.max(...generatedBouts.filter(b => b.round_no !== 99 && b.round_no !== 98).map(b => b.round_no), 1);
        let changes = true;
        while (changes) {
          changes = false;
          for (let r = 1; r < maxRound; r++) {
            const currentRoundBouts = generatedBouts.filter(b => b.round_no === r);
            const nextRoundBouts = generatedBouts.filter(b => b.round_no === r + 1);
            
            for (const nb of nextRoundBouts) {
              const feederA = currentRoundBouts.find(cb => cb.bout_no === nb.bout_no * 2 - 1);
              const feederB = currentRoundBouts.find(cb => cb.bout_no === nb.bout_no * 2);
              
              let nextA = nb.participant_a_id;
              let nextB = nb.participant_b_id;
              let nextWinner = nb.winner_id;
              let nextStatus = nb.status;
              
              if (feederA && feederA.winner_id !== nb.participant_a_id) {
                nextA = feederA.winner_id;
              }
              if (feederB && feederB.winner_id !== nb.participant_b_id) {
                nextB = feederB.winner_id;
              }
              
              const feederAResolved = feederA ? (feederA.status === 'Completed' || feederA.status === 'Walkover') : true;
              const feederBResolved = feederB ? (feederB.status === 'Completed' || feederB.status === 'Walkover') : true;
              
              if (feederAResolved && feederBResolved) {
                if (nextA && !nextB) {
                  nextWinner = nextA;
                  nextStatus = 'Walkover';
                } else if (!nextA && nextB) {
                  nextWinner = nextB;
                  nextStatus = 'Walkover';
                } else if (!nextA && !nextB) {
                  nextWinner = null;
                  nextStatus = 'Walkover';
                }
              }
              
              if (nb.participant_a_id !== nextA || nb.participant_b_id !== nextB || nb.winner_id !== nextWinner || nb.status !== nextStatus) {
                nb.participant_a_id = nextA;
                nb.participant_b_id = nextB;
                nb.winner_id = nextWinner;
                nb.status = nextStatus;
                changes = true;
              }
            }
          }
        }
      }

      saveStoreData('ts_bouts', [...allBouts, ...generatedBouts]);
      return generatedBouts;
    },
    updateBoutResult: (boutId: string, winnerId: string, scoreA: number, scoreB: number): Bout => {
      const list = getStoreData<Bout>('ts_bouts', []);
      let idx = list.findIndex(b => b.id === boutId);
      if (idx === -1) {
        const dummy: Bout = {
          id: boutId,
          category_id: '',
          bout_no: 1,
          round_no: 1,
          participant_a_id: null,
          participant_b_id: null,
          score_a: scoreA,
          score_b: scoreB,
          status: 'Completed',
          winner_id: winnerId
        };
        list.push(dummy);
        idx = list.length - 1;
      }

      const bout = list[idx];
      const updatedBout = {
        ...bout,
        winner_id: winnerId,
        score_a: scoreA,
        score_b: scoreB,
        status: 'Completed' as const
      };
      list[idx] = updatedBout;

      if (bout.round_no === 98) {
        const nextBoutNo = bout.bout_no + 1;
        const nextBoutIdx = list.findIndex(b => b.category_id === bout.category_id && b.round_no === 98 && b.bout_no === nextBoutNo);
        if (nextBoutIdx !== -1) {
          list[nextBoutIdx] = { ...list[nextBoutIdx], participant_a_id: winnerId };
        }
      } else if (bout.round_no !== 99 && bout.round_no < 7) {
        const maxRound = Math.max(...list.filter(b => b.category_id === bout.category_id && b.round_no !== 99 && b.round_no !== 98).map(b => b.round_no), 1);
        let changes = true;
        while (changes) {
          changes = false;
          for (let r = 1; r < maxRound; r++) {
            const currentRoundBouts = list.filter(b => b.category_id === bout.category_id && b.round_no === r);
            const nextRoundBouts = list.filter(b => b.category_id === bout.category_id && b.round_no === r + 1);
            
            for (const nb of nextRoundBouts) {
              const feederA = currentRoundBouts.find(cb => cb.bout_no === nb.bout_no * 2 - 1);
              const feederB = currentRoundBouts.find(cb => cb.bout_no === nb.bout_no * 2);
              
              let nextA = nb.participant_a_id;
              let nextB = nb.participant_b_id;
              let nextWinner = nb.winner_id;
              let nextStatus = nb.status;
              
              if (feederA && feederA.winner_id !== nb.participant_a_id) {
                nextA = feederA.winner_id;
              }
              if (feederB && feederB.winner_id !== nb.participant_b_id) {
                nextB = feederB.winner_id;
              }
              
              const feederAResolved = feederA ? (feederA.status === 'Completed' || feederA.status === 'Walkover') : true;
              const feederBResolved = feederB ? (feederB.status === 'Completed' || feederB.status === 'Walkover') : true;
              
              if (feederAResolved && feederBResolved) {
                if (nextA && !nextB) {
                  nextWinner = nextA;
                  nextStatus = 'Walkover';
                } else if (!nextA && nextB) {
                  nextWinner = nextB;
                  nextStatus = 'Walkover';
                } else if (!nextA && !nextB) {
                  nextWinner = null;
                  nextStatus = 'Walkover';
                }
              }
              
              if (nb.participant_a_id !== nextA || nb.participant_b_id !== nextB || nb.winner_id !== nextWinner || nb.status !== nextStatus) {
                nb.participant_a_id = nextA;
                nb.participant_b_id = nextB;
                nb.winner_id = nextWinner;
                nb.status = nextStatus;
                changes = true;
              }
            }
          }
        }
      }

      saveStoreData('ts_bouts', list);

      // Auto-generate WKF repechage if format is 'wkf_repechage' and finalists are set
      try {
        const category = mockStore.categories.list().find(c => c.id === bout.category_id);
        if (category && category.format === 'wkf_repechage') {
          const freshBouts = getStoreData<Bout>('ts_bouts', []);
          const catBouts = freshBouts.filter(b => b.category_id === bout.category_id);
          const maxRound = Math.max(...catBouts.filter(b => b.round_no !== 99 && b.round_no !== 98).map(b => b.round_no), 1);
          const finalBout = catBouts.find(b => b.round_no === maxRound && b.bout_no === 1);
          if (finalBout && finalBout.participant_a_id && finalBout.participant_b_id) {
            const hasRepechage = catBouts.some(b => b.round_no === 98);
            if (!hasRepechage) {
              mockStore.bouts.generateRepechage(bout.category_id);
            }
          }
        }
      } catch (e) {
        console.error('Auto-repechage generation failed:', e);
      }

      return updatedBout;
    },
    updateBoutState: (id: string, updates: Partial<Bout>): Bout => {
      const list = getStoreData<Bout>('ts_bouts', []);
      let idx = list.findIndex(b => b.id === id);
      if (idx === -1) {
        const dummy: Bout = {
          id,
          category_id: updates.category_id || '',
          bout_no: updates.bout_no || 1,
          round_no: updates.round_no || 1,
          participant_a_id: updates.participant_a_id ?? null,
          participant_b_id: updates.participant_b_id ?? null,
          score_a: updates.score_a || 0,
          score_b: updates.score_b || 0,
          status: updates.status || 'Scheduled',
          winner_id: updates.winner_id ?? null,
          ...updates
        };
        list.push(dummy);
        idx = list.length - 1;
      }
      
      const oldBout = list[idx];
      const updated = { ...oldBout, ...updates };
      list[idx] = updated;

      // Advance winner to the next round if bout is completed and has a winner
      if (updated.status === 'Completed' && updated.winner_id) {
        const winnerId = updated.winner_id;
        if (updated.round_no === 98) {
          const nextBoutNo = updated.bout_no + 1;
          const nextBoutIdx = list.findIndex(b => b.category_id === updated.category_id && b.round_no === 98 && b.bout_no === nextBoutNo);
          if (nextBoutIdx !== -1) {
            list[nextBoutIdx] = { ...list[nextBoutIdx], participant_a_id: winnerId };
          }
        } else if (updated.round_no !== 99 && updated.round_no < 7) {
          const nextRoundNo = updated.round_no + 1;
          const nextBoutNo = Math.ceil(updated.bout_no / 2);
          const nextBoutIdx = list.findIndex(b => b.category_id === updated.category_id && b.round_no === nextRoundNo && b.bout_no === nextBoutNo);
          
          if (nextBoutIdx !== -1) {
            const isSlotA = updated.bout_no % 2 !== 0;
            const nextBout = list[nextBoutIdx];
            if (isSlotA) {
              list[nextBoutIdx] = { ...nextBout, participant_a_id: winnerId };
            } else {
              list[nextBoutIdx] = { ...nextBout, participant_b_id: winnerId };
            }
          }
        }
      }

      saveStoreData('ts_bouts', list);

      // Auto-generate WKF repechage if format is 'wkf_repechage' and finalists are set
      try {
        const category = mockStore.categories.list().find(c => c.id === updated.category_id);
        if (category && category.format === 'wkf_repechage') {
          const freshBouts = getStoreData<Bout>('ts_bouts', []);
          const catBouts = freshBouts.filter(b => b.category_id === updated.category_id);
          const maxRound = Math.max(...catBouts.filter(b => b.round_no !== 99 && b.round_no !== 98).map(b => b.round_no), 1);
          const finalBout = catBouts.find(b => b.round_no === maxRound && b.bout_no === 1);
          if (finalBout && finalBout.participant_a_id && finalBout.participant_b_id) {
            const hasRepechage = catBouts.some(b => b.round_no === 98);
            if (!hasRepechage) {
              mockStore.bouts.generateRepechage(updated.category_id);
            }
          }
        }
      } catch (e) {
        console.error('Auto-repechage generation failed:', e);
      }

      return updated;
    },
    resetBoutResult: (boutId: string, matchDuration: number): Bout => {
      const list = getStoreData<Bout>('ts_bouts', []);
      let idx = list.findIndex(b => b.id === boutId);
      if (idx === -1) {
        const dummy: Bout = {
          id: boutId,
          category_id: '',
          bout_no: 1,
          round_no: 1,
          participant_a_id: null,
          participant_b_id: null,
          score_a: 0,
          score_b: 0,
          status: 'Scheduled',
          winner_id: null
        };
        list.push(dummy);
        idx = list.length - 1;
      }

      const bout = list[idx];
      const currentWinnerId = bout.winner_id;
      
      const updatedBout = {
        ...bout,
        winner_id: null,
        score_a: 0,
        score_b: 0,
        senshu_a: false,
        senshu_b: false,
        penalties_a: '',
        penalties_b: '',
        penalties_c1_a: '0',
        penalties_c2_a: '0',
        penalties_c3_a: '0',
        penalties_c1_b: '0',
        penalties_c2_b: '0',
        penalties_c3_b: '0',
        points_aka_history: '',
        points_ao_history: '',
        victory_method: '',
        timer_seconds: matchDuration,
        timer_active: false,
        status: 'Scheduled' as const
      };
      list[idx] = updatedBout;

      if (bout.round_no !== 99 && bout.round_no < 7 && currentWinnerId) {
        const nextRoundNo = bout.round_no + 1;
        const nextBoutNo = Math.ceil(bout.bout_no / 2);
        const nextBoutIdx = list.findIndex(b => b.category_id === bout.category_id && b.round_no === nextRoundNo && b.bout_no === nextBoutNo);
        
        if (nextBoutIdx !== -1) {
          const nextBout = list[nextBoutIdx];
          const isSlotA = bout.bout_no % 2 !== 0;
          const nextWinnerId = isSlotA ? nextBout.participant_a_id : nextBout.participant_b_id;
          if (nextWinnerId === currentWinnerId) {
            if (isSlotA) {
              list[nextBoutIdx] = { ...nextBout, participant_a_id: null };
            } else {
              list[nextBoutIdx] = { ...nextBout, participant_b_id: null };
            }
          }
        }
      }

      saveStoreData('ts_bouts', list);
      return updatedBout;
    },
    generateRepechage: (catId: string): Bout[] => {
      const list = getStoreData<Bout>('ts_bouts', []);
      const categoryBouts = list.filter(b => b.category_id === catId);
      
      const maxRound = Math.max(...categoryBouts.filter(b => b.round_no !== 99 && b.round_no !== 98).map(b => b.round_no), 1);
      const finalBout = categoryBouts.find(b => b.round_no === maxRound && b.bout_no === 1);
      if (!finalBout) throw new Error('Main bracket is not fully generated.');

      const finalistA = finalBout.participant_a_id;
      const finalistB = finalBout.participant_b_id;
      if (!finalistA || !finalistB) {
        throw new Error('Finalists are not fully determined yet. Resolve previous rounds first.');
      }

      // Remove existing repechage bouts for this category
      const filteredList = list.filter(b => !(b.category_id === catId && b.round_no === 98));

      // Trace losers who lost to finalists in completed bouts
      const getLosersForFinalist = (finalistId: string): string[] => {
        const losers: string[] = [];
        for (let r = 1; r < maxRound; r++) {
          const bout = categoryBouts.find(b => 
            b.round_no === r && 
            (b.participant_a_id === finalistId || b.participant_b_id === finalistId)
          );
          if (bout && bout.status === 'Completed' && bout.winner_id === finalistId) {
            const loserId = bout.winner_id === bout.participant_a_id ? bout.participant_b_id : bout.participant_a_id;
            if (loserId) losers.push(loserId);
          }
        }
        return losers;
      };

      const losersA = getLosersForFinalist(finalistA);
      const losersB = getLosersForFinalist(finalistB);

      const newBouts: Bout[] = [];
      
      const buildRepechagePool = (losers: string[], poolChar: 'A' | 'B') => {
        if (losers.length < 2) return;
        let boutIndex = 1;

        // Bout 1: Round 1 loser vs Round 2 loser
        const b1: Bout = {
          id: `bout-${catId}-rep-${poolChar}-${boutIndex}-${Date.now()}`,
          category_id: catId,
          bout_no: poolChar === 'A' ? 10 : 20,
          round_no: 98,
          participant_a_id: losers[0],
          participant_b_id: losers[1],
          winner_id: null,
          score_a: 0,
          score_b: 0,
          status: 'Scheduled',
          tatami: 'Tatami 1',
          senshu_a: false,
          senshu_b: false,
          penalties_a: '',
          penalties_b: '',
          penalties_c1_a: '0',
          penalties_c2_a: '0',
          penalties_c3_a: '0',
          penalties_c1_b: '0',
          penalties_c2_b: '0',
          penalties_c3_b: '0',
          points_aka_history: '',
          points_ao_history: '',
          victory_method: '',
          timer_seconds: 180,
          timer_active: false
        };
        newBouts.push(b1);
        
        // Subsequent bouts
        for (let i = 2; i < losers.length; i++) {
          boutIndex++;
          const bNext: Bout = {
            id: `bout-${catId}-rep-${poolChar}-${boutIndex}-${Date.now()}`,
            category_id: catId,
            bout_no: (poolChar === 'A' ? 10 : 20) + (boutIndex - 1),
            round_no: 98,
            participant_a_id: null,
            participant_b_id: losers[i],
            winner_id: null,
            score_a: 0,
            score_b: 0,
            status: 'Scheduled',
            tatami: 'Tatami 1',
            senshu_a: false,
            senshu_b: false,
            penalties_a: '',
            penalties_b: '',
            penalties_c1_a: '0',
            penalties_c2_a: '0',
            penalties_c3_a: '0',
            penalties_c1_b: '0',
            penalties_c2_b: '0',
            penalties_c3_b: '0',
            points_aka_history: '',
            points_ao_history: '',
            victory_method: '',
            timer_seconds: 180,
            timer_active: false
          };
          newBouts.push(bNext);
        }
      };

      buildRepechagePool(losersA, 'A');
      buildRepechagePool(losersB, 'B');

      saveStoreData('ts_bouts', [...filteredList, ...newBouts]);
      return newBouts;
    }
  },

  // 13. Officials
  officials: {
    list: (): Official[] => {
      return getStoreData<Official>('ts_officials', SEED_OFFICIALS);
    },
    add: (off: Omit<Official, 'id'>): Official => {
      const list = getStoreData<Official>('ts_officials', SEED_OFFICIALS);
      const newOff: Official = {
        ...off,
        id: `off-${Date.now()}`,
        created_at: new Date().toISOString()
      };
      list.push(newOff);
      saveStoreData('ts_officials', list);
      return newOff;
    },
    update: (id: string, updates: Partial<Official>): Official => {
      const list = getStoreData<Official>('ts_officials', SEED_OFFICIALS);
      const idx = list.findIndex(o => o.id === id);
      if (idx === -1) throw new Error('Official not found');
      const updated = { ...list[idx], ...updates };
      list[idx] = updated;
      saveStoreData('ts_officials', list);
      return updated;
    },
    delete: (id: string): void => {
      const list = getStoreData<Official>('ts_officials', SEED_OFFICIALS);
      const filtered = list.filter(o => o.id !== id);
      saveStoreData('ts_officials', filtered);
    }
  },

  // 14. Tournaments
  tournaments: {
    list: (): Tournament[] => {
      return getStoreData<Tournament>('ts_tournaments', SEED_TOURNAMENTS);
    },
    add: (tour: Omit<Tournament, 'id'>): Tournament => {
      const list = getStoreData<Tournament>('ts_tournaments', SEED_TOURNAMENTS);
      const newTour: Tournament = {
        ...tour,
        id: `tournament-${Date.now()}`,
        created_at: new Date().toISOString()
      };
      list.push(newTour);
      saveStoreData('ts_tournaments', list);
      return newTour;
    },
    update: (id: string, updates: Partial<Tournament>): Tournament => {
      const list = getStoreData<Tournament>('ts_tournaments', SEED_TOURNAMENTS);
      const idx = list.findIndex(t => t.id === id);
      if (idx === -1) throw new Error('Tournament not found');
      const updated = { ...list[idx], ...updates };
      list[idx] = updated;
      saveStoreData('ts_tournaments', list);
      return updated;
    },
    delete: (id: string): void => {
      const list = getStoreData<Tournament>('ts_tournaments', SEED_TOURNAMENTS);
      const filtered = list.filter(t => t.id !== id);
      saveStoreData('ts_tournaments', filtered);
    }
  },
  // 15. Display Playlists
  displayPlaylists: {
    list: (): DisplayPlaylist[] => getStoreData('ts_display_playlists', SEED_DISPLAY_PLAYLISTS),
    replaceAll: (playlists: DisplayPlaylist[]): DisplayPlaylist[] => {
      saveStoreData('ts_display_playlists', playlists);
      return playlists;
    },
    add: (playlist: Omit<DisplayPlaylist, 'id'>): DisplayPlaylist => {
      const list = getStoreData('ts_display_playlists', SEED_DISPLAY_PLAYLISTS);
      const newPlaylist: DisplayPlaylist = {
        ...playlist,
        id: `playlist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      list.unshift(newPlaylist);
      saveStoreData('ts_display_playlists', list);
      return newPlaylist;
    },
    upsert: (playlist: DisplayPlaylist): DisplayPlaylist => {
      const list = getStoreData('ts_display_playlists', SEED_DISPLAY_PLAYLISTS);
      const idx = list.findIndex(p => p.id === playlist.id);
      if (idx === -1) {
        list.unshift(playlist);
      } else {
        list[idx] = playlist;
      }
      saveStoreData('ts_display_playlists', list);
      return playlist;
    },
    update: (id: string, updates: Partial<DisplayPlaylist>): DisplayPlaylist => {
      const list = getStoreData('ts_display_playlists', SEED_DISPLAY_PLAYLISTS);
      const idx = list.findIndex(p => p.id === id);
      if (idx === -1) throw new Error('DisplayPlaylist not found');
      const updated = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
      list[idx] = updated;
      saveStoreData('ts_display_playlists', list);
      return updated;
    },
    delete: (id: string): void => {
      const list = getStoreData('ts_display_playlists', SEED_DISPLAY_PLAYLISTS);
      const filtered = list.filter(p => p.id !== id);
      saveStoreData('ts_display_playlists', filtered);
    }
  },

  // Helper utility functions
  helpers: {
    calculateAge: (dobString: string): number => {
      const dob = new Date(dobString);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      return age;
    }
  }
};

const SEED_TOURNAMENTS: Tournament[] = [
  {
    id: 'ksg-open-2026',
    name: 'Kelab Senshi Goju-Ryu Open Karate Championship 2026',
    organizer: 'Kelab Senshi Goju-Ryu Karate-Do',
    date: '15–16 August 2026',
    date_iso: '2026-08-15T08:00:00Z',
    venue: 'Dewan Serbaguna Petaling Jaya',
    city: 'Petaling Jaya, Selangor',
    registration_close: '31 July 2026',
    registration_close_iso: '2026-07-31T23:59:59Z',
    status: 'Open',
    banner_gradient: 'linear-gradient(135deg, #0b0f19 0%, #1a1035 40%, #2d1a00 100%)',
    featured: true,
    discipline: 'Kata, Kumite',
    medals_gold: 0,
    medals_silver: 0,
    medals_bronze: 0,
    total_participants: 0,
    total_clubs: 0,
    poster_emoji: '🏆',
    pdf_url: '#'
  },
  {
    id: 'itosu-ryu-open-2026',
    name: 'ITOSU-RYU OPEN KARATE CHAMPIONSHIP 2026',
    organizer: 'Itosu-Ryu Malaysia',
    date: '11–12 June 2026',
    date_iso: '2026-06-11T08:00:00Z',
    venue: 'Pusat Komersial Anggun City, Rawang',
    city: 'Rawang, Selangor',
    registration_close: '31 May 2026',
    registration_close_iso: '2026-05-31T23:59:59Z',
    status: 'Completed',
    banner_gradient: 'linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 50%, #3b82f6 100%)',
    featured: false,
    discipline: 'Kata, Kumite',
    medals_gold: 88,
    medals_silver: 88,
    medals_bronze: 149,
    total_participants: 481,
    total_clubs: 75,
    poster_emoji: '🥇',
    pdf_url: '#'
  }
];
