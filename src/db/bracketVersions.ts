import { Bout, Category, Participant } from './types';

export type VersionReason =
  | 'INITIAL'
  | 'MANUAL_EDIT'
  | 'MANUAL_PLAYER_REPLACEMENT'
  | 'ATHLETE_UPDATE'
  | 'DRAW_REGENERATED'
  | 'BOUT_RESULT_UPDATE'
  | 'BRACKET_REPAIR'
  | 'IMPORT'
  | 'RESTORE'
  | 'RECOVERY'
  | 'SAFETY_SNAPSHOT'
  | 'UNDO_MANUAL_PLAYER_REPLACEMENT'
  | 'ADMIN_OVERRIDE';

export type VersionStatus = 'VALID' | 'CORRUPTED' | 'FINAL';

export interface BracketCompetitor {
  participantId: string;
  fullName: string;
  clubId: string | null;
  registrationNo: string | null;
}

export interface BracketSnapshot {
  bracketId: string;
  tournamentId: string;
  categoryId: string;
  categoryName: string;
  format: string;
  competitors: BracketCompetitor[];
  bouts: Bout[];
  capturedAt: string;
}

export interface BracketVersion {
  versionId: string;
  bracketId: string;
  tournamentId: string;
  categoryId: string;
  versionNumber: number;
  createdAt: string;
  createdBy: string;
  reason: VersionReason;
  status: VersionStatus;
  /** Free-form detail describing what changed, shown in version history. */
  changeSummary?: string;
  restoredFromVersionNumber?: number;
  integrityHash: string;
  snapshot: BracketSnapshot;
}

const isClient = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const versionsKey = (tournamentId: string, bracketId: string) =>
  `karatetech:${tournamentId}:bracket_versions:${bracketId}`;

const registryKey = (tournamentId: string) => `karatetech:${tournamentId}:bracket_registry`;

/**
 * Stable, human-readable bracket identity that survives regeneration and renaming.
 * Sequence numbers are assigned once per category and then persisted.
 */
export function getBracketId(tournamentId: string, categoryId: string): string {
  if (!isClient()) return `BRK-${categoryId}`;
  let registry: Record<string, string> = {};
  try {
    registry = JSON.parse(localStorage.getItem(registryKey(tournamentId)) || '{}');
  } catch {
    registry = {};
  }
  if (registry[categoryId]) return registry[categoryId];

  const next = Object.keys(registry).length + 1;
  const id = `BRK-${new Date().getFullYear()}-${String(next).padStart(5, '0')}`;
  registry[categoryId] = id;
  try {
    localStorage.setItem(registryKey(tournamentId), JSON.stringify(registry));
  } catch {
    /* storage unavailable */
  }
  return id;
}

/** Deterministic serialization so the same bracket always hashes identically. */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

export async function sha256Hex(input: string): Promise<string> {
  const subtle = (globalThis.crypto as Crypto | undefined)?.subtle;
  if (!subtle) throw new Error('SHA-256 unavailable: no Web Crypto implementation');
  const bytes = new TextEncoder().encode(input);
  const digest = await subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function buildSnapshot(params: {
  bracketId: string;
  tournamentId: string;
  category: Category;
  bouts: Bout[];
  participants: Participant[];
}): BracketSnapshot {
  const { bracketId, tournamentId, category, bouts, participants } = params;
  const categoryBouts = bouts
    .filter(b => b.category_id === category.id)
    .slice()
    .sort((a, b) => a.round_no - b.round_no || a.bout_no - b.bout_no);

  const competitorIds = new Set<string>();
  categoryBouts.forEach(b => {
    if (b.participant_a_id) competitorIds.add(b.participant_a_id);
    if (b.participant_b_id) competitorIds.add(b.participant_b_id);
  });

  const competitors: BracketCompetitor[] = Array.from(competitorIds)
    .sort()
    .map(id => {
      const p = participants.find(x => x.id === id);
      return {
        participantId: id,
        fullName: p?.full_name ?? 'Unknown Athlete',
        clubId: p?.club_id ?? null,
        registrationNo: p?.registration_no ?? null,
      };
    });

  return {
    bracketId,
    tournamentId,
    categoryId: category.id,
    categoryName: category.name,
    format: category.format || 'knockout',
    competitors,
    bouts: categoryBouts,
    capturedAt: new Date().toISOString(),
  };
}

/** capturedAt is excluded so two identical brackets hash the same. */
function hashableSnapshot(snapshot: BracketSnapshot) {
  const { capturedAt, ...rest } = snapshot;
  return rest;
}

export async function computeIntegrityHash(snapshot: BracketSnapshot): Promise<string> {
  return sha256Hex(canonicalize(hashableSnapshot(snapshot)));
}

export function listVersions(tournamentId: string, bracketId: string): BracketVersion[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(versionsKey(tournamentId, bracketId));
    const parsed = raw ? (JSON.parse(raw) as BracketVersion[]) : [];
    return parsed.sort((a, b) => a.versionNumber - b.versionNumber);
  } catch {
    return [];
  }
}

