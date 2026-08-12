-- Add top-level settings column to tournaments table
-- This stores lightweight tournament settings (sponsor ticker speed, etc.)
-- separately from the large data JSONB blob, avoiding Content-Length overflow
-- when fetching tournament lists.

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Seed ticker_speed default for any existing tournaments that don't have it
UPDATE public.tournaments
  SET settings = COALESCE(settings, '{}') || '{"ticker_speed": 20}'
  WHERE settings IS NULL OR settings->>'ticker_speed' IS NULL;

-- Index for faster lookups on settings keys
CREATE INDEX IF NOT EXISTS idx_tournaments_settings
  ON public.tournaments USING GIN (settings);
