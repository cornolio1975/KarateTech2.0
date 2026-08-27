-- SUPABASE POSTGRESQL SCHEMA FOR TOURNAMENT PARTICIPANT MANAGEMENT
-- Module: Participant Management (KumiteTechnology Style)

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COUNTRIES TABLE
CREATE TABLE IF NOT EXISTS countries (
    code VARCHAR(3) PRIMARY KEY, -- ISO 3166-1 alpha-2 or alpha-3 (e.g. 'MAS', 'USA', 'SGP')
    name VARCHAR(100) NOT NULL,
    flag_emoji VARCHAR(10)
);

-- 2. CLUBS TABLE
CREATE TABLE IF NOT EXISTS clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) UNIQUE NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. COACHES TABLE
CREATE TABLE IF NOT EXISTS coaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(30),
    club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) UNIQUE NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female', 'Mixed')),
    min_age INT NOT NULL,
    max_age INT NOT NULL,
    min_weight DECIMAL(5, 2) NOT NULL,
    max_weight DECIMAL(5, 2) NOT NULL,
    capacity INT DEFAULT 32,
    status VARCHAR(20) DEFAULT 'Open' CHECK (status IN ('Open', 'Closed', 'Full')),
    format VARCHAR(20) DEFAULT 'knockout' CHECK (format IN ('knockout', 'round_robin', 'wkf_repechage')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TEAMS TABLE
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) UNIQUE NOT NULL,
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
    score INT DEFAULT 0,
    ranking INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_no VARCHAR(50) UNIQUE NOT NULL,
    photo_url VARCHAR(500),
    full_name VARCHAR(200) NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female')),
    dob DATE NOT NULL,
    nationality_code VARCHAR(3) REFERENCES countries(code) ON DELETE SET NULL,
    passport_ic VARCHAR(50) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(30),
    emergency_contact_name VARCHAR(150),
    emergency_contact_phone VARCHAR(30),
    club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
    coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
    weight DECIMAL(5, 2) NOT NULL, -- in kg
    height DECIMAL(5, 2) NOT NULL, -- in cm
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Confirmed', 'Pending', 'Checked In', 'Disqualified', 'Cancelled')),
    medical_status VARCHAR(20) DEFAULT 'Review Needed' CHECK (medical_status IN ('Cleared', 'Review Needed', 'Action Required')),
    payment_status VARCHAR(20) DEFAULT 'Unpaid' CHECK (payment_status IN ('Paid', 'Unpaid', 'Pending')),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- For soft delete
);

-- UPDATE TEAMS TO DEFINE CAPTAIN REFERENCE
ALTER TABLE teams ADD COLUMN IF NOT EXISTS captain_id UUID REFERENCES participants(id) ON DELETE SET NULL;

-- 7. TEAM MEMBERS (ManyToMany with validation placeholder)
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (team_id, participant_id)
);

-- 8. PARTICIPANT CATEGORIES (ManyToMany linking participant to category)
CREATE TABLE IF NOT EXISTS participant_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    manual_override BOOLEAN DEFAULT FALSE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (participant_id, category_id)
);

