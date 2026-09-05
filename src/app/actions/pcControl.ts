import { createClient } from '@/utils/supabase/client';
import { TournamentPC, CategoryLock } from '@/db/types';
import { describeError } from '@/db/dbClient';
import { sqliteClient } from '@/db/sqlite/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient() 
  : null;

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolvePcId(pcIdentifierOrId: string): Promise<string> {
  if (supabase) {
    try {
      if (uuidRegex.test(pcIdentifierOrId)) return pcIdentifierOrId;
      const { data } = await supabase.from('tournament_pcs').select('id').eq('pc_identifier', pcIdentifierOrId).maybeSingle();
      if (data?.id) return data.id;
    } catch (e) {
      // ignore
    }
  }

  // SQLite fallback
  try {
    const pcs = await sqliteClient.query('tournament_pcs', { pc_identifier: pcIdentifierOrId });
    if (pcs && pcs.length > 0) return pcs[0].id;
  } catch (e) {
    // ignore
  }

  return pcIdentifierOrId;
}

export async function registerPC(
  pcIdentifier: string, 
  pcName: string, 
  tournamentId?: string, 
  tatami?: string, 
  userId?: string, 
  username?: string
): Promise<TournamentPC> {
  const payload: any = {
    id: `pc-${pcIdentifier.replace(/[^a-zA-Z0-9_-]/g, '') || Date.now()}`,
    pc_identifier: pcIdentifier,
    pc_name: pcName,
    tournament_id: tournamentId || null,
    tatami: tatami || null,
    user_id: userId || null,
    username: username || null,
    status: 'online',
    last_heartbeat: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_admin_controlled: 0
  };

  // Try Supabase first if available
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('tournament_pcs')
        .upsert({ ...payload, is_admin_controlled: false }, { onConflict: 'pc_identifier' })
        .select()
        .single();
      if (!error && data) return data as TournamentPC;
    } catch (e) {
      console.warn('Supabase registerPC failed, falling back to local SQLite:', e);
    }
  }

  // Fallback to SQLite local database
  try {
    const saved = await sqliteClient.insert('tournament_pcs', payload);
    return saved as TournamentPC;
  } catch (e: any) {
    console.warn('SQLite registerPC error:', e);
    return payload as TournamentPC;
  }
}

export async function heartbeat(
  pcId: string, 
  currentCategoryId?: string, 
  currentMatchId?: string
): Promise<{ is_admin_controlled: boolean } | void> {
  const actualPcId = await resolvePcId(pcId);
  const updatePayload: any = { 
    last_heartbeat: new Date().toISOString(),
    status: 'online',
    updated_at: new Date().toISOString()
  };
  if (currentCategoryId !== undefined) updatePayload.current_category_id = currentCategoryId || null;
  if (currentMatchId !== undefined) updatePayload.current_match_id = currentMatchId || null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('tournament_pcs')
        .update(updatePayload)
        .eq('id', actualPcId)
        .select('is_admin_controlled')
        .single();
      if (!error) {
        return { is_admin_controlled: !!data?.is_admin_controlled };
      }
    } catch (e) {
      // fallback
    }
  }

  // SQLite fallback
  try {
    const res = await sqliteClient.update('tournament_pcs', actualPcId, updatePayload);
    return { is_admin_controlled: !!res?.is_admin_controlled };
  } catch (e) {
    return { is_admin_controlled: false };
  }
}

export async function setAdminControlled(tournamentId: string, tatami: string, isControlled: boolean): Promise<void> {
  if (supabase) {
    try {
      await supabase
        .from('tournament_pcs')
        .update({ is_admin_controlled: isControlled, updated_at: new Date().toISOString() })
        .eq('tournament_id', tournamentId)
        .eq('tatami', tatami);
    } catch (e) {
      // fallback
    }
  }

  try {
    const pcs = await sqliteClient.query('tournament_pcs', { tournament_id: tournamentId, tatami });
    for (const pc of pcs) {
      await sqliteClient.update('tournament_pcs', pc.id, { 
        is_admin_controlled: isControlled ? 1 : 0, 
        updated_at: new Date().toISOString() 
      });
    }
  } catch (e) {
    // ignore
  }
}

export async function overrideLock(tournamentId: string, categoryId: string, operatorUsername: string): Promise<void> {
  if (supabase) {
    try {
      await supabase
        .from('category_locks')
        .update({ 
          is_active: false, 
          released_at: new Date().toISOString(),
          admin_override: true
        })
        .eq('tournament_id', tournamentId)
        .eq('category_id', categoryId)
        .eq('is_active', true);
    } catch (e) {
      // fallback
    }
  }

  try {
    const locks = await sqliteClient.query('category_locks', { tournament_id: tournamentId, category_id: categoryId, is_active: 1 });
    for (const l of locks) {
      await sqliteClient.update('category_locks', l.id, { is_active: 0 });
    }
  } catch (e) {
    // ignore
  }
}