function persistVersions(tournamentId: string, bracketId: string, versions: BracketVersion[]) {
  if (!isClient()) return;
  try {
    localStorage.setItem(versionsKey(tournamentId, bracketId), JSON.stringify(versions));
  } catch (e) {
    console.error('[bracketVersions] Failed to persist version history', e);
  }
}

export function getLatestVersion(tournamentId: string, bracketId: string): BracketVersion | null {
  const all = listVersions(tournamentId, bracketId);
  return all.length ? all[all.length - 1] : null;
}

export function getVersion(
  tournamentId: string,
  bracketId: string,
  versionNumber: number
): BracketVersion | null {
  return listVersions(tournamentId, bracketId).find(v => v.versionNumber === versionNumber) ?? null;
}

/**
 * Appends a new immutable version. Existing versions are never mutated.
 */
export async function createVersion(params: {
  tournamentId: string;
  category: Category;
  bouts: Bout[];
  participants: Participant[];
  reason: VersionReason;
  createdBy: string;
  changeSummary?: string;
  restoredFromVersionNumber?: number;
  status?: VersionStatus;
}): Promise<BracketVersion> {
  const bracketId = getBracketId(params.tournamentId, params.category.id);
  const snapshot = buildSnapshot({
    bracketId,
    tournamentId: params.tournamentId,
    category: params.category,
    bouts: params.bouts,
    participants: params.participants,
  });

  const existing = listVersions(params.tournamentId, bracketId);
  const versionNumber = existing.length ? existing[existing.length - 1].versionNumber + 1 : 1;

  const version: BracketVersion = {
    versionId: `${bracketId}-V${String(versionNumber).padStart(3, '0')}-${Date.now()}`,
    bracketId,
    tournamentId: params.tournamentId,
    categoryId: params.category.id,
    versionNumber,
    createdAt: new Date().toISOString(),
    createdBy: params.createdBy,
    reason: params.reason,
    status: params.status ?? 'VALID',
    changeSummary: params.changeSummary,
    restoredFromVersionNumber: params.restoredFromVersionNumber,
    integrityHash: await computeIntegrityHash(snapshot),
    snapshot,
  };

  persistVersions(params.tournamentId, bracketId, [...existing, version]);
  return version;
}

export interface IntegrityResult {
  valid: boolean;
  expectedHash: string;
  actualHash: string;
}

export async function verifyVersion(version: BracketVersion): Promise<IntegrityResult> {
  const actualHash = await computeIntegrityHash(version.snapshot);
  return { valid: actualHash === version.integrityHash, expectedHash: version.integrityHash, actualHash };
}

/**
 * Marks a version corrupted in place. Used when integrity verification fails so
 * the version is never silently restored.
 */
export function markCorrupted(tournamentId: string, bracketId: string, versionNumber: number): void {
  const versions = listVersions(tournamentId, bracketId);
  const next = versions.map(v =>
    v.versionNumber === versionNumber ? { ...v, status: 'CORRUPTED' as VersionStatus } : v
  );
  persistVersions(tournamentId, bracketId, next);
}

export interface VersionDiff {
  addedCompetitors: string[];
  removedCompetitors: string[];
  changedSlots: {
    boutCode: string;
    position: 'AKA' | 'AO';
    from: string | null;
    to: string | null;
  }[];
  changedResults: { boutCode: string; from: string | null; to: string | null }[];
}

