ALTER TABLE public.bouts
  ADD COLUMN IF NOT EXISTS vr_file_url TEXT,
  ADD COLUMN IF NOT EXISTS vr_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS vr_recorded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vr_duration_seconds INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vr_camera_label TEXT;

UPDATE public.bouts
SET
  vr_metadata = COALESCE(vr_metadata, '{}'::jsonb),
  vr_duration_seconds = COALESCE(vr_duration_seconds, 0)
WHERE
  vr_metadata IS NULL OR vr_duration_seconds IS NULL;
