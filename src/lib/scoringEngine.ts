/**
 * KarateTech 3.0 — Central Scoring Engine (Phase 6)
 *
 * Provides event-sourcing functions that SUPPLEMENT the existing bout scoring system.
 * Does NOT replace db.bouts.update() — existing bout score fields remain authoritative.
 * These events provide: immutable audit trail, majority engine input, animation triggers,
 * display broadcasting, and supervisor monitoring.
 *
 * AKA = RED (永久不变 / immutable)
 * AO  = BLUE (永久不变 / immutable)
 */

import { supabase } from '@/db/dbClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScoreSide = 'AKA' | 'AO';
export type ScoreType = 'YUKO' | 'WAZA-ARI' | 'IPPON' | 'PENALTY_C1' | 'PENALTY_C2' | 'PENALTY_C3' | 'UNDO' | 'NO_SCORE';
export type TimerEventType = 'START' | 'STOP' | 'PAUSE' | 'RESUME' | 'TIME_UP' | 'SET' | 'RESET';
export type RefereeDecisionType = 'AWARD_SCORE' | 'NO_SCORE' | 'REQUEST_VIDEO_REVIEW' | 'PENALTY' | 'SENSHU' | 'MATCH_END' | 'OVERRIDE';
export type VideoReviewEventType = 'REQUEST' | 'REVIEW_START' | 'DECISION_UPHELD' | 'DECISION_REVERSED' | 'CANCELLED';

export interface ScoringSession {
  id: string;
  tournament_id: string;
  bout_id: string;
  category_id?: string;
  tatami_id?: string;
  tatami_label?: string;
  round_no?: number;
  bout_no?: number;
  session_state: 'pending' | 'active' | 'paused' | 'completed' | 'voided';
}

export interface MajorityResult {
  side: ScoreSide;
  scoreType: ScoreType;
  scoreValue: number;
  judgeVotes: Record<string, { side: ScoreSide; scoreType: ScoreType } | null>;
  confidence: 'unanimous' | 'majority' | 'tied' | 'insufficient';
  voteCount: number;
  totalJudges: number;
}

export interface ScoringEvent {
  id: string;
  session_id?: string;
  tournament_id: string;
  bout_id: string;
  tatami_id?: string;
  event_type: string;
  side?: ScoreSide;
  score_type?: ScoreType;
  score_value: number;
  cumulative_score_aka: number;
  cumulative_score_ao: number;
  event_at: string;
  animation_trigger?: string;
}

// ─── Session Management ────────────────────────────────────────────────────────

/**
 * Open a scoring session for a bout.
 * Call this when the referee signals the bout to start.
 */
export async function openScoringSession(opts: {
  tournamentId: string;
  boutId: string;
  categoryId?: string;
  tatamiId?: string;
  tatamiLabel?: string;
  roundNo?: number;
  boutNo?: number;
  openedBy?: string;
}): Promise<ScoringSession | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('karate_scoring_sessions')
      .insert({
        tournament_id: opts.tournamentId,
        bout_id: opts.boutId,
        category_id: opts.categoryId,
        tatami_id: opts.tatamiId,
        tatami_label: opts.tatamiLabel,
        round_no: opts.roundNo,
        bout_no: opts.boutNo,
        session_state: 'active',
        opened_by: opts.openedBy,
        opened_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) { console.error('[ScoringEngine] openScoringSession:', error.message); return null; }
    return data as ScoringSession;
  } catch (e) {
    console.error('[ScoringEngine] openScoringSession exception:', e);
    return null;
  }
}

/**
 * Close a scoring session.
 */
export async function closeScoringSession(sessionId: string, durationSeconds?: number): Promise<void> {
  if (!supabase) return;
  try {
    await supabase
      .from('karate_scoring_sessions')
      .update({
        session_state: 'completed',
        closed_at: new Date().toISOString(),
        total_duration_seconds: durationSeconds,
      })
      .eq('id', sessionId);
  } catch (e) {
    console.error('[ScoringEngine] closeScoringSession:', e);
  }
}