export function compareVersions(a: BracketVersion, b: BracketVersion): VersionDiff {
  const nameOf = (snapshotSide: BracketSnapshot, id: string | null) =>
    id ? snapshotSide.competitors.find(c => c.participantId === id)?.fullName ?? id : null;

  const aIds = new Set(a.snapshot.competitors.map(c => c.participantId));
  const bIds = new Set(b.snapshot.competitors.map(c => c.participantId));

  const changedSlots: VersionDiff['changedSlots'] = [];
  const changedResults: VersionDiff['changedResults'] = [];

  b.snapshot.bouts.forEach(boutB => {
    const boutA = a.snapshot.bouts.find(x => x.id === boutB.id);
    if (!boutA) return;
    const code = `R${boutB.round_no}B${boutB.bout_no}`;
    if (boutA.participant_a_id !== boutB.participant_a_id) {
      changedSlots.push({
        boutCode: code,
        position: 'AKA',
        from: nameOf(a.snapshot, boutA.participant_a_id),
        to: nameOf(b.snapshot, boutB.participant_a_id),
      });
    }
    if (boutA.participant_b_id !== boutB.participant_b_id) {
      changedSlots.push({
        boutCode: code,
        position: 'AO',
        from: nameOf(a.snapshot, boutA.participant_b_id),
        to: nameOf(b.snapshot, boutB.participant_b_id),
      });
    }
    if (boutA.winner_id !== boutB.winner_id) {
      changedResults.push({
        boutCode: code,
        from: nameOf(a.snapshot, boutA.winner_id),
        to: nameOf(b.snapshot, boutB.winner_id),
      });
    }
  });

  return {
    addedCompetitors: b.snapshot.competitors
      .filter(c => !aIds.has(c.participantId))
      .map(c => c.fullName),
    removedCompetitors: a.snapshot.competitors
      .filter(c => !bIds.has(c.participantId))
      .map(c => c.fullName),
    changedSlots,
    changedResults,
  };
}

export const BRACKET_PACKAGE_FORMAT = 'KarateTech Bracket Package';

export interface BracketPackage {
  format: typeof BRACKET_PACKAGE_FORMAT;
  formatVersion: 1;
  tournamentId: string;
  bracketId: string;
  categoryId: string;
  versionId: string;
  versionNumber: number;
  createdAt: string;
  integrityHash: string;
  bracketSnapshot: BracketSnapshot;
}

/** Exports exactly the requested version, never the currently displayed bracket. */
export function buildPackage(version: BracketVersion): BracketPackage {
  return {
    format: BRACKET_PACKAGE_FORMAT,
    formatVersion: 1,
    tournamentId: version.tournamentId,
    bracketId: version.bracketId,
    categoryId: version.categoryId,
    versionId: version.versionId,
    versionNumber: version.versionNumber,
    createdAt: version.createdAt,
    integrityHash: version.integrityHash,
    bracketSnapshot: version.snapshot,
  };
}

export type ImportRejection =
  | 'INVALID_FORMAT'
  | 'UNSUPPORTED_FORMAT_VERSION'
  | 'TOURNAMENT_MISMATCH'
  | 'CATEGORY_MISMATCH'
  | 'CORRUPTED_FILE';

export interface ImportValidation {
  ok: boolean;
  rejection?: ImportRejection;
  message?: string;
  pkg?: BracketPackage;
}

export async function validatePackage(
  raw: unknown,
  ctx: { tournamentId: string; categoryId: string }
): Promise<ImportValidation> {
  const pkg = raw as BracketPackage;
  if (!pkg || pkg.format !== BRACKET_PACKAGE_FORMAT || !pkg.bracketSnapshot) {
    return { ok: false, rejection: 'INVALID_FORMAT', message: 'This file is not a KarateTech bracket package.' };
  }
  if (pkg.formatVersion !== 1) {
    return {
      ok: false,
      rejection: 'UNSUPPORTED_FORMAT_VERSION',
      message: `Unsupported package format version: ${pkg.formatVersion}.`,
    };
  }
  if (pkg.tournamentId !== ctx.tournamentId) {
    return {
      ok: false,
      rejection: 'TOURNAMENT_MISMATCH',
      message: 'IMPORT BLOCKED: this bracket belongs to another tournament.',
    };
  }
  if (pkg.categoryId !== ctx.categoryId) {
    return {
      ok: false,
      rejection: 'CATEGORY_MISMATCH',
      message: 'IMPORT BLOCKED: this bracket belongs to a different category.',
    };
  }

  const actualHash = await computeIntegrityHash(pkg.bracketSnapshot);
  if (actualHash !== pkg.integrityHash) {
    return {
      ok: false,
      rejection: 'CORRUPTED_FILE',
      message: 'IMPORT BLOCKED: integrity check failed, this file has been modified or corrupted.',
    };
  }

  return { ok: true, pkg };
}
