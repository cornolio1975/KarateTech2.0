import { sqliteClient } from './sqlite/client';
import { syncEngine } from '@/lib/syncEngine';

const tId = () => typeof window !== 'undefined' ? localStorage.getItem('ts_active_tournament_id') || '' : '';

export const desktopOverrides: any = {
  tournaments: {
    list: async () => sqliteClient.get('tournaments'),
    get: async (id: string) => sqliteClient.getById('tournaments', id),
    add: async (tournament: any) => {
      const data = await sqliteClient.insert('tournaments', tournament);
      await syncEngine.queueMutation(tId() || data.id, 'tournaments', data.id, 'INSERT', tournament);
      return data;
    },
    update: async (id: string, updates: any) => {
      const data = await sqliteClient.update('tournaments', id, updates);
      await syncEngine.queueMutation(tId() || id, 'tournaments', id, 'UPDATE', updates);
      return data;
    },
    delete: async (id: string) => {
      await sqliteClient.delete('tournaments', id);
      await syncEngine.queueMutation(tId() || id, 'tournaments', id, 'DELETE', null);
    }
  },
  clubs: {
    list: async (tournamentId?: string) => sqliteClient.get('clubs', tournamentId || tId()),
    add: async (club: any) => {
      const payload = { tournament_id: tId(), ...club };
      const data = await sqliteClient.insert('clubs', payload);
      await syncEngine.queueMutation(tId(), 'clubs', data.id, 'INSERT', payload);
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
    list: async (tournamentId?: string) => sqliteClient.get('categories', tournamentId || tId()),
    get: async (id: string) => sqliteClient.getById('categories', id),
    add: async (cat: any) => {
      const payload = { tournament_id: tId(), ...cat };
      const data = await sqliteClient.insert('categories', payload);
      await syncEngine.queueMutation(tId(), 'categories', data.id, 'INSERT', payload);
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
    list: async (tournamentId?: string) => sqliteClient.get('participants', tournamentId || tId()),
    get: async (id: string) => sqliteClient.getById('participants', id),
    add: async (p: any) => {
      const payload = { tournament_id: tId(), ...p };
      const data = await sqliteClient.insert('participants', payload);
      await syncEngine.queueMutation(tId(), 'participants', data.id, 'INSERT', payload);
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
    list: async (tournamentId?: string) => sqliteClient.get('bouts', tournamentId || tId()),
    get: async (id: string) => sqliteClient.getById('bouts', id),
    add: async (bout: any) => {
      const payload = { tournament_id: tId(), ...bout };
      const data = await sqliteClient.insert('bouts', payload);
      await syncEngine.queueMutation(tId(), 'bouts', data.id, 'INSERT', payload);
      return data;
    },
    update: async (id: string, updates: any) => {
      const data = await sqliteClient.update('bouts', id, updates);
      await syncEngine.queueMutation(tId(), 'bouts', id, 'UPDATE', updates);
      return data;
    },
    delete: async (id: string) => {
      await sqliteClient.delete('bouts', id);
      await syncEngine.queueMutation(tId(), 'bouts', id, 'DELETE', null);
    }
  },
  officials: {
    list: async (tournamentId?: string) => sqliteClient.get('officials', tournamentId || tId()),
    add: async (official: any) => {
      const payload = { tournament_id: tId(), ...official };
      const data = await sqliteClient.insert('officials', payload);
      await syncEngine.queueMutation(tId(), 'officials', data.id, 'INSERT', payload);
      return data;
    },
    update: async (id: string, updates: any) => {
      const data = await sqliteClient.update('officials', id, updates);
      await syncEngine.queueMutation(tId(), 'officials', id, 'UPDATE', updates);
      return data;
    },
    delete: async (id: string) => {
      await sqliteClient.delete('officials', id);
      await syncEngine.queueMutation(tId(), 'officials', id, 'DELETE', null);
    }
  },
  teams: {
    list: async (tournamentId?: string) => sqliteClient.get('teams', tournamentId || tId()),
    add: async (team: any) => {
      const payload = { tournament_id: tId(), ...team };
      const data = await sqliteClient.insert('teams', payload);
      await syncEngine.queueMutation(tId(), 'teams', data.id, 'INSERT', payload);
      return data;
    },
    update: async (id: string, updates: any) => {
      const data = await sqliteClient.update('teams', id, updates);
      await syncEngine.queueMutation(tId(), 'teams', id, 'UPDATE', updates);
      return data;
    },
    delete: async (id: string) => {
      await sqliteClient.delete('teams', id);
      await syncEngine.queueMutation(tId(), 'teams', id, 'DELETE', null);
    }
  }
};
