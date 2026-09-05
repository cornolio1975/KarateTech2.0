import { NextResponse } from 'next/server';
import os from 'os';
import fs from 'fs';
import { localDb, getDbPath } from '@/db/sqlite/schema';

export async function GET() {
  try {
    // Collect local LAN IPv4 addresses
    const interfaces = os.networkInterfaces();
    const lanIps: string[] = [];

    for (const name of Object.keys(interfaces)) {
      const iface = interfaces[name];
      if (!iface) continue;
      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          lanIps.push(alias.address);
        }
      }
    }

    const dbPath = getDbPath();
    let dbSize = 0;
    try {
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        dbSize = stats.size;
      }
    } catch (e) {
      // Ignore stat error
    }

    // Read config from server_config table
    let serverConfig: Record<string, string> = {};
    try {
      const rows = localDb.prepare('SELECT key, value FROM server_config').all() as { key: string; value: string }[];
      for (const r of rows) {
        serverConfig[r.key] = r.value;
      }
    } catch (e) {
      // table might be empty
    }

    // Pending sync queue count
    let pendingSyncCount = 0;
    try {
      const res = localDb.prepare("SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'").get() as { count: number };
      pendingSyncCount = res ? res.count : 0;
    } catch (e) {
      // ignore
    }

    // Active PCs in last 2 minutes
    let activePcsCount = 0;
    try {
      const twoMinutesAgo = new Date(Date.now() - 120000).toISOString();
      const res = localDb.prepare("SELECT COUNT(*) as count FROM tournament_pcs WHERE last_heartbeat >= ?").get(twoMinutesAgo) as { count: number };
      activePcsCount = res ? res.count : 0;
    } catch (e) {
      // ignore
    }

    return NextResponse.json({
      status: 'online',
      serverName: serverConfig['server_name'] || 'KarateTech Local Server',
      port: process.env.PORT || 3000,
      lanIps,
      primaryLanIp: lanIps[0] || 'localhost',
      database: {
        path: dbPath,
        sizeBytes: dbSize,
        sizeFormatted: `${(dbSize / (1024 * 1024)).toFixed(2)} MB`,
        walMode: true
      },
      cloudSync: {
        enabled: serverConfig['cloud_sync_enabled'] !== 'false',
        autoSync: serverConfig['auto_sync'] !== 'false',
        pendingQueueCount: pendingSyncCount
      },
      connectedDevicesCount: activePcsCount,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
