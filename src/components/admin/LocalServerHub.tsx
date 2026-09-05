'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Server, HardDrive, Wifi, WifiOff, Cloud, RefreshCw, 
  ShieldAlert, Laptop, Eye, Unlock, AlertTriangle, 
  CheckCircle2, Copy, Download, History, Database, Sliders
} from 'lucide-react';
import { TournamentPC } from '@/db/types';

interface LocalServerHubProps {
  pcs: TournamentPC[];
  onTakeoverTatami: (tatamiNum: 1 | 2) => void;
  onDisconnectTatami: (tatamiNum: 1 | 2) => void;
  onReleaseLock: (categoryId: string) => Promise<void>;
  onTriggerSync: () => Promise<void>;
  isSyncing: boolean;
  pendingSyncCount: number;
}

export default function LocalServerHub({
  pcs,
  onTakeoverTatami,
  onDisconnectTatami,
  onReleaseLock,
  onTriggerSync,
  isSyncing,
  pendingSyncCount
}: LocalServerHubProps) {
  const [serverStatus, setServerStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Backup state
  const [backups, setBackups] = useState<any[]>([]);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Event log state
  const [eventLogs, setEventLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Config state
  const [serverConfig, setServerConfig] = useState<Record<string, string>>({
    server_name: 'KarateTech Arena Server',
    port: '3000',
    cloud_sync_enabled: 'true',
    auto_sync: 'true'
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Sub-tab state
  const [subTab, setSubTab] = useState<'OVERVIEW' | 'DEVICES' | 'BACKUPS' | 'CONFIG' | 'EVENT_LOG'>('OVERVIEW');

  // Load server status
  const fetchStatus = useCallback(async () => {
    try {
      setLoadingStatus(true);
      const res = await fetch('/api/server/status');
      if (res.ok) {
        const data = await res.json();
        setServerStatus(data);
      }
    } catch (e) {
      console.warn('Could not fetch server status:', e);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  // Load backups list
  const fetchBackups = useCallback(async () => {
    try {
      const res = await fetch('/api/server/backup');
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      }
    } catch (e) {
      console.warn('Could not fetch backups:', e);
    }
  }, []);

  // Load event logs
  const fetchLogs = useCallback(async () => {
    try {
      setLoadingLogs(true);
      const res = await fetch('/api/server/event-log?limit=50');
      if (res.ok) {
        const data = await res.json();
        setEventLogs(data.data || []);
      }
    } catch (e) {
      console.warn('Could not fetch event logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  // Load server config
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/server/config');
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setServerConfig(prev => ({ ...prev, ...data.data }));
        }
      }
    } catch (e) {
      console.warn('Could not fetch server config:', e);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchBackups();
    fetchConfig();
    fetchLogs();
  }, [fetchStatus, fetchBackups, fetchConfig, fetchLogs]);

  // Copy IP to clipboard
  const handleCopyIp = (ip: string) => {
    const fullUrl = `http://${ip}:${serverStatus?.port || 3000}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  // Create Backup
  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    setBackupMessage(null);
    try {
      const res = await fetch('/api/server/backup?action=create');
      const data = await res.json();
      if (res.ok) {
        setBackupMessage({ type: 'success', text: `Backup created: ${data.filename}` });
        fetchBackups();
      } else {
        setBackupMessage({ type: 'error', text: data.error || 'Failed to create backup' });
      }
    } catch (e: any) {
      setBackupMessage({ type: 'error', text: e.message });
    } finally {
      setCreatingBackup(false);
    }
  };

  // Restore Backup
  const handleRestoreBackup = async (filename: string) => {
    if (!window.confirm(`RESTORE CONFIRMATION:\nAre you sure you want to restore "${filename}"?\n\nA safety backup of your current database will be created automatically.`)) {
      return;
    }

    setRestoringBackup(filename);
    setBackupMessage(null);
    try {
      const res = await fetch('/api/server/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      const data = await res.json();
      if (res.ok) {
        setBackupMessage({ type: 'success', text: `Database restored from ${filename} successfully! Reloading...` });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setBackupMessage({ type: 'error', text: data.error || 'Restore failed' });
      }
    } catch (e: any) {
      setBackupMessage({ type: 'error', text: e.message });
    } finally {
      setRestoringBackup(null);
    }
  };

  // Save Server Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch('/api/server/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverConfig)
      });
      if (res.ok) {
        alert('Server configuration updated.');
        fetchStatus();
      }
    } catch (e: any) {
      alert(`Failed to save config: ${e.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Server className="w-6 h-6 text-indigo-400" />
          <div>
            <h2 className="text-lg font-black text-foreground">KarateTech 2.0 Local Server Hub</h2>
            <p className="text-xs text-muted-foreground">Offline SQLite Database • LAN Device Sync • Cloud Bridge</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-xl border border-border">
          <button
            onClick={() => setSubTab('OVERVIEW')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === 'OVERVIEW' ? 'bg-indigo-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Server Overview
          </button>
          <button
            onClick={() => setSubTab('DEVICES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === 'DEVICES' ? 'bg-indigo-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Connected Devices ({pcs.length})
          </button>
          <button
            onClick={() => setSubTab('BACKUPS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === 'BACKUPS' ? 'bg-indigo-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Backups ({backups.length})
          </button>
          <button
            onClick={() => setSubTab('CONFIG')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === 'CONFIG' ? 'bg-indigo-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Configuration
          </button>
          <button
            onClick={() => { setSubTab('EVENT_LOG'); fetchLogs(); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === 'EVENT_LOG' ? 'bg-indigo-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Event Log
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: SERVER OVERVIEW */}
      {subTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* LAN Connection Banner */}
          <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/60 border border-indigo-500/30 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="font-extrabold text-foreground text-sm uppercase tracking-wide">
                    Local Server Active & Synchronizing
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Connect Tatami scoring terminals and spectator TVs to this server using your Local Area Network (LAN).
                </p>
              </div>

              {serverStatus?.lanIps && serverStatus.lanIps.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {serverStatus.lanIps.map((ip: string) => (
                    <div key={ip} className="flex items-center gap-2 bg-secondary/80 border border-border px-3 py-1.5 rounded-xl text-xs font-mono">
                      <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-bold text-foreground">http://{ip}:{serverStatus.port}</span>
                      <button
                        onClick={() => handleCopyIp(ip)}
                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer transition"
                        title="Copy LAN connection URL"
                      >
                        {copiedIp === ip ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Local Database</span>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-black text-foreground">SQLite WAL</h4>
                  <span className="text-xs text-emerald-400 font-semibold">{serverStatus?.database?.sizeFormatted || 'Active'}</span>
                </div>
                <HardDrive className="w-8 h-8 text-indigo-400/50" />
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Connected Terminals</span>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-black text-foreground">{pcs.length} Devices</h4>
                  <span className="text-xs text-indigo-400 font-semibold">Admin, Tatamis, Displays</span>
                </div>
                <Laptop className="w-8 h-8 text-indigo-400/50" />
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pending Cloud Sync</span>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-black text-foreground">{pendingSyncCount} Items</h4>
                  <span className={`text-xs font-semibold ${pendingSyncCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {pendingSyncCount > 0 ? 'Queued for Cloud Push' : 'Fully Synchronized'}
                  </span>
                </div>
                <Cloud className="w-8 h-8 text-indigo-400/50" />
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tournament Continuity</span>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-black text-emerald-400">100% Offline</h4>
                  <span className="text-xs text-muted-foreground font-semibold">Protected from network drops</span>
                </div>
                <CheckCircle2 className="w-8 h-8 text-emerald-400/50" />
              </div>
            </div>
          </div>

          {/* Sync Trigger Bar */}
          <div className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-foreground">Cloud Sync & Local Backup</h4>
              <p className="text-xs text-muted-foreground">
                All tournament data is saved instantly to SQLite. Click below to synchronize pending changes with Supabase.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateBackup}
                disabled={creatingBackup}
                className="flex items-center gap-1.5 px-4 py-2 bg-secondary hover:bg-secondary/80 border border-border text-foreground rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{creatingBackup ? 'Creating...' : 'Snapshot Backup'}</span>
              </button>
              <button
                onClick={onTriggerSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Cloud Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CONNECTED DEVICES (SECTIONS 23 & 24) */}
      {subTab === 'DEVICES' && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-extrabold text-foreground text-sm">Connected Devices & Terminals</h3>
              <p className="text-xs text-muted-foreground">Live telemetry of Tatami controllers, display screens, and admin consoles.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/50 text-muted-foreground uppercase text-[10px] font-extrabold tracking-wider border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Device Name</th>
                  <th className="py-2.5 px-3">Role / Tatami</th>
                  <th className="py-2.5 px-3">Identifier</th>
                  <th className="py-2.5 px-3">Current Bout / Category</th>
                  <th className="py-2.5 px-3">Connection</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {pcs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      No devices registered yet. Open Tatami Console or Display screen to connect.
                    </td>
                  </tr>
                ) : (
                  pcs.map((pc) => {
                    const isTatami1 = pc.tatami?.toLowerCase().includes('1');
                    const isTatami2 = pc.tatami?.toLowerCase().includes('2');
                    const tatamiNum = isTatami1 ? 1 : isTatami2 ? 2 : null;

                    return (
                      <tr key={pc.id} className="hover:bg-secondary/30 transition">
                        <td className="py-3 px-3 font-bold text-foreground">
                          {pc.pc_name || pc.pc_identifier}
                          {pc.is_admin_controlled ? (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-red-500/20 text-red-400 font-black uppercase">
                              Admin Controlled
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-indigo-400">{pc.tatami || 'Scoreboard Console'}</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-muted-foreground text-[11px]">
                          {pc.pc_identifier}
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-foreground">
                            {pc.current_match_id ? `Match: ${pc.current_match_id}` : pc.current_category_id ? `Category: ${pc.current_category_id}` : 'Idle'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="font-bold text-emerald-400 uppercase text-[10px]">Online</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {tatamiNum && (
                              <>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Take over control of Tatami ${tatamiNum}?\nThis PC will assume direct control over the match console.`)) {
                                      onTakeoverTatami(tatamiNum);
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold cursor-pointer transition shadow-2xs"
                                  title="Assume admin control of this Tatami"
                                >
                                  Take Control
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Disconnect Tatami ${tatamiNum} from tournament network?`)) {
                                      onDisconnectTatami(tatamiNum);
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-[10px] font-bold cursor-pointer transition"
                                  title="Disconnect terminal"
                                >
                                  Disconnect
                                </button>
                              </>
                            )}
                            {pc.current_category_id && (
                              <button
                                onClick={() => onReleaseLock(pc.current_category_id!)}
                                className="px-2 py-1 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground rounded-lg text-[10px] font-bold cursor-pointer border border-border"
                                title="Release active match lock"
                              >
                                Release
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: BACKUPS (SECTIONS 21 & 22) */}
      {subTab === 'BACKUPS' && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-extrabold text-foreground text-sm">Database Backups & Restore</h3>
              <p className="text-xs text-muted-foreground">
                Automatic and manual SQLite snapshots with full crash recovery.
              </p>
            </div>
            <button
              onClick={handleCreateBackup}
              disabled={creatingBackup}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{creatingBackup ? 'Creating Snapshot...' : 'Create Backup Now'}</span>
            </button>
          </div>

          {backupMessage && (
            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              backupMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{backupMessage.text}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/50 text-muted-foreground uppercase text-[10px] font-extrabold tracking-wider border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Backup File</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Created At</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {backups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      No backups found. Click &quot;Create Backup Now&quot; to snapshot your tournament database.
                    </td>
                  </tr>
                ) : (
                  backups.map((b) => (
                    <tr key={b.filename} className="hover:bg-secondary/30 transition">
                      <td className="py-3 px-3 font-mono font-bold text-foreground">
                        {b.filename}
                      </td>
                      <td className="py-3 px-3 font-semibold text-muted-foreground">
                        {b.sizeFormatted}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {new Date(b.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleRestoreBackup(b.filename)}
                          disabled={restoringBackup === b.filename}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer transition shadow-2xs"
                        >
                          {restoringBackup === b.filename ? 'Restoring...' : 'Restore'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: CONFIGURATION (SECTION 26) */}
      {subTab === 'CONFIG' && (
        <form onSubmit={handleSaveConfig} className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4 max-w-2xl">
          <div className="border-b border-border pb-3">
            <h3 className="font-extrabold text-foreground text-sm">Local Server Settings</h3>
            <p className="text-xs text-muted-foreground">Configure the host machine, networking, and sync options.</p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-foreground mb-1">Server Name</label>
              <input
                type="text"
                value={serverConfig.server_name || ''}
                onChange={(e) => setServerConfig(prev => ({ ...prev, server_name: e.target.value }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-foreground font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-foreground mb-1">Server Port</label>
                <input
                  type="text"
                  value={serverConfig.port || '3000'}
                  onChange={(e) => setServerConfig(prev => ({ ...prev, port: e.target.value }))}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-foreground font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">Tournament Mode</label>
                <select
                  value={serverConfig.mode || 'offline_first'}
                  onChange={(e) => setServerConfig(prev => ({ ...prev, mode: e.target.value }))}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-foreground font-semibold"
                >
                  <option value="offline_first">Offline First (Recommended)</option>
                  <option value="cloud_preferred">Cloud Preferred</option>
                  <option value="isolated_offline">Strictly Isolated Offline</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-foreground">
                <input
                  type="checkbox"
                  checked={serverConfig.cloud_sync_enabled !== 'false'}
                  onChange={(e) => setServerConfig(prev => ({ ...prev, cloud_sync_enabled: e.target.checked ? 'true' : 'false' }))}
                  className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                />
                <span>Enable Background Cloud Sync Engine</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-foreground">
                <input
                  type="checkbox"
                  checked={serverConfig.auto_sync !== 'false'}
                  onChange={(e) => setServerConfig(prev => ({ ...prev, auto_sync: e.target.checked ? 'true' : 'false' }))}
                  className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                />
                <span>Auto-sync when Internet connection is restored</span>
              </label>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={savingConfig}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              >
                {savingConfig ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* SUB-TAB 5: EVENT LOG (SECTION 35) */}
      {subTab === 'EVENT_LOG' && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-extrabold text-foreground text-sm">Local Audit & Event Log</h3>
              <p className="text-xs text-muted-foreground">Immutable audit trail of matches, scores, locks, and system actions.</p>
            </div>
            <button
              onClick={fetchLogs}
              disabled={loadingLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 border border-border text-foreground rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[450px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/50 text-muted-foreground uppercase text-[10px] font-extrabold tracking-wider border-b border-border sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">User / Role</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {eventLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      No logged events yet.
                    </td>
                  </tr>
                ) : (
                  eventLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-secondary/30 transition">
                      <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-foreground">{log.user || 'System'}</span>
                        <span className="text-[10px] text-muted-foreground ml-1.5 font-semibold">({log.role})</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-indigo-400 font-bold">{log.action}</span>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground truncate max-w-md">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