-- 9. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Paid', 'Unpaid', 'Refunded', 'Pending')),
    payment_method VARCHAR(50), -- Credit Card, Cash, Bank Transfer, PayPal
    transaction_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. MEDICAL RECORDS
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE UNIQUE,
    conditions TEXT, -- Medical conditions (e.g. Asthma, none)
    allergies TEXT,
    blood_type VARCHAR(5),
    has_clearance BOOLEAN DEFAULT TRUE,
    remarks TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. DOCUMENTS
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL, -- e.g. "Passport Scan", "Waiver Form"
    doc_type VARCHAR(50) NOT NULL, -- e.g. "Identity", "Medical", "Waiver"
    file_url VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. ACTIVITY LOGS (Participant Specific History)
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
    operator_name VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. AUDIT LOGS (General Table Audit)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Admin / User ID
    user_email VARCHAR(150),
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. BOUTS TABLE (For Tournament Brackets & Draws)
CREATE TABLE IF NOT EXISTS bouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    bout_no INT NOT NULL,
    round_no INT NOT NULL, -- 1 = R32, 2 = R16, 3 = QF, 4 = SF, 5 = F
    participant_a_id UUID REFERENCES participants(id) ON DELETE SET NULL,
    participant_b_id UUID REFERENCES participants(id) ON DELETE SET NULL,
    winner_id UUID REFERENCES participants(id) ON DELETE SET NULL,
    score_a INT DEFAULT 0,
    score_b INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Running', 'Completed', 'Walkover')),
    scheduled_time TIMESTAMPTZ,
    tatami VARCHAR(10),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    senshu_a BOOLEAN DEFAULT FALSE,
    senshu_b BOOLEAN DEFAULT FALSE,
    penalties_a TEXT DEFAULT '',
    penalties_b TEXT DEFAULT '',
    timer_seconds INT DEFAULT 180,
    timer_active BOOLEAN DEFAULT FALSE,
    vr_file_url TEXT,
    vr_metadata JSONB DEFAULT '{}'::jsonb,
    vr_recorded_at TIMESTAMPTZ,
    vr_duration_seconds INT DEFAULT 0,
    vr_camera_label TEXT
);

-- Seed Initial Data with Static UUIDs for references
-- 1. Countries
INSERT INTO countries (code, name, flag_emoji) VALUES
('MAS', 'Malaysia', '🇲🇾'),
('SGP', 'Singapore', '🇸🇬'),
('THA', 'Thailand', '🇹🇭'),
('INA', 'Indonesia', '🇮🇩'),
('JPN', 'Japan', '🇯🇵'),
('BRU', 'Brunei', '🇧🇳'),
('VIE', 'Vietnam', '🇻🇳'),
('PHI', 'Philippines', '🇵🇭')
ON CONFLICT (code) DO NOTHING;

-- 2. Clubs
INSERT INTO clubs (id, name, city, state) VALUES
('9a5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Senshi Karate Academy', 'Kuala Lumpur', 'W.P. Kuala Lumpur'),
('8b5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Goju-Ryu Karate Club', 'Petaling Jaya', 'Selangor'),
('7b5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Tiger Claw Dojo', 'Penang', 'Penang'),
('6b5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Budokan Singapore', 'Singapore', 'Central'),
('5b5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Kyokushin Jakarta', 'Jakarta', 'DKI Jakarta')
ON CONFLICT (id) DO NOTHING;

-- 3. Coaches
INSERT INTO coaches (id, name, email, phone, club_id) VALUES
('1c5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Sensei Haris', 'haris@senshikarate.com', '+6012-3456789', '9a5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f'),
('2c5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Sensei Tan', 'tan@gojuryu.com', '+6013-9876543', '8b5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f'),
('3c5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Coach Somchai', 'somchai@tigerclaw.com', '+66-81-234-5678', '7b5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f')
ON CONFLICT (id) DO NOTHING;