// ─── Judge Signal Events ───────────────────────────────────────────────────────

/**
 * Record a raw judge click signal.
 * This is immutable — once written it is never modified.
 * Inputs to the majority engine; NOT directly a score award.
 */
export async function recordJudgeSignal(opts: {
  sessionId?: string;
  tournamentId: string;
  boutId: string;
  tatamiId?: string;
  judgeId: string;
  judgeDeviceId?: string;
  side: ScoreSide;
  scoreType: ScoreType;
  scoreValue?: number;
  sequenceNo?: number;
}): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('karate_judge_signal_events')
      .insert({
        session_id: opts.sessionId,
        tournament_id: opts.tournamentId,
        bout_id: opts.boutId,
        tatami_id: opts.tatamiId,
        judge_id: opts.judgeId,
        judge_device_id: opts.judgeDeviceId,
        side: opts.side,
        score_type: opts.scoreType,
        score_value: opts.scoreValue ?? (opts.scoreType === 'YUKO' ? 1 : opts.scoreType === 'WAZA-ARI' ? 2 : opts.scoreType === 'IPPON' ? 3 : 0),
        signal_at: new Date().toISOString(),
        sequence_no: opts.sequenceNo,
      })
      .select('id')
      .single();
    if (error) { console.error('[ScoringEngine] recordJudgeSignal:', error.message); return null; }
    return data?.id ?? null;
  } catch (e) {
    console.error('[ScoringEngine] recordJudgeSignal exception:', e);
    return null;
  }
}

// ─── Referee Decisions ────────────────────────────────────────────────────────

/**
 * Record a referee decision. This is the official action that creates a scoring event.
 */
export async function recordRefereeDecision(opts: {
  sessionId?: string;
  tournamentId: string;
  boutId: string;
  tatamiId?: string;
  refereeId?: string;
  decisionType: RefereeDecisionType;
  side?: ScoreSide;
  scoreType?: ScoreType;
  scoreValue?: number;
  majorityResult?: MajorityResult;
  notes?: string;
}): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('karate_referee_decisions')
      .insert({
        session_id: opts.sessionId,
        tournament_id: opts.tournamentId,
        bout_id: opts.boutId,
        tatami_id: opts.tatamiId,
        referee_id: opts.refereeId,
        decision_type: opts.decisionType,
        side: opts.side,
        score_type: opts.scoreType,
        score_value: opts.scoreValue ?? 0,
        majority_result: opts.majorityResult,
        decided_at: new Date().toISOString(),
        notes: opts.notes,
      })
      .select('id')
      .single();
    if (error) { console.error('[ScoringEngine] recordRefereeDecision:', error.message); return null; }
    return data?.id ?? null;
  } catch (e) {
    console.error('[ScoringEngine] recordRefereeDecision exception:', e);
    return null;
  }
}

// ─── Official Scoring Events ──────────────────────────────────────────────────

/**
 * Emit an official scoring event.
 * This is what the display, animation engine, and supervisor consume.
 * Called automatically after a referee decision, OR directly for system events.
 */
export async function emitScoringEvent(opts: {
  sessionId?: string;
  decisionId?: string;
  tournamentId: string;
  boutId: string;
  tatamiId?: string;
  eventType: string;
  side?: ScoreSide;
  scoreType?: ScoreType;
  scoreValue?: number;
  cumulativeScoreAka: number;
  cumulativeScoreAo: number;
  animationTrigger?: string;
  displayPayload?: Record<string, unknown>;
  sequenceNo?: number;
}): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('karate_scoring_events')
      .insert({
        session_id: opts.sessionId,
        decision_id: opts.decisionId,
        tournament_id: opts.tournamentId,
        bout_id: opts.boutId,
        tatami_id: opts.tatamiId,
        event_type: opts.eventType,
        side: opts.side,
        score_type: opts.scoreType,
        score_value: opts.scoreValue ?? 0,
        cumulative_score_aka: opts.cumulativeScoreAka,
        cumulative_score_ao: opts.cumulativeScoreAo,
        event_at: new Date().toISOString(),
        sequence_no: opts.sequenceNo,
        animation_trigger: opts.animationTrigger,
        display_payload: opts.displayPayload,
      })
      .select('id')
      .single();
    if (error) { console.error('[ScoringEngine] emitScoringEvent:', error.message); return null; }
    return data?.id ?? null;
  } catch (e) {
    console.error('[ScoringEngine] emitScoringEvent exception:', e);
    return null;
  }
}

