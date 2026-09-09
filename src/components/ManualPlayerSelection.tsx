'use client';

import React, { useMemo, useState } from 'react';
import { Bout, Participant, Club } from '@/db/types';
import { AlertTriangle, Search, X, Users, Undo2, Check } from 'lucide-react';

export type SlotPosition = 'AKA' | 'AO';

export interface ManualReplacement {
  boutId: string;
  position: SlotPosition;
  oldPlayerId: string | null;
  newPlayerId: string;
}

interface Props {
  categoryName: string;
  categoryId: string;
  /** Bouts belonging to the selected category only. */
  categoryBouts: Bout[];
  /** Participants already scoped to the current tournament + category. */
  categoryParticipants: Participant[];
  clubs: Club[];
  canModify: boolean;
  lastChange: ManualReplacement | null;
  onApply: (change: ManualReplacement, opts: { hadResult: boolean }) => Promise<void>;
  onUndo: () => Promise<void>;
  onClose: () => void;
}

const boutCode = (b: Bout) => `R${b.round_no}B${b.bout_no}`;

export const ManualPlayerSelection: React.FC<Props> = ({
  categoryName,
  categoryId,
  categoryBouts,
  categoryParticipants,
  clubs,
  canModify,
  lastChange,
  onApply,
  onUndo,
  onClose,
}) => {
  const [target, setTarget] = useState<{ bout: Bout; position: SlotPosition } | null>(null);
  const [search, setSearch] = useState('');
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  // Round 1 holds the actual draw assignments; later rounds are advancement-derived.
  const editableBouts = useMemo(
    () => categoryBouts.filter(b => b.round_no === 1).sort((a, b) => a.bout_no - b.bout_no),
    [categoryBouts]
  );

  const nameOf = (id: string | null) =>
    id ? categoryParticipants.find(p => p.id === id)?.full_name ?? 'Unknown Athlete' : null;

  const clubOf = (p: Participant) => clubs.find(c => c.id === p.club_id)?.name ?? '';

  // Where each athlete currently sits, used to block silent duplicates.
  const assignmentIndex = useMemo(() => {
    const map = new Map<string, string>();
    categoryBouts.forEach(b => {
      if (b.participant_a_id) map.set(b.participant_a_id, `${boutCode(b)} — AKA`);
      if (b.participant_b_id) map.set(b.participant_b_id, `${boutCode(b)} — AO`);
    });
    return map;
  }, [categoryBouts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categoryParticipants;
    return categoryParticipants.filter(p =>
      [p.full_name, p.registration_no, p.id, clubOf(p)]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q))
    );
  }, [search, categoryParticipants, clubs]);

  const openSlot = (bout: Bout, position: SlotPosition) => {
    if (!canModify) return;
    setTarget({ bout, position });
    setChosenId(null);
    setSearch('');
    setConfirming(false);
  };

  const currentId = target
    ? target.position === 'AKA'
      ? target.bout.participant_a_id
      : target.bout.participant_b_id
    : null;

  const opponentId = target
    ? target.position === 'AKA'
      ? target.bout.participant_b_id
      : target.bout.participant_a_id
    : null;

  const boutHasResult = !!target && (!!target.bout.winner_id || target.bout.status === 'Completed');

  const conflict = chosenId && chosenId !== currentId ? assignmentIndex.get(chosenId) : undefined;
  const isOpponent = !!chosenId && chosenId === opponentId;

  const canConfirm = !!chosenId && chosenId !== currentId && !conflict && !isOpponent;

  const apply = async () => {
    if (!target || !chosenId || !canConfirm) return;
    setSaving(true);
    try {
      await onApply(
        { boutId: target.bout.id, position: target.position, oldPlayerId: currentId, newPlayerId: chosenId },
        { hadResult: boutHasResult }
      );
      setTarget(null);
      setChosenId(null);
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-amber-500/40 bg-amber-500/5 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            Manual Player Selection Mode
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Select a player name below to replace that player. Only the chosen position changes — the bracket is not regenerated.
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Category: <span className="font-bold text-foreground">{categoryName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lastChange && (
            <button
              onClick={onUndo}
              className="px-3 py-2 border border-border rounded-lg text-xs font-bold hover:bg-secondary transition cursor-pointer flex items-center gap-1.5"
              title="Revert the last manual replacement"
            >
              <Undo2 className="h-4 w-4" />
              Undo Last Change
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 py-2 border border-border rounded-lg text-xs font-bold hover:bg-secondary transition cursor-pointer flex items-center gap-1.5"
          >
            <X className="h-4 w-4" />
            Exit Manual Selection
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {editableBouts.map(bout => {
          const slots: { position: SlotPosition; id: string | null }[] = [
            { position: 'AKA', id: bout.participant_a_id },
            { position: 'AO', id: bout.participant_b_id },
          ];
          return (
            <div key={bout.id} className="border border-border rounded-lg bg-card p-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">
                {boutCode(bout)}
                {(bout.winner_id || bout.status === 'Completed') && (
                  <span className="ml-2 text-amber-600">• has result</span>
                )}
              </div>
              <div className="space-y-1.5">
                {slots.map(slot => {
                  const label = nameOf(slot.id);
                  const isBye = !slot.id && bout.status === 'Walkover';
                  const changed =
                    lastChange?.boutId === bout.id && lastChange.position === slot.position;
                  return (
                    <button
                      key={slot.position}
                      onClick={() => openSlot(bout, slot.position)}
                      disabled={!canModify}
                      className={`w-full text-left px-3 py-2.5 rounded-md border text-xs font-bold transition cursor-pointer min-h-11 disabled:cursor-not-allowed disabled:opacity-60 ${
                        slot.position === 'AKA'
                          ? 'border-red-500/30 hover:bg-red-500/10'
                          : 'border-blue-500/30 hover:bg-blue-500/10'
                      } ${changed ? 'ring-2 ring-amber-500' : ''}`}
                    >
                      <span
                        className={`text-[10px] font-black mr-2 ${
                          slot.position === 'AKA' ? 'text-red-500' : 'text-blue-500'
                        }`}
                      >
                        {slot.position}
                      </span>
                      <span className={label ? 'text-foreground' : 'text-muted-foreground italic'}>
                        {label ?? (isBye ? 'BYE' : 'EMPTY')}
                      </span>
                      {changed && (
                        <span className="block text-[10px] font-semibold text-amber-600 mt-0.5">
                          Manually replaced
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-auto">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-black uppercase tracking-wide">Replace Player</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Bout <span className="font-bold text-foreground">{boutCode(target.bout)}</span> • Position{' '}
                  <span className="font-bold text-foreground">{target.position}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Current: <span className="font-bold text-foreground">{nameOf(currentId) ?? 'EMPTY'}</span>
                </p>
                <p className="text-xs text-muted-foreground">Category: {categoryName}</p>
              </div>
              <button onClick={() => setTarget(null)} className="p-1 hover:bg-secondary rounded cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            {boutHasResult && (
              <div className="border border-amber-500/40 bg-amber-500/10 rounded-lg p-3 text-xs">
                <div className="font-black text-amber-600 flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="h-4 w-4" /> This bout already has a recorded result
                </div>
                Changing the player may affect the winner and later rounds. A recovery snapshot is stored so the change can be undone.
              </div>
            )}

            {!confirming ? (
              <>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    autoFocus
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search name, registration no, or club..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="max-h-64 overflow-auto border border-border rounded-lg divide-y divide-border">
                  {filtered.length === 0 && (
                    <p className="p-3 text-xs text-muted-foreground">No athletes in this category match "{search}".</p>
                  )}
                  {filtered.map(p => {
                    const where = assignmentIndex.get(p.id);
                    const isCurrent = p.id === currentId;
                    const selected = p.id === chosenId;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setChosenId(p.id)}
                        className={`w-full text-left px-3 py-2.5 text-xs cursor-pointer min-h-11 transition ${
                          selected ? 'bg-primary/10' : 'hover:bg-secondary'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-2">
                          {p.full_name}
                          {selected && <Check className="h-3.5 w-3.5 text-primary" />}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {p.registration_no}
                          {clubOf(p) ? ` • ${clubOf(p)}` : ''}
                          {isCurrent ? ' • currently in this position' : where ? ` • assigned to ${where}` : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {isOpponent && (
                  <p className="text-xs font-bold text-red-500">
                    This athlete is the opponent in the same bout. Choose another player.
                  </p>
                )}
                {conflict && !isOpponent && (
                  <div className="border border-red-500/40 bg-red-500/10 rounded-lg p-3 text-xs">
                    <div className="font-black text-red-500 mb-1">PLAYER ALREADY ASSIGNED</div>
                    {nameOf(chosenId)} is already assigned to {conflict}. Choose another player.
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setTarget(null)}
                    className="px-4 py-2 border border-border rounded-lg text-xs font-bold hover:bg-secondary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!canConfirm}
                    onClick={() => setConfirming(true)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="border border-border rounded-lg p-3 text-xs space-y-1">
                  <div className="font-black uppercase tracking-wide mb-1">Replace player?</div>
                  <div>Bout: <span className="font-bold">{boutCode(target.bout)}</span></div>
                  <div>Position: <span className="font-bold">{target.position}</span></div>
                  <div>Current: <span className="font-bold">{nameOf(currentId) ?? 'EMPTY'}</span></div>
                  <div>New: <span className="font-bold">{nameOf(chosenId)}</span></div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setConfirming(false)}
                    className="px-4 py-2 border border-border rounded-lg text-xs font-bold hover:bg-secondary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={saving}
                    onClick={apply}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
                  >
                    {saving ? 'Saving...' : 'Confirm Replacement'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
