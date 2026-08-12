import { createClient } from '@/utils/supabase/client';
import { TournamentPC, CategoryLock } from '@/db/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient() 
  : null;

export async function registerPC(pcIdentifier: string, pcName: string, tournamentId?: string, tatami?: string, userId?: string, username?: string): Promise<TournamentPC> {
  if (!supabase) throw new Error('Supabase not configured');
  
  const payload = {
    pc_identifier: pcIdentifier,
    pc_name: pcName,
    tournament_id: tournamentId || null,
    tatami: tatami || null,
    user_id: userId || null,
    username: username || null,
    status: 'online',
    last_heartbeat: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_admin_controlled: false
  };

  const { data, error } = await supabase
    .from('tournament_pcs')
    .upsert(payload, { onConflict: 'pc_identifier' })
    .select()
    .single();

  if (error) throw error;
  return data as TournamentPC;
}

export async function heartbeat(pcId: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from('tournament_pcs')
    .update({ 
      last_heartbeat: new Date().toISOString(),
      status: 'online',
      updated_at: new Date().toISOString()
    })
    .eq('id', pcId);
}

export async function overrideLock(tournamentId: string, categoryId: string, operatorUsername: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('category_locks')
    .update({ 
      is_active: false, 
      released_at: new Date().toISOString(),
      admin_override: true
    })
    .eq('tournament_id', tournamentId)
    .eq('category_id', categoryId)
    .eq('is_active', true);
  if (error) throw error;
}

export async function acquireLockAction(tournamentId: string, categoryId: string, pcId: string, tatami?: string, username?: string): Promise<{ success: boolean; lock?: CategoryLock }> {
  if (!supabase) return { success: true };
  
  const { data, error } = await supabase
    .from('category_locks')
    .insert([{
      tournament_id: tournamentId,
      category_id: categoryId,
      pc_id: pcId,
      tatami: tatami || null,
      username: username || null,
      is_active: true
    }])
    .select()
    .maybeSingle();

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      // Check if WE already own it
      const { data: existing } = await supabase
        .from('category_locks')
        .select('pc_id')
        .eq('tournament_id', tournamentId)
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .maybeSingle();
        
      if (existing && existing.pc_id === pcId) {
        return { success: true };
      }
      return { success: false };
    }
    throw error;
  }

  await supabase
    .from('tournament_pcs')
    .update({ current_category_id: categoryId, updated_at: new Date().toISOString() })
    .eq('id', pcId);

  return { success: true, lock: data };
}

export async function releaseLockAction(tournamentId: string, categoryId: string, pcId?: string): Promise<void> {
  if (!supabase) return;
  
  let query = supabase
    .from('category_locks')
    .update({ 
      is_active: false, 
      released_at: new Date().toISOString() 
    })
    .eq('tournament_id', tournamentId)
    .eq('category_id', categoryId)
    .eq('is_active', true);
  
  if (pcId) {
    query = query.eq('pc_id', pcId);
  }

  const { error } = await query;
  if (error) throw error;

  if (pcId) {
    await supabase
      .from('tournament_pcs')
      .update({ current_category_id: null, updated_at: new Date().toISOString() })
      .eq('id', pcId);
  }
}

export async function getActiveLocks(tournamentId: string): Promise<CategoryLock[]> {
  if (!supabase) return [];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tournamentId)) return [];
  
  const { data, error } = await supabase
    .from('category_locks')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('is_active', true);
  
  if (error) throw error;
  return data || [];
}

export async function getPcs(tournamentId?: string): Promise<TournamentPC[]> {
  if (!supabase) return [];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let query = supabase.from('tournament_pcs').select('*');
  
  if (tournamentId && uuidRegex.test(tournamentId)) {
    query = query.eq('tournament_id', tournamentId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
