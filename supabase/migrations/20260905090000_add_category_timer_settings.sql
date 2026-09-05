ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS category_timer_seconds integer,
  ADD COLUMN IF NOT EXISTS category_timer_source text,
  ADD COLUMN IF NOT EXISTS category_timer_updated_at timestamptz;

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_category_timer_seconds_check;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_category_timer_seconds_check
  CHECK (category_timer_seconds IS NULL OR category_timer_seconds > 0);