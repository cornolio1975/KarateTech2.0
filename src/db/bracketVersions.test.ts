import { describe, it, expect, beforeEach } from 'vitest';

const store: Record<string, string> = {};
globalThis.window = {} as Window & typeof globalThis;
globalThis.localStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const key in store) delete store[key]; },
  get length() { return Object.keys(store).length; },
  key: (index: number) => Object.keys(store)[index] ?? null,
} as Storage;

import {
  createVersion,
  listVersions,
  getVersion,
  verifyVersion,
  compareVersions,
  buildPackage,
  validatePackage,
  getBracketId,
  computeIntegrityHash,
} from './bracketVersions';
import { Bout, Category, Participant } from './types';

const TID = 'T-1';

const category: Category = {
  id: 'cat-1',
  name: 'Cadet Male -60kg',
  gender: 'Male',
  min_age: 14,
  max_age: 16,
  min_weight: 0,
  max_weight: 60,
  capacity: 16,
  status: 'Open',
  format: 'knockout',
} as Category;

const participants: Participant[] = ['p1', 'p2', 'p3', 'p4'].map(id => ({
  id,
  registration_no: `REG-${id}`,
  full_name: `Athlete ${id}`,
  gender: 'Male',
  dob: '2010-01-01',
  passport_ic: `IC-${id}`,
  club_id: 'club-1',
  weight: 55,
  height: 165,
  status: 'Confirmed',
  medical_status: 'Cleared',
  payment_status: 'Paid',
})) as Participant[];

const makeBouts = (aka: string, ao: string): Bout[] => [
  {
    id: 'b1', category_id: 'cat-1', bout_no: 1, round_no: 1,
    participant_a_id: aka, participant_b_id: ao,
    winner_id: null, score_a: 0, score_b: 0, status: 'Scheduled',
  },
  {
    id: 'b2', category_id: 'cat-1', bout_no: 2, round_no: 1,
    participant_a_id: 'p3', participant_b_id: 'p4',
    winner_id: null, score_a: 0, score_b: 0, status: 'Scheduled',
  },
];

const create = (bouts: Bout[], reason: any = 'MANUAL_EDIT', extra = {}) =>
  createVersion({
    tournamentId: TID,
    category,
    bouts,
    participants,
    reason,
    createdBy: 'Admin',
    ...extra,
  });

