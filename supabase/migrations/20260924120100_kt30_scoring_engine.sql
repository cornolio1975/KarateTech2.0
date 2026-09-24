-- KarateTech 3.0 — Phase 6: Central Scoring Engine Tables
-- Event-sourcing tables for judge signals, referee decisions, official scoring events.
-- These SUPPLEMENT the existing `bouts` table — they do NOT replace it.
-- Existing score_a/score_b fields in bouts are preserved as the authoritative final score.

-- ── Scoring Sessions ──────────────────────────────────────────────────────────
-- One session per bout attempt. Tracks the lifecycle of a live bout.
CREATE TABLE IF NOT EXISTS karate_scoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL,
  bout_id TEXT NOT NULL,
  category_id TEXT,
  tatami_id TEXT,
  tatami_label TEXT,
  round_no INTEGER,
  bout_no INTEGER,
  session_state VARCHAR(30) DEFAULT 'pending'
    CHECK (session_state IN ('pending','active','paused','completed','voided')),
  opened_by TEXT,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  total_duration_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kss_bout ON karate_scoring_sessions(bout_id);
CREATE INDEX IF NOT EXISTS idx_kss_tournament ON karate_scoring_sessions(tournament_id);
CREATE INDEX IF NOT EXISTS idx_kss_tatami ON karate_scoring_sessions(tatami_id);

-- ── Judge Signal Events ───────────────────────────────────────────────────────
-- Raw, IMMUTABLE clicks from judge clickers. Never modified after insert.
CREATE TABLE IF NOT EXISTS karate_judge_signal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES karate_scoring_sessions(id),
  tournament_id TEXT NOT NULL,
  bout_id TEXT NOT NULL,
  tatami_id TEXT,
  judge_id TEXT NOT NULL,        -- e.g. 'J1','J2','J3','J4'
  judge_device_id TEXT,
  side VARCHAR(3) NOT NULL CHECK (side IN ('AKA','AO')),
  score_type VARCHAR(20) NOT NULL CHECK (score_type IN ('YUKO','WAZA-ARI','IPPON','PENALTY_C1','PENALTY_C2','PENALTY_C3','UNDO','NO_SCORE')),
  score_value INTEGER DEFAULT 0,
  signal_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  sequence_no BIGINT,
  is_voided BOOLEAN DEFAULT FALSE,
  void_reason TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_kjse_session ON karate_judge_signal_events(session_id);
CREATE INDEX IF NOT EXISTS idx_kjse_bout ON karate_judge_signal_events(bout_id);
CREATE INDEX IF NOT EXISTS idx_kjse_tournament ON karate_judge_signal_events(tournament_id);

COMMENT ON TABLE karate_judge_signal_events IS
  'KT3.0 Phase 6 — Immutable raw judge click signals. Input to majority engine.';

-- ── Referee Decisions ─────────────────────────────────────────────────────────
-- Official decisions made by the referee, optionally triggered by majority engine output.
CREATE TABLE IF NOT EXISTS karate_referee_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES karate_scoring_sessions(id),
  tournament_id TEXT NOT NULL,
  bout_id TEXT NOT NULL,
  tatami_id TEXT,
  referee_id TEXT,
  decision_type VARCHAR(20) NOT NULL
    CHECK (decision_type IN ('AWARD_SCORE','NO_SCORE','REQUEST_VIDEO_REVIEW','PENALTY','SENSHU','MATCH_END','OVERRIDE')),
  side VARCHAR(3) CHECK (side IN ('AKA','AO')),
  score_type VARCHAR(20),
  score_value INTEGER DEFAULT 0,
  majority_result JSONB,          -- snapshot of majority engine output at decision time
  decided_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  sequence_no BIGINT,
  notes TEXT,
  is_reversed BOOLEAN DEFAULT FALSE,
  reversed_by TEXT,
  reversed_at TIMESTAMPTZ,
  reversal_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_krd_session ON karate_referee_decisions(session_id);
CREATE INDEX IF NOT EXISTS idx_krd_bout ON karate_referee_decisions(bout_id);

COMMENT ON TABLE karate_referee_decisions IS
  'KT3.0 Phase 6 — Official referee decisions that produce scoring events.';

-- ── Official Scoring Events ───────────────────────────────────────────────────
-- The authoritative event stream for a bout. Derived from referee decisions.
-- This is what the display, animation engine, and supervisor subscribe to.
CREATE TABLE IF NOT EXISTS karate_scoring_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES karate_scoring_sessions(id),
  decision_id UUID REFERENCES karate_referee_decisions(id),
  tournament_id TEXT NOT NULL,
  bout_id TEXT NOT NULL,
  tatami_id TEXT,
  event_type VARCHAR(30) NOT NULL
    CHECK (event_type IN ('SCORE','PENALTY','SENSHU','VIDEO_REVIEW_REQUEST','VIDEO_REVIEW_RESULT','TIMER_START','TIMER_STOP','MATCH_END','CORRECTION','VOID')),
  side VARCHAR(3) CHECK (side IN ('AKA','AO')),
  score_type VARCHAR(20),
  score_value INTEGER DEFAULT 0,
  cumulative_score_aka INTEGER DEFAULT 0,
  cumulative_score_ao INTEGER DEFAULT 0,
  event_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  sequence_no BIGINT,
  is_correction BOOLEAN DEFAULT FALSE,
  correction_reason TEXT,
  corrected_by TEXT,
  is_voided BOOLEAN DEFAULT FALSE,
  void_reason TEXT,
  display_payload JSONB,
  animation_trigger TEXT
);