-- 4. Categories
INSERT INTO categories (id, name, gender, min_age, max_age, min_weight, max_weight, capacity, status) VALUES
('e15e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Male Kumite -60kg (18+)', 'Male', 18, 99, 0.00, 60.00, 32, 'Open'),
('e25e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Male Kumite -67kg (18+)', 'Male', 18, 99, 60.01, 67.00, 32, 'Open'),
('e35e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Male Kumite -75kg (18+)', 'Male', 18, 99, 67.01, 75.00, 32, 'Open'),
('e45e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Male Kumite +75kg (18+)', 'Male', 18, 99, 75.01, 999.00, 32, 'Open'),
('e55e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Female Kumite -50kg (18+)', 'Female', 18, 99, 0.00, 50.00, 16, 'Open'),
('e65e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Female Kumite -55kg (18+)', 'Female', 18, 99, 50.01, 55.00, 16, 'Open'),
('e75e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Female Kumite +55kg (18+)', 'Female', 18, 99, 55.01, 999.00, 16, 'Open'),
('e85e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Male Kata (18+)', 'Male', 18, 99, 0.00, 999.00, 32, 'Open'),
('e95e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Female Kata (18+)', 'Female', 18, 99, 0.00, 999.00, 32, 'Open'),
('ea5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Junior Male Kumite -55kg (16-17)', 'Male', 16, 17, 0.00, 55.00, 16, 'Open'),
('eb5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Junior Male Kumite -61kg (16-17)', 'Male', 16, 17, 55.01, 61.00, 16, 'Open'),
('ec5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Junior Female Kumite -48kg (16-17)', 'Female', 16, 17, 0.00, 48.00, 16, 'Open')
ON CONFLICT (id) DO NOTHING;

