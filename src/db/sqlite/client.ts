export const sqliteClient = {
  get: async (table: string, tournamentId?: string) => {
    const url = new URL(`/api/db/${table}`, window.location.origin);
    if (tournamentId) url.searchParams.append('tournament_id', tournamentId);
    
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(await res.text());
    const { data } = await res.json();
    return data;
  },
  
  insert: async (table: string, payload: any) => {
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
    const url = new URL(`/api/db/${table}`, window.location.origin);
    url.searchParams.append('id', id);
    
    const res = await fetch(url.toString(), {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(await res.text());
    return true;
  }
};
