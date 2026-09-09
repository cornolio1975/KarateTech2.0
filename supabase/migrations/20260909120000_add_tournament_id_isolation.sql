-- Tournament data isolation: add tournament_id to every tournament-dependent table.
--
-- SAFETY NOTES (read before running):
--   * This migration is additive and idempotent. It does NOT drop or delete data.
--   * Columns are added as NULLABLE and backfilled. NOT NULL is deliberately left
--     to a follow-up migration so existing rows can be verified first.
--   * Take a database backup before running (see PART 38 of the spec).

-- ---------------------------------------------------------------------------
-- 1. Add tournament_id columns
-- ---------------------------------------------------------------------------
ALTER TABLE categories             ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE;
ALTER TABLE participants           ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE;
ALTER TABLE participant_categories ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE;
ALTER TABLE bouts                  ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE;
ALTER TABLE teams                  ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE;
ALTER TABLE team_members           ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE;
ALTER TABLE payments               ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE;
ALTER TABLE medical_records        ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE;
ALTER TABLE documents              ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE;
ALTER TABLE activity_logs          ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE;
ALTER TABLE audit_logs             ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE;
ALTER TABLE officials              ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 2. Backfill existing rows
--
-- Legacy rows predate multi-tournament support. They are assigned to the oldest
-- non-deleted tournament, and ONLY when exactly one candidate exists. If the
-- database already holds several tournaments the backfill is skipped, because
-- guessing an owner could silently merge two events.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    target_tournament UUID;
    tournament_count  INT;
BEGIN
    SELECT COUNT(*) INTO tournament_count FROM tournaments WHERE deleted_at IS NULL;

    IF tournament_count = 1 THEN
        SELECT id INTO target_tournament FROM tournaments WHERE deleted_at IS NULL;

        UPDATE categories             SET tournament_id = target_tournament WHERE tournament_id IS NULL;
        UPDATE participants           SET tournament_id = target_tournament WHERE tournament_id IS NULL;
        UPDATE participant_categories SET tournament_id = target_tournament WHERE tournament_id IS NULL;
        UPDATE bouts                  SET tournament_id = target_tournament WHERE tournament_id IS NULL;
        UPDATE teams                  SET tournament_id = target_tournament WHERE tournament_id IS NULL;
        UPDATE team_members           SET tournament_id = target_tournament WHERE tournament_id IS NULL;
        UPDATE payments               SET tournament_id = target_tournament WHERE tournament_id IS NULL;
        UPDATE medical_records        SET tournament_id = target_tournament WHERE tournament_id IS NULL;
        UPDATE documents              SET tournament_id = target_tournament WHERE tournament_id IS NULL;
        UPDATE activity_logs          SET tournament_id = target_tournament WHERE tournament_id IS NULL;
        UPDATE audit_logs             SET tournament_id = target_tournament WHERE tournament_id IS NULL;
        UPDATE officials              SET tournament_id = target_tournament WHERE tournament_id IS NULL;

        RAISE NOTICE 'Backfilled legacy rows to tournament %', target_tournament;
    ELSE
        RAISE NOTICE 'Backfill skipped: % candidate tournaments found. Assign tournament_id manually.', tournament_count;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Category names must be unique PER TOURNAMENT, not globally.
--
-- The original schema declared categories.name UNIQUE, which makes it impossible
-- for two tournaments to both contain e.g. "Cadet Male Kumite -60kg".
-- ---------------------------------------------------------------------------
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS categories_tournament_name_key
    ON categories (tournament_id, name);

-- ---------------------------------------------------------------------------
-- 4. Indexes for tournament-scoped reads
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_categories_tournament             ON categories (tournament_id);
CREATE INDEX IF NOT EXISTS idx_participants_tournament           ON participants (tournament_id);
CREATE INDEX IF NOT EXISTS idx_participant_categories_tournament ON participant_categories (tournament_id);
CREATE INDEX IF NOT EXISTS idx_bouts_tournament                  ON bouts (tournament_id);
CREATE INDEX IF NOT EXISTS idx_bouts_tournament_category         ON bouts (tournament_id, category_id);
CREATE INDEX IF NOT EXISTS idx_teams_tournament                  ON teams (tournament_id);
CREATE INDEX IF NOT EXISTS idx_payments_tournament               ON payments (tournament_id);
CREATE INDEX IF NOT EXISTS idx_officials_tournament              ON officials (tournament_id);

-- ---------------------------------------------------------------------------
-- 5. Verification — run these before applying the NOT NULL follow-up migration.
-- ---------------------------------------------------------------------------
-- SELECT 'categories'   AS table_name, COUNT(*) AS orphan_rows FROM categories   WHERE tournament_id IS NULL
-- UNION ALL SELECT 'participants', COUNT(*) FROM participants WHERE tournament_id IS NULL
-- UNION ALL SELECT 'bouts',        COUNT(*) FROM bouts        WHERE tournament_id IS NULL;
