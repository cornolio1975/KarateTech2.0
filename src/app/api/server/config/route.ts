import { NextResponse } from 'next/server';
import { localDb } from '@/db/sqlite/schema';

export async function GET() {
  try {
    const rows = localDb.prepare('SELECT key, value, updated_at FROM server_config').all() as { key: string; value: string; updated_at: string }[];
    const config: Record<string, string> = {};
    for (const r of rows) {
      config[r.key] = r.value;
    }
    return NextResponse.json({ data: config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const updates = await request.json();
    const stmt = localDb.prepare(`
      INSERT INTO server_config (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);

    const updateTx = localDb.transaction((configs: Record<string, any>) => {
      for (const [key, value] of Object.entries(configs)) {
        stmt.run(key, String(value));
      }
    });

    updateTx(updates);
    return NextResponse.json({ success: true, updated: updates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
