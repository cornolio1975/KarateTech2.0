import { NextResponse } from 'next/server';
import { localDb } from '@/db/sqlite/schema';

export async function GET(request: Request, context: { params: Promise<{ table: string }> }) {
  const { table } = await context.params;
  const { searchParams } = new URL(request.url);
  const tournamentId = searchParams.get('tournament_id');

  try {
    let query = `SELECT * FROM ${table}`;
    const queryParams: any[] = [];

    if (tournamentId) {
      query += ` WHERE tournament_id = ?`;
      queryParams.push(tournamentId);
    }

    const stmt = localDb.prepare(query);
    const rows = stmt.all(...queryParams);
    return NextResponse.json({ data: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ table: string }> }) {
  const { table } = await context.params;
  try {
    const body = await request.json();
    const keys = Object.keys(body);
    const values = Object.values(body);
    const placeholders = keys.map(() => '?').join(', ');

    const stmt = localDb.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`);
    const info = stmt.run(...values);

    return NextResponse.json({ data: { id: info.lastInsertRowid, ...body } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ table: string }> }) {
  const { table } = await context.params;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

  try {
    const body = await request.json();
    const keys = Object.keys(body);
    const values = Object.values(body);
    const setClause = keys.map(k => `${k} = ?`).join(', ');

    const stmt = localDb.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`);
    stmt.run(...values, id);

    return NextResponse.json({ data: { id, ...body } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ table: string }> }) {
  const { table } = await context.params;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

  try {
    const stmt = localDb.prepare(`DELETE FROM ${table} WHERE id = ?`);
    stmt.run(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
