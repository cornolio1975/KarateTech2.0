-- One-off maintenance: assign tournament_id to rows left NULL by the backfill.
--
-- This file lives outside supabase/migrations on purpose — it must NOT run
-- automatically. Run it by hand, after 20260909120000_add_tournament_id_isolation.sql
-- and BEFORE enabling RLS, because NULL-owned rows become invisible under RLS.
--
-- Usage:
--   psql "<connection string>" -v target_tournament="'<uuid>'" -f assign_orphan_tournament_ids.sql
--
-- Most tables can derive their owner from a relationship, so :target_tournament
-- is only used for the true roots (categories / participants / teams / officials)
-- that have nothing to inherit from.
--
-- ⚠ Take a backup first. This writes to every tournament-dependent table.

\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------------
-- STEP 0 — Inspect. Run this alone first to see the scale of the problem.
-- ---------------------------------------------------------------------------
\echo '=== orphan rows BEFORE ==='
SELECT 'categories'             AS table_name, COUNT(*) AS orphans FROM categories             WHERE tournament_id IS NULL
UNION ALL SELECT 'participants',           COUNT(*) FROM participants           WHERE tournament_id IS NULL
UNION ALL SELECT 'participant_categories', COUNT(*) FROM participant_categories WHERE tournament_id IS NULL
UNION ALL SELECT 'bouts',                  COUNT(*) FROM bouts                  WHERE tournament_id IS NULL
UNION ALL SELECT 'teams',                  COUNT(*) FROM teams                  WHERE tournament_id IS NULL
UNION ALL SELECT 'team_members',           COUNT(*) FROM team_members           WHERE tournament_id IS NULL
UNION ALL SELECT 'payments',               COUNT(*) FROM payments               WHERE tournament_id IS NULL
UNION ALL SELECT 'medical_records',        COUNT(*) FROM medical_records        WHERE tournament_id IS NULL
UNION ALL SELECT 'documents',              COUNT(*) FROM documents              WHERE tournament_id IS NULL
UNION ALL SELECT 'officials',              COUNT(*) FROM officials              WHERE tournament_id IS NULL
ORDER BY table_name;

BEGIN;

-- ---------------------------------------------------------------------------
-- STEP 1 — Roots. These own nothing upstream, so the caller must choose.
-- ---------------------------------------------------------------------------
UPDATE categories   SET tournament_id = :target_tournament::uuid WHERE tournament_id IS NULL;
UPDATE officials    SET tournament_id = :target_tournament::uuid WHERE tournament_id IS NULL;
UPDATE teams        SET tournament_id = :target_tournament::uuid WHERE tournament_id IS NULL;

-- ---------------------------------------------------------------------------
-- STEP 2 — Derive the rest from existing relationships.
--
-- Order matters: each step depends on the one above it.
-- ---------------------------------------------------------------------------

-- participant_categories inherits from its category.
UPDATE participant_categories pc
   SET tournament_id = c.tournament_id
  FROM categories c
 WHERE pc.category_id = c.id
   AND pc.tournament_id IS NULL
   AND c.tournament_id IS NOT NULL;

-- A participant belongs to the tournament of any category they are entered in.
UPDATE participants p
   SET tournament_id = pc.tournament_id
  FROM participant_categories pc
 WHERE pc.participant_id = p.id
   AND p.tournament_id IS NULL
   AND pc.tournament_id IS NOT NULL;

-- Unentered participants have nothing to inherit from.
UPDATE participants SET tournament_id = :target_tournament::uuid WHERE tournament_id IS NULL;

-- Bouts inherit from their category.
UPDATE bouts b
   SET tournament_id = c.tournament_id
  FROM categories c
 WHERE b.category_id = c.id
   AND b.tournament_id IS NULL
   AND c.tournament_id IS NOT NULL;

-- Per-participant records inherit from the participant.
UPDATE payments x        SET tournament_id = p.tournament_id FROM participants p
 WHERE x.participant_id = p.id AND x.tournament_id IS NULL AND p.tournament_id IS NOT NULL;

UPDATE medical_records x SET tournament_id = p.tournament_id FROM participants p
 WHERE x.participant_id = p.id AND x.tournament_id IS NULL AND p.tournament_id IS NOT NULL;

UPDATE documents x       SET tournament_id = p.tournament_id FROM participants p
 WHERE x.participant_id = p.id AND x.tournament_id IS NULL AND p.tournament_id IS NOT NULL;

UPDATE activity_logs x   SET tournament_id = p.tournament_id FROM participants p
 WHERE x.participant_id = p.id AND x.tournament_id IS NULL AND p.tournament_id IS NOT NULL;

-- team_members inherit from their team.
UPDATE team_members tm
   SET tournament_id = t.tournament_id
  FROM teams t
 WHERE tm.team_id = t.id
   AND tm.tournament_id IS NULL
   AND t.tournament_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- STEP 3 — Verify before committing.
-- ---------------------------------------------------------------------------
\echo '=== orphan rows AFTER (review before COMMIT) ==='
SELECT 'categories'             AS table_name, COUNT(*) AS orphans FROM categories             WHERE tournament_id IS NULL
UNION ALL SELECT 'participants',           COUNT(*) FROM participants           WHERE tournament_id IS NULL
UNION ALL SELECT 'participant_categories', COUNT(*) FROM participant_categories WHERE tournament_id IS NULL
UNION ALL SELECT 'bouts',                  COUNT(*) FROM bouts                  WHERE tournament_id IS NULL
UNION ALL SELECT 'teams',                  COUNT(*) FROM teams                  WHERE tournament_id IS NULL
UNION ALL SELECT 'team_members',           COUNT(*) FROM team_members           WHERE tournament_id IS NULL
UNION ALL SELECT 'payments',               COUNT(*) FROM payments               WHERE tournament_id IS NULL
UNION ALL SELECT 'medical_records',        COUNT(*) FROM medical_records        WHERE tournament_id IS NULL
UNION ALL SELECT 'documents',              COUNT(*) FROM documents              WHERE tournament_id IS NULL
UNION ALL SELECT 'officials',              COUNT(*) FROM officials              WHERE tournament_id IS NULL
ORDER BY table_name;

-- Rows left here reference a missing parent and need manual attention.
\echo '=== bouts whose category no longer exists ==='
SELECT b.id, b.category_id FROM bouts b
 WHERE b.tournament_id IS NULL
 LIMIT 20;

COMMIT;

-- ---------------------------------------------------------------------------
-- Optional hardening, once every count above is 0. Run separately.
-- ---------------------------------------------------------------------------
-- ALTER TABLE categories   ALTER COLUMN tournament_id SET NOT NULL;
-- ALTER TABLE participants ALTER COLUMN tournament_id SET NOT NULL;
-- ALTER TABLE bouts        ALTER COLUMN tournament_id SET NOT NULL;
