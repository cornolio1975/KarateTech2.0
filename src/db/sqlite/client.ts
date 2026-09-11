async function safeFetchJson<T = any>(url: string, options?: RequestInit, fallback: T = [] as any): Promise<T> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      return fallback;
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return fallback;
    }
    const json = await res.json();
    return (json?.data !== undefined ? json.data : fallback) as T;
  } catch (e) {
    return fallback;
  }
}

export const sqliteClient = {
  get: async <T = any>(table: string, tournamentId?: string): Promise<T[]> => {
    if (typeof window === 'undefined') return [];
    const url = new URL(`/api/db/${table}`, window.location.origin);
    if (tournamentId) url.searchParams.append('tournament_id', tournamentId);
    return safeFetchJson<T[]>(url.toString(), undefined, []);
  },

  query: async <T = any>(table: string, filters: Record<string, any> = {}): Promise<T[]> => {
    if (typeof window === 'undefined') return [];
    const url = new URL(`/api/db/${table}`, window.location.origin);
    for (const [key, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null) {
        url.searchParams.append(key, String(val));
      }
    }
    return safeFetchJson<T[]>(url.toString(), undefined, []);
  },

  getById: async <T = any>(table: string, id: string): Promise<T | null> => {
    if (typeof window === 'undefined') return null;
    const url = new URL(`/api/db/${table}`, window.location.origin);
    url.searchParams.append('id', id);

    const data = await safeFetchJson<T[]>(url.toString(), undefined, []);
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  },
  
  insert: async (table: string, payload: any) => {
    if (typeof window === 'undefined') return payload;
    try {
      const res = await fetch(`/api/db/${table}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const err = await res.json();
          throw new Error(err?.error || `Failed to insert into ${table}`);
        }
        return payload;
      }
      const json = await res.json();
      return json?.data ?? payload;
    } catch (e: any) {
      console.warn(`[sqliteClient] insert error on ${table}:`, e?.message || e);
      return payload;
    }
  },

  update: async (table: string, id: string, payload: any) => {
    if (typeof window === 'undefined') return payload;
    try {
      const url = new URL(`/api/db/${table}`, window.location.origin);
      url.searchParams.append('id', id);
      
      const res = await fetch(url.toString(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const err = await res.json();
          throw new Error(err?.error || `Failed to update ${table}`);
        }
        return payload;
      }
      const json = await res.json();
      return json?.data ?? payload;
    } catch (e: any) {
      console.warn(`[sqliteClient] update error on ${table}:`, e?.message || e);
      return payload;
    }
  },

  delete: async (table: string, id: string) => {
    if (typeof window === 'undefined') return true;
    try {
      const url = new URL(`/api/db/${table}`, window.location.origin);
      url.searchParams.append('id', id);
      
      const res = await fetch(url.toString(), {
        method: 'DELETE'
      });
      if (!res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const err = await res.json();
          throw new Error(err?.error || `Failed to delete from ${table}`);
        }
      }
      return true;
    } catch (e: any) {
      console.warn(`[sqliteClient] delete error on ${table}:`, e?.message || e);
      return false;
    }
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
