import { NextResponse } from 'next/server';
import { localDb } from '@/db/sqlite/schema';

const ALLOWED_TABLES = new Set([
  'tournaments',
  'clubs',
  'coaches',
  'categories',
  'participants',
  'teams',
  'team_members',
  'participant_categories',
  'bouts',
  'officials',
  'payments',
  'medical_records',
  'documents',
  'activity_logs',
  'audit_logs',
  'tournament_pcs',
  'category_locks',
  'match_locks',
  'sync_queue',
  'server_config',
  'event_log'
]);

function formatValueForSql(val: any): any {
  if (val === null || val === undefined) return null;
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (typeof val === 'object') return JSON.stringify(val);
  return val;
}

export async function GET(request: Request, context: { params: Promise<{ table: string }> }) {
  const { table } = await context.params;
  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: `Invalid or unauthorized table: ${table}` }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const whereClauses: string[] = [];
  const queryParams: any[] = [];

  searchParams.forEach((val, key) => {
    // Only allow alphanumeric / underscore keys for safety
    if (/^[a-zA-Z0-9_]+$/.test(key)) {
      whereClauses.push(`${key} = ?`);
      queryParams.push(val);
    }
  });

  try {
    let query = `SELECT * FROM ${table}`;
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
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
  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: `Invalid or unauthorized table: ${table}` }, { status: 400 });
  }

  try {
    const rawBody = await request.json();
    const isBatch = Array.isArray(rawBody);
    const items = isBatch ? rawBody : [rawBody];

    if (items.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const results: any[] = [];
    const insertTransaction = localDb.transaction((records: any[]) => {
      for (const item of records) {
        const keys = Object.keys(item).filter(k => /^[a-zA-Z0-9_]+$/.test(k));
        const values = keys.map(k => formatValueForSql(item[k]));
        const placeholders = keys.map(() => '?').join(', ');

        const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
        const stmt = localDb.prepare(sql);
        const info = stmt.run(...values);
        results.push({ id: item.id || info.lastInsertRowid, ...item });
      }
    });

    insertTransaction(items);

    return NextResponse.json({ data: isBatch ? results : results[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ table: string }> }) {
  const { table } = await context.params;
  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: `Invalid or unauthorized table: ${table}` }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Missing ID parameter' }, { status: 400 });

  try {
    const body = await request.json();
    const keys = Object.keys(body).filter(k => /^[a-zA-Z0-9_]+$/.test(k) && k !== 'id');
    if (keys.length === 0) {
      return NextResponse.json({ data: { id, ...body } });
    }

    const values = keys.map(k => formatValueForSql(body[k]));
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
  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: `Invalid or unauthorized table: ${table}` }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Missing ID parameter' }, { status: 400 });

  try {
    const stmt = localDb.prepare(`DELETE FROM ${table} WHERE id = ?`);
    stmt.run(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
