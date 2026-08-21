import { sqliteClient } from './sqlite/client';
import { syncEngine } from '@/lib/syncEngine';

const tId = () => typeof window !== 'undefined' ? localStorage.getItem('ts_active_tournament_id') || '' : '';

// We only override the data mutation parts that need to be logged to the sync_queue
export const desktopOverrides: any = {
  clubs: {
    list: async () => sqliteClient.get('clubs'),
    add: async (club: any) => {
      const data = await sqliteClient.insert('clubs', club);
      await syncEngine.queueMutation(tId(), 'clubs', data.id, 'INSERT', club);
      return data;
    },
    update: async (id: string, updates: any) => {
      const data = await sqliteClient.update('clubs', id, updates);
      await syncEngine.queueMutation(tId(), 'clubs', id, 'UPDATE', updates);
      return data;
    },
    delete: async (id: string) => {
      await sqliteClient.delete('clubs', id);
      await syncEngine.queueMutation(tId(), 'clubs', id, 'DELETE', null);
    }
  },
  categories: {
    list: async () => sqliteClient.get('categories'),
    add: async (cat: any) => {
      const data = await sqliteClient.insert('categories', cat);
      await syncEngine.queueMutation(tId(), 'categories', data.id, 'INSERT', cat);
      return data;
    },
    update: async (id: string, updates: any) => {
      const data = await sqliteClient.update('categories', id, updates);
      await syncEngine.queueMutation(tId(), 'categories', id, 'UPDATE', updates);
      return data;
    },
    delete: async (id: string) => {
      await sqliteClient.delete('categories', id);
      await syncEngine.queueMutation(tId(), 'categories', id, 'DELETE', null);
    }
  },
  participants: {
    list: async () => sqliteClient.get('participants'),
    get: async (id: string) => {
      const all = await sqliteClient.get('participants');
      return all.find((p: any) => p.id === id);
    },
    add: async (p: any) => {
      const data = await sqliteClient.insert('participants', p);
      await syncEngine.queueMutation(tId(), 'participants', data.id, 'INSERT', p);
      return data;
    },
    update: async (id: string, updates: any) => {
      const data = await sqliteClient.update('participants', id, updates);
      await syncEngine.queueMutation(tId(), 'participants', id, 'UPDATE', updates);
      return data;
    },
    delete: async (id: string) => {
      await sqliteClient.delete('participants', id);
      await syncEngine.queueMutation(tId(), 'participants', id, 'DELETE', null);
    }
  },
  bouts: {
    list: async () => sqliteClient.get('bouts'),
    add: async (bout: any) => {
      const data = await sqliteClient.insert('bouts', bout);
      await syncEngine.queueMutation(tId(), 'bouts', data.id, 'INSERT', bout);
      return data;
    },
    update: async (id: string, updates: any) => {
      const data = await sqliteClient.update('bouts', id, updates);
      await syncEngine.queueMutation(tId(), 'bouts', id, 'UPDATE', updates);
      return data;
    }
  }
};
