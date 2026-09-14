-- Add new profile fields to the clubs table
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS head_coach text,
  ADD COLUMN IF NOT EXISTS team_coach text,
  ADD COLUMN IF NOT EXISTS club_manager text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS country text;