-- 5. Participants
INSERT INTO participants (id, registration_no, photo_url, full_name, gender, dob, nationality_code, passport_ic, email, phone, emergency_contact_name, emergency_contact_phone, club_id, coach_id, weight, height, status, medical_status, payment_status, remarks, created_at) VALUES
('d15e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'REG-2026-001', '', 'Ahmad Daniel', 'Male', '2005-04-12', 'MAS', '050412-14-1235', 'daniel@example.com', '+6017-1234567', 'Fatimah Ali', '+6017-9999999', '9a5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', '1c5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 64.5, 172.0, 'Confirmed', 'Cleared', 'Paid', 'Pre-selected for national selections', NOW() - INTERVAL '14 days'),
('d25e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'REG-2026-002', '', 'Chloe Tan', 'Female', '2004-09-22', 'MAS', '040922-10-8888', 'chloe@example.com', '+6012-9876543', 'Tan Kok Wai', '+6012-1112222', '8b5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', '2c5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 52.0, 161.0, 'Confirmed', 'Cleared', 'Paid', 'None', NOW() - INTERVAL '13 days'),
('d35e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'REG-2026-003', '', 'Subramaniam Krishnan', 'Male', '2000-01-15', 'MAS', '000115-08-5431', 'subra@example.com', '+6011-2223334', 'Krishnan Murugan', '+6011-8889999', '9a5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', '1c5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 78.2, 178.0, 'Checked In', 'Cleared', 'Paid', 'Ready for draw', NOW() - INTERVAL '11 days'),
('d45e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'REG-2026-004', '', 'Muhammad Ryan', 'Male', '2009-08-30', 'MAS', '090830-14-1111', 'ryan@example.com', '+6019-3334445', 'Rohana Ahmad', '+6019-2222111', '7b5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', '3c5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 58.5, 168.0, 'Pending', 'Review Needed', 'Pending', 'Requires guardian waiver sign-off', NOW() - INTERVAL '9 days'),
('d55e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'REG-2026-005', '', 'Kenji Sato', 'Male', '1998-11-05', 'JPN', 'TK1234567', 'kenji@example.jp', '+81-90-1234-5678', 'Yoko Sato', '+81-90-8765-4321', '5b5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', NULL, 72.0, 175.0, 'Confirmed', 'Cleared', 'Paid', 'International entry', NOW() - INTERVAL '7 days'),
('d65e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'REG-2026-006', '', 'Anisha Putri', 'Female', '2002-05-18', 'INA', 'B9876543', 'anisha@example.id', '+62-812-345-678', 'Budi Putri', '+62-812-999-888', '5b5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', NULL, 48.5, 158.0, 'Pending', 'Action Required', 'Unpaid', 'ECG certificate needed', NOW() - INTERVAL '4 days'),
('d75e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'REG-2026-007', '', 'Ethan Lim', 'Male', '2005-12-01', 'SGP', 'T0599999A', 'ethan@example.sg', '+65-9876-5432', 'Lim Guan Eng', '+65-8123-4567', '6b5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', NULL, 66.8, 170.0, 'Checked In', 'Cleared', 'Paid', 'No accommodations requested', NOW() - INTERVAL '3 days'),
('d85e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'REG-2026-008', '', 'Somporn Yodrak', 'Male', '1995-07-14', 'THA', 'AA112233', 'somporn@example.th', '+66-89-999-8888', 'Yodrak Sen', '+66-89-111-2222', '7b5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', '3c5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 84.0, 182.0, 'Disqualified', 'Cleared', 'Paid', 'Missed official weigh-in limits initially, re-registered', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- 6. Participant Categories Mappings
INSERT INTO participant_categories (participant_id, category_id, manual_override) VALUES
('d15e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'e25e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', FALSE),
('d25e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'e65e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', FALSE),
('d35e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'e45e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', FALSE),
('d45e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'eb5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', FALSE),
('d55e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'e35e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', FALSE),
('d65e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'e55e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', FALSE),
('d75e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'e25e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', FALSE),
('d85e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'e45e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', FALSE)
ON CONFLICT (participant_id, category_id) DO NOTHING;

-- 7. Medical Records
INSERT INTO medical_records (participant_id, conditions, allergies, blood_type, has_clearance, remarks) VALUES
('d15e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'None', 'Peanuts', 'O+', TRUE, 'Cleared for high impact'),
('d25e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Mild Asthma', 'Dust', 'A+', TRUE, 'Uses inhaler when needed'),
('d35e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'None', 'Penicillin', 'B-', TRUE, 'Excellent physical conditioning'),
('d45e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'None', 'None', 'O-', FALSE, 'Guardian consent signature pending'),
('d55e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'None', 'None', 'AB+', TRUE, 'Full clearance submitted'),
('d65e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Heart Murmur history', 'None', 'A-', FALSE, 'Needs doctor review letter'),
('d75e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'None', 'None', 'AB-', TRUE, 'No accommodations requested'),
('d85e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'None', 'None', 'O+', TRUE, 'Official check-in complete')
ON CONFLICT (participant_id) DO NOTHING;

-- 8. Payments
INSERT INTO payments (participant_id, amount, status, payment_method, transaction_id) VALUES
('d15e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 150.00, 'Paid', 'Credit Card', 'TXN-9871625'),
('d25e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 150.00, 'Paid', 'Bank Transfer', 'TXN-1284729'),
('d35e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 150.00, 'Paid', 'Cash', 'TXN-LOCAL-CASH'),
('d55e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 200.00, 'Paid', 'PayPal', 'TXN-9988221'),
('d75e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 200.00, 'Paid', 'Credit Card', 'TXN-8877112'),
('d85e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 150.00, 'Paid', 'Cash', 'TXN-LOCAL-CASH2')
ON CONFLICT (participant_id) DO NOTHING;

-- 9. Teams
INSERT INTO teams (id, name, club_id, coach_id, captain_id, score, ranking) VALUES
('aa5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Senshi Warriors', '9a5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', '1c5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'd15e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 120, 1),
('bb5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'PJ Tigers', '8b5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', '2c5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'd25e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 90, 2)
ON CONFLICT (id) DO NOTHING;

-- 10. Team Members
INSERT INTO team_members (team_id, participant_id) VALUES
('aa5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'd15e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f'),
('aa5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'd35e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f'),
('bb5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'd25e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f')
ON CONFLICT (team_id, participant_id) DO NOTHING;

-- 15. OFFICIALS TABLE
CREATE TABLE IF NOT EXISTS officials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Referee', 'Judge', 'Table Official', 'Tatami Manager', 'Coach')),
    qualification VARCHAR(150) NOT NULL,
    assigned_tatami VARCHAR(20),
    email VARCHAR(150),
    phone VARCHAR(30),
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Officials
INSERT INTO officials (id, name, role, qualification, assigned_tatami, email, phone, status) VALUES
('f15e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Sensei Haris Ahmad', 'Referee', 'WKF Referee A', 'Tatami 1', 'haris@senshikarate.com', '+6012-3456789', 'Active'),
('f25e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Sensei Chloe Tan', 'Tatami Manager', 'National Referee A', 'Tatami 2', 'chloe@senshikarate.com', '+6013-9876543', 'Active'),
('f35e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Judith Lim', 'Judge', 'State Judge B', 'Tatami 1', 'judith@gmail.com', '+6017-1234567', 'Active'),
('f45e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Tan Wei Jin', 'Table Official', 'Scorekeeper Cert', 'Tatami 1', 'weijin@gmail.com', '+6016-5551234', 'Active'),
('f55e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Sensei Somporn', 'Referee', 'National Judge A', 'Tatami 3', 'somporn@karate.or.th', '+662-1112222', 'Active'),
('f65e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Ahmad Syafiq', 'Judge', 'State Referee C', 'Tatami 2', 'syafiq@yahoo.com', '+6018-4443333', 'Active')
ON CONFLICT (id) DO NOTHING;

-- Disable Row Level Security (RLS) on all tables to allow client writes via the Anon key
ALTER TABLE countries DISABLE ROW LEVEL SECURITY;
ALTER TABLE clubs DISABLE ROW LEVEL SECURITY;
ALTER TABLE coaches DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE participant_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE bouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE officials DISABLE ROW LEVEL SECURITY;

-- 14. TOURNAMENTS TABLE
CREATE TABLE IF NOT EXISTS tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    organizer VARCHAR(150) NOT NULL,
    date VARCHAR(100) NOT NULL,
    date_iso TIMESTAMPTZ NOT NULL,
    venue VARCHAR(255) NOT NULL,
    city VARCHAR(150) NOT NULL,
    registration_close VARCHAR(100) NOT NULL,
    registration_close_iso TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'Open',
    banner_gradient VARCHAR(255),
    featured BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    discipline VARCHAR(255) DEFAULT 'Kata, Kumite',
    medals_gold INT DEFAULT 0,
    medals_silver INT DEFAULT 0,
    medals_bronze INT DEFAULT 0,
    total_participants INT DEFAULT 0,
    total_clubs INT DEFAULT 0,
    poster_emoji VARCHAR(50) DEFAULT '🏆',
    pdf_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tournaments DISABLE ROW LEVEL SECURITY;

-- Seed Initial Tournaments
INSERT INTO tournaments (id, name, organizer, date, date_iso, venue, city, registration_close, registration_close_iso, status, banner_gradient, featured, discipline, medals_gold, medals_silver, medals_bronze, total_participants, total_clubs, poster_emoji, pdf_url) VALUES
('aa5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Kelab Senshi Goju-Ryu Open Karate Championship 2026', 'Kelab Senshi Goju-Ryu Karate-Do', '15–16 August 2026', '2026-08-15T08:00:00Z', 'Dewan Serbaguna Petaling PJ', 'Petaling Jaya, Selangor', '31 July 2026', '2026-07-31T23:59:59Z', 'Open', 'linear-gradient(135deg, #0b0f19 0%, #1a1035 40%, #2d1a00 100%)', TRUE, 'Kata, Kumite', 0, 0, 0, 0, 0, '🏆', '#'),
('bb5e8b4e-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'ITOSU-RYU OPEN KARATE CHAMPIONSHIP 2026', 'Itosu-Ryu Malaysia', '11–12 June 2026', '2026-06-11T08:00:00Z', 'Pusat Komersial Anggun City, Rawang', 'Rawang, Selangor', '31 May 2026', '2026-05-31T23:59:59Z', 'Completed', 'linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 50%, #3b82f6 100%)', FALSE, 'Kata, Kumite', 88, 88, 149, 481, 75, '🥇', '#')
ON CONFLICT (id) DO NOTHING;

-- Force PostgREST schema cache to reload
NOTIFY pgrst, 'reload schema';

