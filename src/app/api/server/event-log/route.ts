import { NextResponse } from 'next/server';
import { localDb } from '@/db/sqlite/schema';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournament_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);

    let query = `SELECT * FROM event_log`;
    const params: any[] = [];

    if (tournamentId) {
      query += ` WHERE tournament_id = ?`;
      params.push(tournamentId);
    }

    query += ` ORDER BY timestamp DESC LIMIT ?`;
    params.push(limit);

    const stmt = localDb.prepare(query);
    const logs = stmt.all(...params);

    return NextResponse.json({ data: logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user, role, action, tournament_id, match_id, details } = body;

    if (!action) {
      return NextResponse.json({ error: 'Missing required field: action' }, { status: 400 });
    }

    const id = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const stmt = localDb.prepare(`
      INSERT INTO event_log (id, user, role, action, tournament_id, match_id, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      id,
      user || 'System',
      role || 'Operator',
      action,
      tournament_id || null,
      match_id || null,
      typeof details === 'object' ? JSON.stringify(details) : (details || '')
    );

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