// ─── Timer Events ─────────────────────────────────────────────────────────────

export async function recordTimerEvent(opts: {
  sessionId?: string;
  tournamentId: string;
  boutId: string;
  tatamiId?: string;
  eventType: TimerEventType;
  timerValueSeconds?: number;
  remainingSeconds?: number;
  operatedBy?: string;
}): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('karate_timer_events').insert({
      session_id: opts.sessionId,
      tournament_id: opts.tournamentId,
      bout_id: opts.boutId,
      tatami_id: opts.tatamiId,
      event_type: opts.eventType,
      timer_value_seconds: opts.timerValueSeconds,
      remaining_seconds: opts.remainingSeconds,
      operated_by: opts.operatedBy,
      event_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[ScoringEngine] recordTimerEvent:', e);
  }
}

// ─── Video Review Events ──────────────────────────────────────────────────────

export async function recordVideoReviewEvent(opts: {
  sessionId?: string;
  tournamentId: string;
  boutId: string;
  tatamiId?: string;
  eventType: VideoReviewEventType;
  requestedBy?: string;
  requestedSide?: ScoreSide;
  vrFileUrl?: string;
  reviewerNotes?: string;
  decidedBy?: string;
}): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('karate_video_review_events')
      .insert({
        session_id: opts.sessionId,
        tournament_id: opts.tournamentId,
        bout_id: opts.boutId,
        tatami_id: opts.tatamiId,
        event_type: opts.eventType,
        requested_by: opts.requestedBy,
        requested_side: opts.requestedSide,
        vr_file_url: opts.vrFileUrl,
        reviewer_notes: opts.reviewerNotes,
        event_at: new Date().toISOString(),
        decided_by: opts.decidedBy,
        decision_at: opts.eventType !== 'REQUEST' ? new Date().toISOString() : null,
      })
      .select('id')
      .single();
    if (error) { console.error('[ScoringEngine] recordVideoReviewEvent:', error.message); return null; }
    return data?.id ?? null;
  } catch (e) {
    console.error('[ScoringEngine] recordVideoReviewEvent exception:', e);
    return null;
  }
}

// ─── Audit Events ─────────────────────────────────────────────────────────────

export async function recordAuditEvent(opts: {
  tournamentId?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('karate_audit_events').insert({
      tournament_id: opts.tournamentId,
      actor_email: opts.actorEmail,
      actor_role: opts.actorRole,
      action: opts.action,
      entity_type: opts.entityType,
      entity_id: opts.entityId,
      old_values: opts.oldValues,
      new_values: opts.newValues,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[ScoringEngine] recordAuditEvent:', e);
  }
}

// ─── Query Helpers ────────────────────────────────────────────────────────────

/**
 * Fetch the scoring event timeline for a bout (newest first by default).
 */
export async function getBoutScoringEvents(
  boutId: string,
  limit = 50
): Promise<ScoringEvent[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('karate_scoring_events')
      .select('*')
      .eq('bout_id', boutId)
      .order('event_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []) as ScoringEvent[];
  } catch {
    return [];
  }
}

/**
 * Fetch judge signals for the current bout session.
 */
export async function getSessionJudgeSignals(sessionId: string) {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('karate_judge_signal_events')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_voided', false)
      .order('signal_at', { ascending: true });
    return data ?? [];
  } catch {
    return [];
  }
}
