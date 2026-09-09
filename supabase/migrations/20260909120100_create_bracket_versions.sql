-- Immutable bracket version history, shared across PCs.
--
-- Rows in this table are append-only. Nothing in the application updates or
-- deletes a version; restores and undos are recorded as NEW versions.

CREATE TABLE IF NOT EXISTS bracket_versions (
    version_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    bracket_id      TEXT NOT NULL,
    category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
    version_number  INT  NOT NULL,
    reason          TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      TEXT,
    change_summary  TEXT,
    restored_from   INT,
    status          TEXT NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID', 'CORRUPTED', 'FINAL')),
    integrity_hash  TEXT NOT NULL,
    snapshot        JSONB NOT NULL,

    -- Two PCs cannot create the same version number for one bracket. The loser
    -- of the race gets a unique-violation, which surfaces as a conflict prompt
    -- instead of silently overwriting the newer version.
    CONSTRAINT bracket_versions_unique_number UNIQUE (tournament_id, bracket_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_bracket_versions_lookup
    ON bracket_versions (tournament_id, bracket_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_bracket_versions_category
    ON bracket_versions (tournament_id, category_id);

-- Block mutation of historical versions at the database level, so a bug or a
-- stray client cannot rewrite bracket history.
CREATE OR REPLACE FUNCTION bracket_versions_reject_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'bracket_versions is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bracket_versions_no_update ON bracket_versions;
CREATE TRIGGER bracket_versions_no_update
    BEFORE UPDATE ON bracket_versions
    FOR EACH ROW EXECUTE FUNCTION bracket_versions_reject_mutation();

DROP TRIGGER IF EXISTS bracket_versions_no_delete ON bracket_versions;
CREATE TRIGGER bracket_versions_no_delete
    BEFORE DELETE ON bracket_versions
    FOR EACH ROW EXECUTE FUNCTION bracket_versions_reject_mutation();

-- Realtime lets other PCs learn about new versions as they are created.
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE bracket_versions;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;
