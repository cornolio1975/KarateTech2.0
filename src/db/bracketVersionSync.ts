import { supabase } from './dbClient';
import { BracketVersion, VersionReason, VersionStatus, BracketSnapshot } from './bracketVersions';

/**
 * Server-backed mirror of the local bracket version history.
 *
 * The local store stays the source of truth for offline work; this module keeps
 * other PCs in sync and refuses to write when the server already holds a newer
 * version than the one the operator based their change on.
 */

interface VersionRow {
  version_id: string;
  tournament_id: string;
  bracket_id: string;
  category_id: string | null;
  version_number: number;
  reason: string;
  created_at: string;
  created_by: string | null;
  change_summary: string | null;
  restored_from: number | null;
  status: string;
  integrity_hash: string;
  snapshot: BracketSnapshot;
}

const toVersion = (row: VersionRow): BracketVersion => ({
  versionId: row.version_id,
  tournamentId: row.tournament_id,
  bracketId: row.bracket_id,
  categoryId: row.category_id ?? '',
  versionNumber: row.version_number,
  reason: row.reason as VersionReason,
  createdAt: row.created_at,
  createdBy: row.created_by ?? 'Unknown',
  changeSummary: row.change_summary ?? undefined,
  restoredFromVersionNumber: row.restored_from ?? undefined,
  status: row.status as VersionStatus,
  integrityHash: row.integrity_hash,
  snapshot: row.snapshot,
});

const toRow = (version: BracketVersion): VersionRow => ({
  version_id: version.versionId,
  tournament_id: version.tournamentId,
  bracket_id: version.bracketId,
  category_id: version.categoryId || null,
  version_number: version.versionNumber,
  reason: version.reason,
  created_at: version.createdAt,
  created_by: version.createdBy,
  change_summary: version.changeSummary ?? null,
  restored_from: version.restoredFromVersionNumber ?? null,
  status: version.status,
  integrity_hash: version.integrityHash,
  snapshot: version.snapshot,
});

export type SyncOutcome =
  | { status: 'offline' }
  | { status: 'saved'; version: BracketVersion }
  | { status: 'conflict'; serverVersionNumber: number; serverVersion: BracketVersion | null };

/** Highest version number the server currently holds for a bracket. */
export async function fetchServerVersionNumber(
  tournamentId: string,
  bracketId: string
): Promise<number | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('bracket_versions')
    .select('version_number')
    .eq('tournament_id', tournamentId)
    .eq('bracket_id', bracketId)
    .order('version_number', { ascending: false })
    .limit(1);

  if (error) {
    console.warn('[bracketVersionSync] version lookup failed:', error.message);
    return null;
  }
  return data?.[0]?.version_number ?? 0;
}

export async function fetchVersions(
  tournamentId: string,
  bracketId: string
): Promise<BracketVersion[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('bracket_versions')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('bracket_id', bracketId)
    .order('version_number', { ascending: false });

  if (error) {
    console.warn('[bracketVersionSync] fetch failed:', error.message);
    return [];
  }
  return (data as VersionRow[]).map(toVersion);
}

/**
 * Publishes a version. The unique (tournament, bracket, version_number)
 * constraint makes a concurrent write fail rather than overwrite, which is
 * reported back as a conflict for the operator to resolve.
 */
export async function pushVersion(version: BracketVersion): Promise<SyncOutcome> {
  if (!supabase) return { status: 'offline' };

  const serverLatest = await fetchServerVersionNumber(version.tournamentId, version.bracketId);
  if (serverLatest !== null && serverLatest >= version.versionNumber) {
    const versions = await fetchVersions(version.tournamentId, version.bracketId);
    return {
      status: 'conflict',
      serverVersionNumber: serverLatest,
      serverVersion: versions[0] ?? null,
    };
  }

  const { error } = await supabase.from('bracket_versions').insert(toRow(version));

  if (error) {
    // 23505 = unique violation: another PC inserted this number first.
    if ((error as { code?: string }).code === '23505') {
      const latest = await fetchServerVersionNumber(version.tournamentId, version.bracketId);
      const versions = await fetchVersions(version.tournamentId, version.bracketId);
      return {
        status: 'conflict',
        serverVersionNumber: latest ?? version.versionNumber,
        serverVersion: versions[0] ?? null,
      };
    }
    console.warn('[bracketVersionSync] push failed:', error.message);
    return { status: 'offline' };
  }

  return { status: 'saved', version };
}
