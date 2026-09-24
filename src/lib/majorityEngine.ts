/**
 * KarateTech 3.0 — Majority Engine (Phase 9)
 *
 * Evaluates judge click signals and determines if a majority has been reached
 * for a specific scoring decision. Output feeds the Referee Console — the referee
 * always makes the FINAL decision. This engine NEVER auto-awards scores.
 *
 * WKF Kumite Majority Rule:
 *   - 4 judges: need 3+ votes for majority (3/4 or 4/4)
 *   - 3 judges: need 2+ votes for majority (2/3 or 3/3)
 *   - Tied = no auto-award; referee decides
 */

import type { ScoreSide, ScoreType, MajorityResult } from './scoringEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JudgeVote {
  judgeId: string;         // e.g. 'J1', 'J2', 'J3', 'J4'
  side: ScoreSide;
  scoreType: ScoreType;
  scoreValue: number;
  signalAt: string;
}

export interface MajorityCandidate {
  side: ScoreSide;
  scoreType: ScoreType;
  scoreValue: number;
  votes: JudgeVote[];
  voteCount: number;
}

// ─── Score value mapping ──────────────────────────────────────────────────────

export function scoreTypeToValue(scoreType: ScoreType): number {
  switch (scoreType) {
    case 'YUKO':      return 1;
    case 'WAZA-ARI':  return 2;
    case 'IPPON':     return 3;
    default:          return 0;
  }
}

// ─── Core majority evaluation ─────────────────────────────────────────────────

/**
 * Evaluate a set of judge votes and determine if a majority decision exists.
 *
 * @param votes - Array of judge votes for the current scoring window
 * @param totalJudges - Total number of judges participating (default: 4)
 * @returns MajorityResult describing the consensus (or lack thereof)
 */
export function evaluateMajority(
  votes: JudgeVote[],
  totalJudges: number = 4
): MajorityResult {
  const majorityThreshold = Math.ceil((totalJudges + 1) / 2); // 3 out of 4, or 2 out of 3

  if (votes.length === 0) {
    return {
      side: 'AKA',
      scoreType: 'NO_SCORE',
      scoreValue: 0,
      judgeVotes: {},
      confidence: 'insufficient',
      voteCount: 0,
      totalJudges,
    };
  }

  // Group votes by side+scoreType combination
  const candidateMap = new Map<string, MajorityCandidate>();

  for (const vote of votes) {
    const key = `${vote.side}:${vote.scoreType}`;
    if (!candidateMap.has(key)) {
      candidateMap.set(key, {
        side: vote.side,
        scoreType: vote.scoreType,
        scoreValue: scoreTypeToValue(vote.scoreType),
        votes: [],
        voteCount: 0,
      });
    }
    const candidate = candidateMap.get(key)!;
    candidate.votes.push(vote);
    candidate.voteCount++;
  }

  // Find best candidate (most votes; break ties by highest score value)
  const candidates = Array.from(candidateMap.values())
    .sort((a, b) => b.voteCount - a.voteCount || b.scoreValue - a.scoreValue);

  const best = candidates[0];
  const second = candidates[1];

  // Determine confidence
  let confidence: MajorityResult['confidence'];
  if (best.voteCount >= totalJudges) {
    confidence = 'unanimous';
  } else if (best.voteCount >= majorityThreshold) {
    confidence = 'majority';
  } else if (second && best.voteCount === second.voteCount) {
    confidence = 'tied';
  } else {
    confidence = 'insufficient';
  }

  // Build judgeVotes map
  const judgeVotesMap: Record<string, { side: ScoreSide; scoreType: ScoreType } | null> = {};
  for (const vote of votes) {
    judgeVotesMap[vote.judgeId] = { side: vote.side, scoreType: vote.scoreType };
  }

  return {
    side: best.side,
    scoreType: confidence === 'tied' || confidence === 'insufficient' ? 'NO_SCORE' as ScoreType : best.scoreType,
    scoreValue: confidence === 'tied' || confidence === 'insufficient' ? 0 : best.scoreValue,
    judgeVotes: judgeVotesMap,
    confidence,
    voteCount: best.voteCount,
    totalJudges,
  };
}

// ─── Window-based evaluation ──────────────────────────────────────────────────

/**
 * Evaluate signals within a time window (default: 3 seconds).
 * Signals outside the window are ignored — they belong to a previous decision.
 */
export function evaluateMajorityInWindow(
  signals: JudgeVote[],
  windowMs: number = 3000,
  totalJudges: number = 4
): MajorityResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  const windowSignals = signals.filter(s => {
    const signalTime = new Date(s.signalAt).getTime();
    return signalTime >= windowStart;
  });

  return evaluateMajority(windowSignals, totalJudges);
}

// ─── Penalty majority ─────────────────────────────────────────────────────────

/**
 * Evaluate if a majority of judges flagged a penalty for a given side.
 */
export function evaluatePenaltyMajority(
  votes: JudgeVote[],
  side: ScoreSide,
  penaltyType: 'PENALTY_C1' | 'PENALTY_C2' | 'PENALTY_C3',
  totalJudges: number = 4
): { hasMajority: boolean; voteCount: number; threshold: number } {
  const threshold = Math.ceil((totalJudges + 1) / 2);
  const relevant = votes.filter(v => v.side === side && v.scoreType === penaltyType);
  return {
    hasMajority: relevant.length >= threshold,
    voteCount: relevant.length,
    threshold,
  };
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export function majorityConfidenceLabel(result: MajorityResult): string {
  switch (result.confidence) {
    case 'unanimous':    return `Unanimous (${result.voteCount}/${result.totalJudges})`;
    case 'majority':     return `Majority (${result.voteCount}/${result.totalJudges})`;
    case 'tied':         return `Tied — Referee decides`;
    case 'insufficient': return `Insufficient votes (${result.voteCount}/${result.totalJudges})`;
  }
}

export function majorityConfidenceColor(result: MajorityResult): string {
  switch (result.confidence) {
    case 'unanimous':    return 'text-emerald-400';
    case 'majority':     return 'text-yellow-400';
    case 'tied':         return 'text-orange-400';
    case 'insufficient': return 'text-muted-foreground';
  }
}
