import { supabase } from '@/db/dbClient';
import { sqliteClient } from '@/db/sqlite/client';

export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE';

export interface SyncEvent {
  id: string;
  tournament_id: string;
  entity_type: string;
  entity_id: string;
  operation: SyncOperation;
  payload: string; // JSON
  timestamp: string;
  status: 'pending' | 'success' | 'failed';
  retry_count: number;
  error_message?: string;
}

export const syncEngine = {
  queueMutation: async (tournamentId: string, entityType: string, entityId: string, operation: SyncOperation, payload: any) => {
    try {
      const event: Partial<SyncEvent> = {
        id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tournament_id: tournamentId || 'global',
        entity_type: entityType,
        entity_id: entityId,
        operation,
        payload: payload ? JSON.stringify(payload) : undefined,
        timestamp: new Date().toISOString(),
        status: 'pending',
        retry_count: 0
      };

      await sqliteClient.insert('sync_queue', event);
    } catch (e) {
      console.warn('Failed to queue mutation for sync:', e);
    }
  },

  processQueue: async () => {
    if (!supabase || typeof window === 'undefined') return { synced: 0, failed: 0 };

    try {
      const pendingEvents = await sqliteClient.query('sync_queue', { status: 'pending' });
      if (!pendingEvents || pendingEvents.length === 0) return { synced: 0, failed: 0 };

      let synced = 0;
      let failed = 0;

      for (const event of pendingEvents) {
        try {
          let error = null;
          const payload = event.payload ? JSON.parse(event.payload) : null;

          if (event.operation === 'INSERT') {
            const { error: insErr } = await supabase.from(event.entity_type).upsert([payload]);
            error = insErr;
          } else if (event.operation === 'UPDATE') {
            const { error: updErr } = await supabase.from(event.entity_type).update(payload).eq('id', event.entity_id);
            error = updErr;
          } else if (event.operation === 'DELETE') {
            const { error: delErr } = await supabase.from(event.entity_type).delete().eq('id', event.entity_id);
            error = delErr;
          }

          if (error) throw new Error(error.message);

          // Mark as success
          await sqliteClient.update('sync_queue', event.id, { 
            status: 'success',
            error_message: null
          });
          synced++;
        } catch (e: any) {
          failed++;
          await sqliteClient.update('sync_queue', event.id, { 
            status: 'failed', 
            error_message: e.message,
            retry_count: (event.retry_count || 0) + 1
          });
        }
      }

      if (synced > 0) {
        await sqliteClient.logEvent('CLOUD_SYNC_COMPLETED', `Successfully synced ${synced} mutations to Supabase.`);
      }

      return { synced, failed };
    } catch (e) {
      console.warn('Sync queue processing error:', e);
      return { synced: 0, failed: 0 };
    }
  },

  syncNow: async () => {
    return syncEngine.processQueue();
  }
};

// Start sync loop in background in browser
if (typeof window !== 'undefined') {
  setInterval(() => {
    if (navigator.onLine) {
      syncEngine.processQueue();
    }
  }, 15000);
}
