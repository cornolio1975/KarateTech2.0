-- KarateTech 2.0
-- Fix RLS Policies for PC Control System

-- tournament_pcs
ALTER TABLE public.tournament_pcs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read tournament_pcs" 
ON public.tournament_pcs FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to insert tournament_pcs" 
ON public.tournament_pcs FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update their own PC or Admin overrides" 
ON public.tournament_pcs FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete PCs" 
ON public.tournament_pcs FOR DELETE 
TO authenticated 
USING (true);


-- category_locks
ALTER TABLE public.category_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read category_locks" 
ON public.category_locks FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to insert category_locks" 
ON public.category_locks FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update category_locks" 
ON public.category_locks FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete category_locks" 
ON public.category_locks FOR DELETE 
TO authenticated 
USING (true);


-- pc_control_logs
ALTER TABLE public.pc_control_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read pc_control_logs" 
ON public.pc_control_logs FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to insert pc_control_logs" 
ON public.pc_control_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- No update/delete policies for logs to maintain audit trail immutability