CREATE INDEX IF NOT EXISTS idx_kse_session ON karate_scoring_events(session_id);
CREATE INDEX IF NOT EXISTS idx_kse_bout ON karate_scoring_events(bout_id);
CREATE INDEX IF NOT EXISTS idx_kse_tournament ON karate_scoring_events(tournament_id);
CREATE INDEX IF NOT EXISTS idx_kse_tatami ON karate_scoring_events(tatami_id);
CREATE INDEX IF NOT EXISTS idx_kse_event_at ON karate_scoring_events(event_at);

COMMENT ON TABLE karate_scoring_events IS
  'KT3.0 Phase 6 — Official scoring event stream. Source of truth for display and animation.';

-- ── Timer Events ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS karate_timer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES karate_scoring_sessions(id),
  tournament_id TEXT NOT NULL,
  bout_id TEXT NOT NULL,
  tatami_id TEXT,
  event_type VARCHAR(20) NOT NULL
    CHECK (event_type IN ('START','STOP','PAUSE','RESUME','TIME_UP','SET','RESET')),
  timer_value_seconds INTEGER,
  remaining_seconds INTEGER,
  operated_by TEXT,
  event_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kte_session ON karate_timer_events(session_id);
CREATE INDEX IF NOT EXISTS idx_kte_bout ON karate_timer_events(bout_id);

COMMENT ON TABLE karate_timer_events IS 'KT3.0 Phase 6 — Timer state events for bout timekeeper.';

-- ── Video Review Events ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS karate_video_review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES karate_scoring_sessions(id),
  tournament_id TEXT NOT NULL,
  bout_id TEXT NOT NULL,
  tatami_id TEXT,
  event_type VARCHAR(20) NOT NULL
    CHECK (event_type IN ('REQUEST','REVIEW_START','DECISION_UPHELD','DECISION_REVERSED','CANCELLED')),
  requested_by TEXT,
  requested_side VARCHAR(3) CHECK (requested_side IN ('AKA','AO')),
  original_decision_id UUID,
  vr_file_url TEXT,
  reviewer_notes TEXT,
  event_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  decision_at TIMESTAMPTZ,
  decided_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_kvre_bout ON karate_video_review_events(bout_id);
CREATE INDEX IF NOT EXISTS idx_kvre_session ON karate_video_review_events(session_id);

COMMENT ON TABLE karate_video_review_events IS 'KT3.0 Phase 6 — Video review request and decision events.';

-- ── Audit Events ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS karate_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT,
  actor_email TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kae_tournament ON karate_audit_events(tournament_id);
CREATE INDEX IF NOT EXISTS idx_kae_actor ON karate_audit_events(actor_email);
CREATE INDEX IF NOT EXISTS idx_kae_created ON karate_audit_events(created_at);

COMMENT ON TABLE karate_audit_events IS 'KT3.0 Phase 6 — Immutable audit trail for all administrative actions.';

-- ── Clicker Tables ────────────────────────────────────────────────────────────
-- Phase 9: Judge clicker devices and sessions
CREATE TABLE IF NOT EXISTS karate_clicker_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  device_identifier TEXT UNIQUE,
  judge_position TEXT CHECK (judge_position IN ('J1','J2','J3','J4','CENTER')),
  tatami_id TEXT,
  status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online','offline','error')),
  last_seen TIMESTAMPTZ,
  registered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS karate_clicker_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scoring_session_id UUID REFERENCES karate_scoring_sessions(id),
  device_id UUID REFERENCES karate_clicker_devices(id),
  judge_position TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  total_signals INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS karate_judge_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL,
  tatami_id TEXT NOT NULL,
  judge_position TEXT NOT NULL CHECK (judge_position IN ('J1','J2','J3','J4','CENTER')),
  official_id TEXT,
  official_name TEXT,
  device_id UUID REFERENCES karate_clicker_devices(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active'
);

-- ── Snapshot Tables ───────────────────────────────────────────────────────────
-- Phase 15: Recovery snapshots
CREATE TABLE IF NOT EXISTS karate_bout_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL,
  bout_id TEXT NOT NULL,
  category_id TEXT,
  snapshot_data JSONB NOT NULL,
  snapshot_reason TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  checksum TEXT
);

CREATE TABLE IF NOT EXISTS karate_flush_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('category','bracket','bout','all')),
  entity_id TEXT,
  entity_name TEXT,
  snapshot_id UUID,
  flushed_by TEXT,
  flush_reason TEXT NOT NULL,
  records_deleted INTEGER DEFAULT 0,
  rollback_available BOOLEAN DEFAULT TRUE,
  flushed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Animation Map ─────────────────────────────────────────────────────────────
-- Phase 14: Animation asset mapping
CREATE TABLE IF NOT EXISTS karate_scoring_animation_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_type TEXT NOT NULL,
  side TEXT,
  animation_key TEXT NOT NULL,
  asset_url TEXT,
  duration_ms INTEGER DEFAULT 2000,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default animation entries
INSERT INTO karate_scoring_animation_map (score_type, side, animation_key, duration_ms)
VALUES
  ('YUKO',     'AKA', 'yuko_aka',     1500),
  ('YUKO',     'AO',  'yuko_ao',      1500),
  ('WAZA-ARI', 'AKA', 'wazaari_aka',  2000),
  ('WAZA-ARI', 'AO',  'wazaari_ao',   2000),
  ('IPPON',    'AKA', 'ippon_aka',    3000),
  ('IPPON',    'AO',  'ippon_ao',     3000)
ON CONFLICT DO NOTHING;