export async function acquireLockAction(
  tournamentId: string, 
  categoryId: string, 
  pcId: string, 
  tatami?: string, 
  username?: string
): Promise<{ success: boolean; lock?: CategoryLock }> {
  const actualPcId = await resolvePcId(pcId);

  if (supabase) {
    try {
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

      if (!error && data) {
        await supabase
          .from('tournament_pcs')
          .update({ current_category_id: categoryId, updated_at: new Date().toISOString() })
          .eq('id', actualPcId);
        return { success: true, lock: data };
      }
    } catch (e) {
      // fall through to local
    }
  }

  // SQLite fallback
  try {
    const existing = await sqliteClient.query('category_locks', {
      tournament_id: tournamentId,
      category_id: categoryId,
      is_active: 1
    });

    if (existing && existing.length > 0) {
      const current = existing[0];
      if (current.tatami === tatami || current.locked_by === actualPcId) {
        return { success: true, lock: current };
      }
      return { success: false };
    }

    const newLock = {
      id: `lock-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      tournament_id: tournamentId,
      category_id: categoryId,
      tatami: tatami || 'Tatami 1',
      locked_by: actualPcId,
      is_active: 1,
      locked_at: new Date().toISOString()
    };

    const saved = await sqliteClient.insert('category_locks', newLock);
    return { success: true, lock: saved };
  } catch (e) {
    return { success: true };
  }
}

export async function releaseLockAction(tournamentId: string, categoryId: string, pcId?: string): Promise<void> {
  if (supabase) {
    try {
      let query = supabase
        .from('category_locks')
        .update({ 
          is_active: false, 
          released_at: new Date().toISOString() 
        })
        .eq('tournament_id', tournamentId)
        .eq('category_id', categoryId)
        .eq('is_active', true);
      await query;
    } catch (e) {
      // ignore
    }
  }

  try {
    const locks = await sqliteClient.query('category_locks', {
      tournament_id: tournamentId,
      category_id: categoryId,
      is_active: 1
    });
    for (const l of locks) {
      await sqliteClient.update('category_locks', l.id, { is_active: 0 });
    }
  } catch (e) {
    // ignore
  }
}

// MATCH LOCK CONTROLS (TEST 4: Concurrent match lock prevention)
export async function acquireMatchLockAction(
  tournamentId: string,
  boutId: string,
  tatami: string,
  pcId: string
): Promise<{ success: boolean; currentTatami?: string }> {
  try {
    const existing = await sqliteClient.query('match_locks', {
      tournament_id: tournamentId,
      bout_id: boutId,
      is_active: 1
    });

    if (existing && existing.length > 0) {
      const lock = existing[0];
      if (lock.tatami === tatami || lock.locked_by === pcId) {
        return { success: true };
      }
      return { success: false, currentTatami: lock.tatami };
    }

    const lockPayload = {
      id: `match-lock-${Date.now()}`,
      tournament_id: tournamentId,
      bout_id: boutId,
      tatami: tatami || 'Tatami 1',
      locked_by: pcId,
      is_active: 1,
      locked_at: new Date().toISOString()
    };

    await sqliteClient.insert('match_locks', lockPayload);
    return { success: true };
  } catch (e) {
    return { success: true };
  }
}

export async function releaseMatchLockAction(tournamentId: string, boutId: string): Promise<void> {
  try {
    const existing = await sqliteClient.query('match_locks', {
      tournament_id: tournamentId,
      bout_id: boutId,
      is_active: 1
    });
    for (const l of existing) {
      await sqliteClient.update('match_locks', l.id, { is_active: 0 });
    }
  } catch (e) {
    // ignore
  }
}

export async function getActiveLocks(tournamentId: string): Promise<CategoryLock[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('category_locks')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('is_active', true);
      
      if (!error && data) return data || [];
    } catch (e) {
      // fallback
    }
  }

  try {
    const localLocks = await sqliteClient.query('category_locks', { tournament_id: tournamentId, is_active: 1 });
    return localLocks || [];
  } catch (e) {
    return [];
  }
}

export async function getPcs(tournamentId?: string): Promise<TournamentPC[]> {
  if (supabase) {
    try {
      let query = supabase.from('tournament_pcs').select('*');
      if (tournamentId && uuidRegex.test(tournamentId)) {
        query = query.eq('tournament_id', tournamentId);
      }
      const { data, error } = await query;
      if (!error && data) return data || [];
    } catch (e) {
      // fallback
    }
  }

  try {
    const localPcs = await sqliteClient.get('tournament_pcs', tournamentId);
    return localPcs || [];
  } catch (e) {
    return [];
  }
}
