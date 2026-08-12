-- Disable RLS to match the rest of the application which relies on the anon key
ALTER TABLE public.tournament_pcs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_locks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pc_control_logs DISABLE ROW LEVEL SECURITY;
