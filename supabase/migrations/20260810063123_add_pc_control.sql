-- KarateTech 2.0
-- PC / Tatami Control System

-- ============================================================
-- Connected PCs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tournament_pcs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    pc_name text NOT NULL,
    pc_identifier text NOT NULL UNIQUE,

    tatami text,

    user_id uuid,
    username text,

    tournament_id uuid
    
        REFERENCES public.tournaments(id)
        ON DELETE SET NULL,

    status text NOT NULL DEFAULT 'offline'
        CHECK (status IN ('online', 'offline', 'taken_over')),

    last_heartbeat timestamptz,

    current_category_id uuid
        REFERENCES public.categories(id)
        ON DELETE SET NULL,

    current_match_id uuid
        REFERENCES public.bouts(id)
        ON DELETE SET NULL,

    is_admin_controlled boolean NOT NULL DEFAULT false,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- Category Locks
-- One active lock per tournament + category
-- ============================================================

CREATE TABLE IF NOT EXISTS public.category_locks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    tournament_id uuid NOT NULL
        REFERENCES public.tournaments(id)
        ON DELETE CASCADE,

    category_id uuid NOT NULL
        REFERENCES public.categories(id)
        ON DELETE CASCADE,

    pc_id uuid NOT NULL
        REFERENCES public.tournament_pcs(id)
        ON DELETE CASCADE,

    tatami text,
    username text,

    locked_at timestamptz NOT NULL DEFAULT now(),
    last_heartbeat timestamptz,

    released_at timestamptz,

    is_active boolean NOT NULL DEFAULT true,

    admin_override boolean NOT NULL DEFAULT false,

    created_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- Only ONE active PC may own a tournament/category
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS
idx_category_locks_active_unique
ON public.category_locks (tournament_id, category_id)
WHERE is_active = true;


-- ============================================================
-- PC Control / Admin Activity Log
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pc_control_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    pc_id uuid
        REFERENCES public.tournament_pcs(id)
        ON DELETE SET NULL,

    tournament_id uuid
        REFERENCES public.tournaments(id)
        ON DELETE SET NULL,

    category_id uuid
        REFERENCES public.categories(id)
        ON DELETE SET NULL,

    action text NOT NULL,

    performed_by uuid,
    performed_by_username text,

    details jsonb NOT NULL DEFAULT '{}'::jsonb,

    created_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- Useful indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS
idx_tournament_pcs_tournament
ON public.tournament_pcs(tournament_id);

CREATE INDEX IF NOT EXISTS
idx_tournament_pcs_status
ON public.tournament_pcs(status);

CREATE INDEX IF NOT EXISTS
idx_category_locks_tournament
ON public.category_locks(tournament_id);

CREATE INDEX IF NOT EXISTS
idx_category_locks_pc
ON public.category_locks(pc_id);

CREATE INDEX IF NOT EXISTS
idx_pc_control_logs_tournament
ON public.pc_control_logs(tournament_id);

CREATE INDEX IF NOT EXISTS
idx_pc_control_logs_pc
ON public.pc_control_logs(pc_id);


-- ============================================================
-- Updated-at helper
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_tournament_pcs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS
trg_tournament_pcs_updated_at
ON public.tournament_pcs;

CREATE TRIGGER
trg_tournament_pcs_updated_at
BEFORE UPDATE ON public.tournament_pcs
FOR EACH ROW
EXECUTE FUNCTION public.update_tournament_pcs_updated_at();