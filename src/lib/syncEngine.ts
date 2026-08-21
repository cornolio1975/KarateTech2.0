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

const isDesktop = typeof window !== 'undefined' && (window as any).isElectron || process.env.BUILD_TARGET === 'electron';

export const syncEngine = {
  queueMutation: async (tournamentId: string, entityType: string, entityId: string, operation: SyncOperation, payload: any) => {
    if (!isDesktop) return; // Only desktop local server queues sync

    const event: Partial<SyncEvent> = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tournament_id: tournamentId,
      entity_type: entityType,
      entity_id: entityId,
      operation,
      payload: payload ? JSON.stringify(payload) : undefined,
      timestamp: new Date().toISOString(),
      status: 'pending',
      retry_count: 0
    };

    await sqliteClient.insert('sync_queue', event);
  },

  processQueue: async () => {
    if (!supabase || !isDesktop) return;

    try {
      // Fetch pending events
      const pendingEvents = await sqliteClient.get('sync_queue');
      const toProcess = pendingEvents.filter((e: any) => e.status === 'pending');

      for (const event of toProcess) {
        try {
          let error = null;
          const payload = event.payload ? JSON.parse(event.payload) : null;

          if (event.operation === 'INSERT') {
            const { error: insErr } = await supabase.from(event.entity_type).insert([payload]);
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
          await sqliteClient.update('sync_queue', event.id, { status: 'success' });
        } catch (e: any) {
          // Mark as failed
          await sqliteClient.update('sync_queue', event.id, { 
            status: 'failed', 
            error_message: e.message,
            retry_count: event.retry_count + 1
          });
        }
      }
    } catch (e) {
      console.error('Sync queue processing error:', e);
    }
  }
};

// Start sync loop in background if running locally
if (isDesktop && typeof window !== 'undefined') {
  setInterval(syncEngine.processQueue, 15000); // Process every 15 seconds
}
