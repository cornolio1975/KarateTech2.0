import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Get the user data path for persistent storage, or use a local file for dev
const getDbPath = () => {
  let dbDir = process.cwd();
  
  // If running in packaged electron app, use APPDATA
  if (process.env.APPDATA || (process.platform === 'win32' && process.env.USERPROFILE)) {
    let appData = process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming');
    dbDir = path.join(appData, 'KarateTech');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  return path.join(dbDir, 'karatetech.sqlite');
};

const dbPath = getDbPath();
export const localDb = new Database(dbPath, { verbose: console.log });

// Initialize database schema
export const initDb = () => {
  localDb.exec(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT,
      location TEXT,
      status TEXT DEFAULT 'Draft',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      error_message TEXT
    );
  `);
};
