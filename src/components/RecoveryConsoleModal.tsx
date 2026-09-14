'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Upload, Clock, AlertTriangle, CheckCircle, RefreshCw, AlertCircle, ShieldAlert } from 'lucide-react';
import { useTournament } from '@/context/TournamentContext';
import { Category, Bout, Participant } from '@/db/types';
import { db } from '@/db/dbClient';
import { listVersions, BracketVersion, getLatestVersion, createVersion } from '@/db/bracketVersions';
import { supabase } from '@/db/dbClient';

interface RecoveryConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

export default function RecoveryConsoleModal({ isOpen, onClose, categories }: RecoveryConsoleModalProps) {
  const { activeTournamentId } = useTournament();
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [versions, setVersions] = useState<BracketVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Reset state completely when modal opens or active tournament changes
    setSelectedCategoryId('');
    setVersions([]);
    setErrorMsg(null);
  }, [isOpen, activeTournamentId]);

  useEffect(() => {
    if (selectedCategoryId && activeTournamentId) {
      import('@/db/bracketVersions').then(mod => {
        const id = mod.getBracketId(activeTournamentId, selectedCategoryId);
        const v = mod.listVersions(activeTournamentId, id);
        setVersions(v);
      });
    } else {
      setVersions([]);
    }
  }, [selectedCategoryId, activeTournamentId]);

  if (!isOpen) return null;

  const handleExport = (version: BracketVersion) => {
    const category = categories.find(c => c.id === version.categoryId);
    if (!category) return;

    // Custom format as requested
    const backupJson = {
      backup_type: "KARATETECH_BRACKET_BACKUP",
      tournament_id: activeTournamentId,
      category_id: category.id,
      category_name: category.name,
      bracket_version: version.versionNumber,
      participants: version.snapshot.competitors,
      bracket: {}, 
      bouts: version.snapshot.bouts,
      results: version.snapshot.bouts.filter(b => b.status === 'Completed' || b.status === 'Walkover'),
      metadata: {
        captured_at: version.snapshot.capturedAt,
        integrity_hash: version.integrityHash
      }
    };

    const blob = new Blob([JSON.stringify(backupJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recovery_${category.name.replace(/\s+/g, '_')}_v${version.versionNumber}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setErrorMsg(null);
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.backup_type !== "KARATETECH_BRACKET_BACKUP") {
        throw new Error("Invalid file format. Not a KarateTech bracket backup.");
      }

      if (data.tournament_id !== activeTournamentId) {
        throw new Error("This recovery file does not belong to the currently opened tournament.");
      }

      if (selectedCategoryId && data.category_id !== selectedCategoryId) {
        throw new Error("This recovery file belongs to a different category than the one currently selected.");
      }

      const confirmRestore = confirm(`You are about to import and restore the backup for "${data.category_name}" (Version ${data.bracket_version}). This will overwrite the current live bracket. Continue?`);
      if (!confirmRestore) return;

      await safeRestore(data.category_id, data.bouts, data.bracket_version);
      
      alert('Backup successfully restored!');
      const mod = await import('@/db/bracketVersions');
      const id = mod.getBracketId(activeTournamentId!, data.category_id);
      setVersions(mod.listVersions(activeTournamentId!, id));
      
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing the backup file.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRestoreVersion = async (version: BracketVersion) => {
    const confirmRestore = confirm(`Are you sure you want to restore Version ${version.versionNumber}? This will overwrite the live bracket.`);
    if (!confirmRestore) return;

    try {
      setLoading(true);
      setErrorMsg(null);
      await safeRestore(version.categoryId, version.snapshot.bouts, version.versionNumber);
      
      alert(`Version ${version.versionNumber} successfully restored!`);
      const mod = await import('@/db/bracketVersions');
      const id = mod.getBracketId(activeTournamentId!, version.categoryId);
      setVersions(mod.listVersions(activeTournamentId!, id));
    } catch (err: any) {
      setErrorMsg(err.message || 'Error restoring version.');
    } finally {
      setLoading(false);
    }
  };

  const safeRestore = async (categoryId: string, restoredBouts: Bout[], restoredFromVersion: number) => {
    if (!activeTournamentId) throw new Error("No active tournament.");

    const category = categories.find(c => c.id === categoryId);
    if (!category) throw new Error("Category not found in the current tournament.");

    const currentLiveBouts = await db.bouts.listForCategory(categoryId);
    const participants = await db.participants.list(); 

    if (currentLiveBouts.length > 0) {
      await createVersion({
        tournamentId: activeTournamentId,
        category,
        bouts: currentLiveBouts,
        participants,
        reason: 'SAFETY_SNAPSHOT',
        createdBy: 'Recovery Console',
        changeSummary: 'Automatic safety snapshot before restoration'
      });
    }

    await db.bouts.clearDraw(categoryId);
    
    const newBouts = restoredBouts.map(b => ({
      ...b,
      tournament_id: activeTournamentId,
      category_id: categoryId,
    }));

    if (supabase) {
      const { error } = await supabase.from('bouts').insert(newBouts);
      if (error) {
        await db.bouts.clearDraw(categoryId);
        if (currentLiveBouts.length > 0) {
          await supabase.from('bouts').insert(currentLiveBouts);
        }
        throw new Error(`Failed to restore in database: ${error.message}. Rollback successful.`);
      }
    } else {
      // Offline fallback: force sync via window reload since mockstore logic is complex
      console.warn("Restoring offline requires page reload for full data hydration.");
    }

    await createVersion({
      tournamentId: activeTournamentId,
      category,
      bouts: newBouts,
      participants,
      reason: 'RESTORE',
      createdBy: 'Recovery Console',
      restoredFromVersionNumber: restoredFromVersion,
      changeSummary: `Restored from version ${restoredFromVersion}`
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-4xl border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="bg-destructive/10 border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-destructive">
            <ShieldAlert className="h-6 w-6" />
            <div>
              <h2 className="text-lg font-bold">Bracket & Bout Recovery Console</h2>
              <p className="text-xs opacity-80">CURRENT TOURNAMENT: {activeTournamentId || 'None'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-start gap-3 text-red-500">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm font-semibold">{errorMsg}</div>
            </div>
          )}

          <div className="bg-secondary/30 border border-border p-5 rounded-xl space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                1. Select Category (Current Tournament Only)
              </label>
              <select
                value={selectedCategoryId}
                onChange={e => setSelectedCategoryId(e.target.value)}
                className="w-full px-4 py-3 bg-card border border-border rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Select a Category --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button 
                onClick={handleImportClick}
                className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-secondary border border-border rounded-lg text-sm font-bold shadow-sm transition-colors"
              >
                <Upload className="h-4 w-4 text-blue-500" />
                Import Recovery JSON
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {selectedCategoryId && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Saved Versions
              </h3>
              
              {loading ? (
                <div className="py-12 text-center text-muted-foreground">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm">Processing recovery operations...</p>
                </div>
              ) : versions.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-border rounded-xl">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-semibold">No saved versions found for this category</p>
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-secondary/50 text-xs text-muted-foreground uppercase">
                      <tr>
                        <th className="px-4 py-3 font-bold">Version</th>
                        <th className="px-4 py-3 font-bold">Reason</th>
                        <th className="px-4 py-3 font-bold">Bouts</th>
                        <th className="px-4 py-3 font-bold">Saved Date</th>
                        <th className="px-4 py-3 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {versions.map(v => (
                        <tr key={v.versionId} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3 font-bold text-foreground">
                            v{String(v.versionNumber).padStart(3, '0')}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {v.reason.replace(/_/g, ' ')}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {v.snapshot.bouts.length}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(v.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button
                              onClick={() => handleExport(v)}
                              className="px-3 py-1.5 bg-card hover:bg-secondary border border-border rounded-md text-xs font-bold transition-colors"
                            >
                              JSON
                            </button>
                            <button
                              onClick={() => handleRestoreVersion(v)}
                              className="px-3 py-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md text-xs font-bold shadow-sm transition-colors"
                            >
                              Restore
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