describe('Bracket versioning', () => {
  beforeEach(() => localStorage.clear());

  it('assigns a stable bracket id per category', () => {
    const first = getBracketId(TID, 'cat-1');
    expect(getBracketId(TID, 'cat-1')).toBe(first);
    expect(getBracketId(TID, 'cat-2')).not.toBe(first);
  });

  it('creates sequential immutable versions without altering history', async () => {
    const v1 = await create(makeBouts('p1', 'p2'), 'INITIAL');
    const v2 = await create(makeBouts('p9', 'p2'), 'MANUAL_PLAYER_REPLACEMENT');

    expect(v1.versionNumber).toBe(1);
    expect(v2.versionNumber).toBe(2);

    const stored = getVersion(TID, v1.bracketId, 1)!;
    expect(stored.snapshot.bouts[0].participant_a_id).toBe('p1');
    expect(stored.integrityHash).toBe(v1.integrityHash);
  });

  it('keeps all ten versions when created repeatedly', async () => {
    for (let i = 0; i < 10; i++) await create(makeBouts('p1', 'p2'));
    const bracketId = getBracketId(TID, 'cat-1');
    expect(listVersions(TID, bracketId)).toHaveLength(10);
  });

  it('verifies integrity and detects tampering', async () => {
    const v = await create(makeBouts('p1', 'p2'), 'INITIAL');
    expect((await verifyVersion(v)).valid).toBe(true);

    const tampered = { ...v, snapshot: { ...v.snapshot, bouts: makeBouts('p4', 'p2') } };
    expect((await verifyVersion(tampered)).valid).toBe(false);
  });

  it('hashes identical brackets identically regardless of capture time', async () => {
    const a = await computeIntegrityHash({
      bracketId: 'BRK-1', tournamentId: TID, categoryId: 'cat-1', categoryName: 'X',
      format: 'knockout', competitors: [], bouts: makeBouts('p1', 'p2'), capturedAt: '2026-01-01T00:00:00Z',
    });
    const b = await computeIntegrityHash({
      bracketId: 'BRK-1', tournamentId: TID, categoryId: 'cat-1', categoryName: 'X',
      format: 'knockout', competitors: [], bouts: makeBouts('p1', 'p2'), capturedAt: '2026-09-09T10:00:00Z',
    });
    expect(a).toBe(b);
  });

  it('reports slot changes between two versions', async () => {
    const v1 = await create(makeBouts('p1', 'p2'), 'INITIAL');
    const v2 = await create(makeBouts('p4', 'p2'), 'MANUAL_PLAYER_REPLACEMENT');

    const diff = compareVersions(v1, v2);
    expect(diff.changedSlots).toEqual([
      { boutCode: 'R1B1', position: 'AKA', from: 'Athlete p1', to: 'Athlete p4' },
    ]);
  });

  it('restoring an old version creates a new version and preserves the original', async () => {
    const v1 = await create(makeBouts('p1', 'p2'), 'INITIAL');
    await create(makeBouts('p3', 'p2'), 'MANUAL_PLAYER_REPLACEMENT');

    const restored = await create(v1.snapshot.bouts, 'RESTORE', { restoredFromVersionNumber: 1 });

    expect(restored.versionNumber).toBe(3);
    expect(restored.snapshot.bouts[0].participant_a_id).toBe('p1');
    expect(getVersion(TID, v1.bracketId, 1)!.snapshot.bouts[0].participant_a_id).toBe('p1');
    expect(getVersion(TID, v1.bracketId, 2)!.snapshot.bouts[0].participant_a_id).toBe('p3');
  });

  describe('export / import', () => {
    it('exports exactly the selected version, not the current bracket', async () => {
      const v1 = await create(makeBouts('p1', 'p2'), 'INITIAL');
      await create(makeBouts('p4', 'p2'), 'MANUAL_PLAYER_REPLACEMENT');

      const pkg = buildPackage(v1);
      expect(pkg.versionNumber).toBe(1);
      expect(pkg.bracketSnapshot.bouts[0].participant_a_id).toBe('p1');
    });

    it('accepts a valid package for the same tournament and category', async () => {
      const v = await create(makeBouts('p1', 'p2'), 'INITIAL');
      const result = await validatePackage(buildPackage(v), { tournamentId: TID, categoryId: 'cat-1' });
      expect(result.ok).toBe(true);
    });

    it('blocks a bracket from another tournament', async () => {
      const v = await create(makeBouts('p1', 'p2'), 'INITIAL');
      const result = await validatePackage(buildPackage(v), { tournamentId: 'T-OTHER', categoryId: 'cat-1' });
      expect(result.ok).toBe(false);
      expect(result.rejection).toBe('TOURNAMENT_MISMATCH');
    });

    it('blocks a bracket from another category', async () => {
      const v = await create(makeBouts('p1', 'p2'), 'INITIAL');
      const result = await validatePackage(buildPackage(v), { tournamentId: TID, categoryId: 'cat-OTHER' });
      expect(result.rejection).toBe('CATEGORY_MISMATCH');
    });

    it('rejects a tampered package', async () => {
      const v = await create(makeBouts('p1', 'p2'), 'INITIAL');
      const pkg = buildPackage(v);
      pkg.bracketSnapshot.bouts[0].participant_a_id = 'p4';

      const result = await validatePackage(pkg, { tournamentId: TID, categoryId: 'cat-1' });
      expect(result.rejection).toBe('CORRUPTED_FILE');
    });

    it('rejects a non-bracket file', async () => {
      const result = await validatePackage({ hello: 'world' }, { tournamentId: TID, categoryId: 'cat-1' });
      expect(result.rejection).toBe('INVALID_FORMAT');
    });
  });
});
