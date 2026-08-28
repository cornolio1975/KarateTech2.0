import { createClient } from '@/utils/supabase/client';
import { TournamentPC, CategoryLock } from '@/db/types';
import { describeError } from '@/db/dbClient';

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

  if (error) throw new Error(describeError(error));
  return data as TournamentPC;
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolvePcId(pcIdentifierOrId: string): Promise<string> {
  if (!supabase) return pcIdentifierOrId;
  if (uuidRegex.test(pcIdentifierOrId)) return pcIdentifierOrId;
  const { data } = await supabase.from('tournament_pcs').select('id').eq('pc_identifier', pcIdentifierOrId).maybeSingle();
  return data?.id || pcIdentifierOrId;
}

export async function heartbeat(pcId: string, currentCategoryId?: string, currentMatchId?: string): Promise<{ is_admin_controlled: boolean } | void> {
  if (!supabase) return;
  const actualPcId = await resolvePcId(pcId);
  const updatePayload: any = { 
    last_heartbeat: new Date().toISOString(),
    status: 'online',
    updated_at: new Date().toISOString()
  };
  if (currentCategoryId !== undefined) updatePayload.current_category_id = currentCategoryId || null;
  if (currentMatchId !== undefined) updatePayload.current_match_id = currentMatchId || null;

  const { data } = await supabase
    .from('tournament_pcs')
    .update(updatePayload)
    .eq('id', actualPcId)
    .select('is_admin_controlled')
    .single();

  return { is_admin_controlled: data?.is_admin_controlled || false };
}

export async function setAdminControlled(tournamentId: string, tatami: string, isControlled: boolean): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('tournament_pcs')
    .update({ is_admin_controlled: isControlled, updated_at: new Date().toISOString() })
    .eq('tournament_id', tournamentId)
    .eq('tatami', tatami);
  if (error) throw new Error(describeError(error));
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
  if (error) throw new Error(describeError(error));
}

export async function acquireLockAction(tournamentId: string, categoryId: string, pcId: string, tatami?: string, username?: string): Promise<{ success: boolean; lock?: CategoryLock }> {
  if (!supabase) return { success: true };
  
  const actualPcId = await resolvePcId(pcId);

  const { data, error } = await supabase
    .from('category_locks')
    .insert([{
      tournament_id: tournamentId,
      category_id: categoryId,
      pc_id: actualPcId,
      tatami: tatami || null,
      username: username || null,
      is_active: true
    }])
    .select()
    .maybeSingle();

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      // Check if WE already own it or if the lock is stale
      const { data: existing } = await supabase
        .from('category_locks')
        .select('id, pc_id')
        .eq('tournament_id', tournamentId)
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .maybeSingle();
        
      if (existing) {
        if (existing.pc_id === actualPcId) {
          return { success: true };
        }

        // Check if the current owner's heartbeat is older than 60 seconds
        if (existing.pc_id !== 'admin') {
          const { data: pcInfo } = await supabase
            .from('tournament_pcs')
            .select('last_heartbeat')
            .eq('id', existing.pc_id)
            .maybeSingle();

          if (pcInfo && pcInfo.last_heartbeat) {
            const lastHeartbeatTime = new Date(pcInfo.last_heartbeat).getTime();
            const now = new Date().getTime();
            const diffSeconds = (now - lastHeartbeatTime) / 1000;

            if (diffSeconds > 60) {
              // Stale lock detected -> break it
              await supabase
                .from('category_locks')
                .update({ is_active: false, released_at: new Date().toISOString() })
                .eq('id', existing.id);
              
              // Retry acquisition
              return acquireLockAction(tournamentId, categoryId, pcId, tatami, username);
            }
          }
        }
      }
      return { success: false };
    }
    throw new Error(describeError(error));
  }

  await supabase
    .from('tournament_pcs')
    .update({ current_category_id: categoryId, updated_at: new Date().toISOString() })
    .eq('id', actualPcId);

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
    const actualPcId = await resolvePcId(pcId);
    query = query.eq('pc_id', actualPcId);
  }

  const { error } = await query;
  if (error) throw new Error(describeError(error));

  if (pcId) {
    const actualPcId = await resolvePcId(pcId);
    await supabase
      .from('tournament_pcs')
      .update({ current_category_id: null, updated_at: new Date().toISOString() })
      .eq('id', actualPcId);
  }
}

export async function getActiveLocks(tournamentId: string): Promise<CategoryLock[]> {
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('category_locks')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('is_active', true);
    
    if (error) throw new Error(describeError(error));
    return data || [];
  } catch (error) {
    console.warn("Supabase fetch failed for getActiveLocks:", error);
    return [];
  }
}

export async function getPcs(tournamentId?: string): Promise<TournamentPC[]> {
  if (!supabase) return [];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let query = supabase.from('tournament_pcs').select('*');
  
  if (tournamentId && uuidRegex.test(tournamentId)) {
    query = query.eq('tournament_id', tournamentId);
  }
  
  try {
    const { data, error } = await query;
    if (error) throw new Error(describeError(error));
    return data || [];
  } catch (error) {
    console.warn("Supabase fetch failed for getPcs:", error);
    return [];
  }
}
