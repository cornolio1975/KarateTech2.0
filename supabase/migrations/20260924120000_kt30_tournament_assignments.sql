-- KarateTech 3.0 — Phase 4: Tournament Assignment Table
-- Enables Superadmin to explicitly assign tournaments to Admin and Club Manager roles.
-- Does NOT alter any existing tables.

CREATE TABLE IF NOT EXISTS karate_tournament_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_email TEXT,
  role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Co-Admin', 'Club', 'Viewer')),
  permission_scope VARCHAR(50) DEFAULT 'full' CHECK (permission_scope IN ('full', 'read-only', 'scoring-only')),
  assigned_by TEXT,
  assigned_by_email TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast per-tournament lookups
CREATE INDEX IF NOT EXISTS idx_kt_tournament_assignments_tournament
  ON karate_tournament_assignments(tournament_id);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_kt_tournament_assignments_user
  ON karate_tournament_assignments(user_id);

-- Index for active assignments
CREATE INDEX IF NOT EXISTS idx_kt_tournament_assignments_status
  ON karate_tournament_assignments(status);

COMMENT ON TABLE karate_tournament_assignments IS
  'KT3.0 Phase 4 — Superadmin-managed tournament access assignments.';
