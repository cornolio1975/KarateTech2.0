'use client';

import React, { useMemo, useState } from 'react';
import {
  BracketVersion,
  buildPackage,
  compareVersions,
  verifyVersion,
} from '@/db/bracketVersions';
import { History, Download, RotateCcw, ShieldCheck, ShieldAlert, X, GitCompare } from 'lucide-react';

interface Props {
  versions: BracketVersion[];
  categoryName: string;
  tournamentName: string;
  canModify: boolean;
  onRestore: (version: BracketVersion) => Promise<void>;
  onClose: () => void;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

const safe = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');

export const BracketVersionHistory: React.FC<Props> = ({
  versions,
  categoryName,
  tournamentName,
  canModify,
  onRestore,
  onClose,
}) => {
  const [compareWith, setCompareWith] = useState<number | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<BracketVersion | null>(null);
  const [integrity, setIntegrity] = useState<Record<string, boolean>>({});

  const ordered = useMemo(() => [...versions].sort((a, b) => b.versionNumber - a.versionNumber), [versions]);
  const current = ordered[0] ?? null;

  const diff = useMemo(() => {
    if (compareWith === null || !current) return null;
    const other = versions.find(v => v.versionNumber === compareWith);
    return other ? compareVersions(other, current) : null;
  }, [compareWith, current, versions]);

  const check = async (v: BracketVersion) => {
    const result = await verifyVersion(v);
    setIntegrity(prev => ({ ...prev, [v.versionId]: result.valid }));
  };

  const exportVersion = (v: BracketVersion) => {
    const pkg = buildPackage(v);
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = [
      'KarateTech',
      safe(tournamentName || 'Tournament'),
      safe(categoryName),
      v.bracketId,
      `Version-${String(v.versionNumber).padStart(3, '0')}`,
      new Date(v.createdAt).toISOString().slice(0, 10),
    ].join('_') + '.karatebracket';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border border-border bg-card rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
            <History className="h-4 w-4" /> Bracket Version History
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {categoryName} • {versions.length} version{versions.length === 1 ? '' : 's'}
            {current ? ` • current: Version ${current.versionNumber}` : ''}
          </p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-secondary rounded cursor-pointer">
          <X className="h-4 w-4" />
        </button>
      </div>

      {versions.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No versions recorded yet. A version is created automatically on the next bracket change.
        </p>
      )}

      {diff && (
        <div className="border border-border rounded-lg p-3 text-xs bg-secondary/30 space-y-1">
          <div className="font-black uppercase">Version {compareWith} → {current?.versionNumber}</div>
          {diff.changedSlots.length === 0 && diff.changedResults.length === 0 && (
            <div className="text-muted-foreground">No athlete or result differences.</div>
          )}
          {diff.changedSlots.map((c, i) => (
            <div key={i}>
              {c.boutCode} {c.position}: <span className="line-through text-muted-foreground">{c.from ?? 'EMPTY'}</span>{' '}
              → <span className="font-bold">{c.to ?? 'EMPTY'}</span>
            </div>
          ))}
          {diff.changedResults.map((c, i) => (
            <div key={`r${i}`}>{c.boutCode} winner: {c.from ?? '—'} → <span className="font-bold">{c.to ?? '—'}</span></div>
          ))}
        </div>
      )}

      <div className="space-y-2 max-h-80 overflow-auto">
        {ordered.map(v => {
          const verified = integrity[v.versionId];
          return (
            <div key={v.versionId} className="border border-border rounded-lg p-3 text-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-black">
                    Version {v.versionNumber}
                    {v.versionNumber === current?.versionNumber && (
                      <span className="ml-2 text-primary">• Current</span>
                    )}
                    {v.status === 'CORRUPTED' && <span className="ml-2 text-red-500">• Corrupted</span>}
                  </div>
                  <div className="text-muted-foreground">{fmt(v.createdAt)} • {v.createdBy}</div>
                  <div className="text-muted-foreground">Reason: {v.reason}</div>
                  {v.changeSummary && <div className="mt-0.5">{v.changeSummary}</div>}
                  {v.restoredFromVersionNumber !== undefined && (
                    <div className="text-muted-foreground">Restored from Version {v.restoredFromVersionNumber}</div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                    {v.integrityHash.slice(0, 16)}…
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-end shrink-0">
                  <button onClick={() => check(v)} className="px-2 py-1.5 border border-border rounded hover:bg-secondary cursor-pointer flex items-center gap-1">
                    {verified === undefined ? <ShieldCheck className="h-3.5 w-3.5" />
                      : verified ? <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                      : <ShieldAlert className="h-3.5 w-3.5 text-red-500" />}
                    Verify
                  </button>
                  <button
                    onClick={() => setCompareWith(v.versionNumber)}
                    disabled={v.versionNumber === current?.versionNumber}
                    className="px-2 py-1.5 border border-border rounded hover:bg-secondary cursor-pointer disabled:opacity-40 flex items-center gap-1"
                  >
                    <GitCompare className="h-3.5 w-3.5" /> Compare
                  </button>
                  <button onClick={() => exportVersion(v)} className="px-2 py-1.5 border border-border rounded hover:bg-secondary cursor-pointer flex items-center gap-1">
                    <Download className="h-3.5 w-3.5" /> Export
                  </button>
                  {canModify && v.versionNumber !== current?.versionNumber && (
                    <button onClick={() => setConfirmRestore(v)} className="px-2 py-1.5 border border-amber-500/40 text-amber-600 rounded hover:bg-amber-500/10 cursor-pointer flex items-center gap-1">
                      <RotateCcw className="h-3.5 w-3.5" /> Restore
                    </button>
                  )}
                </div>
              </div>
              {verified === false && (
                <div className="mt-2 text-red-500 font-bold">
                  Integrity check failed — this version will not be restored automatically.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {confirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-5 space-y-4">
            <h4 className="text-sm font-black uppercase">Restore Bracket</h4>
            <div className="text-xs space-y-1">
              <div>Current Version: <span className="font-bold">{current?.versionNumber}</span></div>
              <div>Selected Version: <span className="font-bold">{confirmRestore.versionNumber}</span></div>
              <div>Created: {fmt(confirmRestore.createdAt)}</div>
              <div>Created By: {confirmRestore.createdBy}</div>
              <div>Reason: {confirmRestore.reason}</div>
            </div>
            <p className="text-xs text-muted-foreground">
              Version {current?.versionNumber} is kept. Restoring creates Version {(current?.versionNumber ?? 0) + 1}.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmRestore(null)} className="px-4 py-2 border border-border rounded-lg text-xs font-bold hover:bg-secondary cursor-pointer">
                Cancel
              </button>
              <button
                onClick={async () => {
                  const target = confirmRestore;
                  setConfirmRestore(null);
                  await onRestore(target);
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold cursor-pointer"
              >
                Restore as New Version
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
