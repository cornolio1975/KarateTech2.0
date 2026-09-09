-- Server-side tournament isolation via Row Level Security.
--
-- ⚠ APPLY THIS LAST, AND ONLY AFTER:
--     1. 20260909120000_add_tournament_id_isolation.sql has run,
--     2. its verification query returns 0 orphan rows,
--     3. every row has been assigned an owning tournament.
--
-- Rows whose tournament_id is still NULL become invisible once RLS is on.
--
-- To roll back:  ALTER TABLE <name> DISABLE ROW LEVEL SECURITY;
--
-- ---------------------------------------------------------------------------
-- ANONYMOUS ACCESS
--
-- Login is not enforced on every route: /public, /public/tournaments and the
-- spectator display read tournament data without a session, and
-- /public/register inserts participants. Those requests arrive as the `anon`
-- role, so public read access (and self-registration) must remain open or the
-- public site breaks.
--
-- Anonymous access is still tournament-scoped: `anon` can only reach rows
-- belonging to a non-deleted tournament.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION can_access_tournament(target UUID)
RETURNS BOOLEAN AS $$
    SELECT target IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM tournaments t
            WHERE t.id = target
              AND t.deleted_at IS NULL
       );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

DO $$
DECLARE
    target_table TEXT;
    -- Spectator pages must read these.
    public_readable TEXT[] := ARRAY['categories', 'participants', 'participant_categories', 'bouts'];
    -- Never exposed anonymously.
    staff_only TEXT[] := ARRAY[
        'teams', 'team_members', 'payments', 'medical_records',
        'documents', 'activity_logs', 'audit_logs', 'officials',
        'bracket_versions'
    ];
BEGIN
    FOREACH target_table IN ARRAY public_readable LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', target_table);

        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', target_table || '_read', target_table);
        EXECUTE format($f$
            CREATE POLICY %I ON %I
                FOR SELECT TO authenticated, anon
                USING (can_access_tournament(tournament_id))
        $f$, target_table || '_read', target_table);

        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', target_table || '_write', target_table);
        EXECUTE format($f$
            CREATE POLICY %I ON %I
                FOR ALL TO authenticated
                USING (can_access_tournament(tournament_id))
                WITH CHECK (can_access_tournament(tournament_id))
        $f$, target_table || '_write', target_table);
    END LOOP;

    FOREACH target_table IN ARRAY staff_only LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', target_table);

        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', target_table || '_tournament_scope', target_table);
        EXECUTE format($f$
            CREATE POLICY %I ON %I
                FOR ALL TO authenticated
                USING (can_access_tournament(tournament_id))
                WITH CHECK (can_access_tournament(tournament_id))
        $f$, target_table || '_tournament_scope', target_table);
    END LOOP;
END $$;

-- Public self-registration (/public/register) inserts participants while signed
-- out, scoped so a visitor can only register into a live tournament.
DROP POLICY IF EXISTS participants_public_register ON participants;
CREATE POLICY participants_public_register ON participants
    FOR INSERT TO anon
    WITH CHECK (can_access_tournament(tournament_id));

-- Tournaments list: readable by everyone, writable by staff.
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tournaments_read ON tournaments;
CREATE POLICY tournaments_read ON tournaments
    FOR SELECT TO authenticated, anon
    USING (deleted_at IS NULL);

DROP POLICY IF EXISTS tournaments_write ON tournaments;
CREATE POLICY tournaments_write ON tournaments
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- bracket_versions is append-only.
REVOKE UPDATE, DELETE ON bracket_versions FROM authenticated, anon;

-- NOTE: `clubs`, `coaches` and `countries` are shared reference data with no
-- tournament_id, and are intentionally left without RLS.
