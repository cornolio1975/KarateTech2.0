export const sqliteClient = {
  get: async (table: string, tournamentId?: string) => {
    if (typeof window === 'undefined') return [];
    const url = new URL(`/api/db/${table}`, window.location.origin);
    if (tournamentId) url.searchParams.append('tournament_id', tournamentId);
    
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(await res.text());
    const { data } = await res.json();
    return data || [];
  },

  query: async (table: string, filters: Record<string, any> = {}) => {
    if (typeof window === 'undefined') return [];
    const url = new URL(`/api/db/${table}`, window.location.origin);
    for (const [key, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null) {
        url.searchParams.append(key, String(val));
      }
    }

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(await res.text());
    const { data } = await res.json();
    return data || [];
  },

  getById: async (table: string, id: string) => {
    if (typeof window === 'undefined') return null;
    const url = new URL(`/api/db/${table}`, window.location.origin);
    url.searchParams.append('id', id);

    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const { data } = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  },
  
  insert: async (table: string, payload: any) => {
    if (typeof window === 'undefined') return payload;
    const res = await fetch(`/api/db/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await res.text());
    const { data } = await res.json();
    return data;
  },

  update: async (table: string, id: string, payload: any) => {
    if (typeof window === 'undefined') return payload;
    const url = new URL(`/api/db/${table}`, window.location.origin);
    url.searchParams.append('id', id);
    
    const res = await fetch(url.toString(), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await res.text());
    const { data } = await res.json();
    return data;
  },

  delete: async (table: string, id: string) => {
    if (typeof window === 'undefined') return true;
    const url = new URL(`/api/db/${table}`, window.location.origin);
    url.searchParams.append('id', id);
    
    const res = await fetch(url.toString(), {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(await res.text());
    return true;
  },

  logEvent: async (action: string, details: any, extra: { user?: string; role?: string; tournament_id?: string; match_id?: string } = {}) => {
    try {
      if (typeof window === 'undefined') return;
      await fetch('/api/server/event-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          details,
          ...extra
        })
      });
    } catch (e) {
      console.warn('Failed to log server event:', e);
    }
  }
};
