-- KarateTech 2.0
-- Enable Realtime for PC Control Tables

-- Ensure tables are in the realtime publication
BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'category_locks'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.category_locks;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'tournament_pcs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_pcs;
    END IF;
END $$;

COMMIT;
