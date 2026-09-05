import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { localDb, getDbPath } from '@/db/sqlite/schema';

const getBackupDir = () => {
  const dbDir = path.dirname(getDbPath());
  const backupDir = path.join(dbDir, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
};

// GET /api/server/backup - Lists backups or triggers a new backup
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const backupDir = getBackupDir();
    const currentDbPath = getDbPath();

    if (action === 'create') {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `karatetech-backup-${timestamp}.sqlite`;
      const backupFilePath = path.join(backupDir, backupFilename);

      // Perform a safe SQLite online backup using vacuum into
      localDb.prepare(`VACUUM INTO ?`).run(backupFilePath);

      // Log event
      try {
        localDb.prepare(`
          INSERT INTO event_log (id, action, details)
          VALUES (?, ?, ?)
        `).run(`evt-${Date.now()}`, 'DATABASE_BACKUP_CREATED', `Backup file: ${backupFilename}`);
      } catch (e) {
        // ignore
      }

      return NextResponse.json({
        success: true,
        message: 'Database backup created successfully',
        filename: backupFilename,
        path: backupFilePath
      });
    }

    // List backups
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.sqlite'))
      .map(f => {
        const fullPath = path.join(backupDir, f);
        const stats = fs.statSync(fullPath);
        return {
          filename: f,
          sizeBytes: stats.size,
          sizeFormatted: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
          createdAt: stats.birthtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      backups: files,
      count: files.length,
      backupDir
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/server/backup - Restore database from a selected backup file
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filename } = body;

    if (!filename) {
      return NextResponse.json({ error: 'Missing backup filename' }, { status: 400 });
    }

    const backupDir = getBackupDir();
    const backupFilePath = path.join(backupDir, path.basename(filename));

    if (!fs.existsSync(backupFilePath)) {
      return NextResponse.json({ error: 'Backup file not found' }, { status: 404 });
    }

    const currentDbPath = getDbPath();

    // To restore safely, create a pre-restore safety copy first
    const safetyCopy = path.join(backupDir, `pre-restore-safety-${Date.now()}.sqlite`);
    try {
      localDb.prepare(`VACUUM INTO ?`).run(safetyCopy);
    } catch (e) {
      // ignore
    }

    // Replace current database: copy backup over current file
    // In WAL mode, checkpoint first
    localDb.pragma('wal_checkpoint(TRUNCATE)');
    fs.copyFileSync(backupFilePath, currentDbPath);

    // Log event
    try {
      localDb.prepare(`
        INSERT INTO event_log (id, action, details)
        VALUES (?, ?, ?)
      `).run(`evt-${Date.now()}`, 'DATABASE_RESTORED', `Restored from: ${filename}`);
    } catch (e) {
      // ignore
    }

    return NextResponse.json({
      success: true,
      message: `Database restored from ${filename} successfully. Refreshing connection.`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
