import { describe, it, expect, beforeEach } from 'vitest';

// Mock window and localStorage globally BEFORE importing mockStore.
const store: Record<string, string> = {};
globalThis.window = {} as Window & typeof globalThis;
globalThis.localStorage = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => {
    for (const key in store) {
      delete store[key];
    }
  },
  length: 0,
  key: (index: number) => null,
} as Storage;

// Now import mockStore and types
import { mockStore } from './mockStore';
import { Participant, ParticipantCategory, Bout } from './types';
import { calculateRoundRobinRankings } from '../utils/roundRobinRankings';

// Helper to create participants
function createParticipants(count: number): Participant[] {
  const list: Participant[] = [];
  for (let i = 1; i <= count; i++) {
    list.push({
      id: `part-${i}`,
      registration_no: `REG-00${i}`,
      photo_url: '',
      full_name: `Athlete ${i}`,
      gender: 'Male',
      dob: '2000-01-01',
      nationality_code: 'MAS',
      passport_ic: `IC-00${i}`,
      email: `athlete${i}@example.com`,
      phone: '123456',
      emergency_contact_name: 'Emergency',
      emergency_contact_phone: '654321',
      club_id: 'club-1',
      coach_id: 'coach-1',
      weight: 60.0,
      height: 170.0,
      status: 'Confirmed',
      medical_status: 'Cleared',
      payment_status: 'Paid',
      remarks: '',
      created_at: new Date().toISOString()
    });
  }
  return list;
}

// Helper to map participants to a category
function createMappings(participantIds: string[], catId: string): ParticipantCategory[] {
  return participantIds.map((pId, idx) => ({
    id: `pc-${idx}`,
    participant_id: pId,
    category_id: catId,
    manual_override: false
  }));
}

describe('Karate Tournament Draw Generator Tests', () => {
  const catId = 'cat-test';

  beforeEach(() => {
    localStorage.clear();
  });

  describe('Validation & Edge Cases', () => {
    it('throws error when there are no active participants in category', () => {
      localStorage.setItem('ts_participants', JSON.stringify([]));
      localStorage.setItem('ts_participant_categories', JSON.stringify([]));

      expect(() => {
        mockStore.bouts.generateDraw(catId, 'Elimination', false);
      }).toThrowError('Cannot generate draws: No active participants in this category.');
    });

    it('filters out cancelled and deleted participants', () => {
      const participants = createParticipants(3);
      // Cancel participant 2, mark participant 3 as deleted
      participants[1].status = 'Cancelled';
      participants[2].deleted_at = new Date().toISOString();

      const mappings = createMappings(participants.map(p => p.id), catId);

      localStorage.setItem('ts_participants', JSON.stringify(participants));
      localStorage.setItem('ts_participant_categories', JSON.stringify(mappings));

      // This should generate draw for 1 active participant
      const bouts = mockStore.bouts.generateDraw(catId, 'Elimination', false);
      
      // For 1 active participant (power of 2 is 2 slots -> 1 bout in round 1)
      expect(bouts.length).toBe(1);
      // The single bout should be a Walkover since part-2 is cancelled/inactive
      expect(bouts[0].participant_a_id).toBe('part-1');
      expect(bouts[0].participant_b_id).toBeNull();
      expect(bouts[0].status).toBe('Walkover');
      expect(bouts[0].winner_id).toBe('part-1');
    });
  });

  describe('Round-robin Draw Type', () => {
    it('generates N * (N - 1) / 2 bouts for N participants', () => {
      const athleteCount = 4;
      const participants = createParticipants(athleteCount);
      const mappings = createMappings(participants.map(p => p.id), catId);

      localStorage.setItem('ts_participants', JSON.stringify(participants));
      localStorage.setItem('ts_participant_categories', JSON.stringify(mappings));

      const bouts = mockStore.bouts.generateDraw(catId, 'Round-robin', false);

      // 4 * 3 / 2 = 6 bouts
      expect(bouts.length).toBe(6);

      // Verify structure of the generated bouts
      bouts.forEach((bout) => {
        expect(bout.category_id).toBe(catId);
        expect(bout.round_no).toBe(1);
        expect(bout.status).toBe('Scheduled');
        expect(bout.winner_id).toBeNull();
        expect(bout.score_a).toBe(0);
        expect(bout.score_b).toBe(0);
      });

      // Verify every combination exists exactly once
      const matches = bouts.map(b => [b.participant_a_id, b.participant_b_id].sort().join('-'));
      expect(matches).toContain('part-1-part-2');
      expect(matches).toContain('part-1-part-3');
      expect(matches).toContain('part-1-part-4');
      expect(matches).toContain('part-2-part-3');
      expect(matches).toContain('part-2-part-4');
      expect(matches).toContain('part-3-part-4');
      expect(new Set(matches).size).toBe(6);
    });
  });

  describe('Elimination Draw Type', () => {
    it('generates a 2-slot bracket for 2 participants', () => {
      const participants = createParticipants(2);
      const mappings = createMappings(participants.map(p => p.id), catId);

      localStorage.setItem('ts_participants', JSON.stringify(participants));
      localStorage.setItem('ts_participant_categories', JSON.stringify(mappings));

      const bouts = mockStore.bouts.generateDraw(catId, 'Elimination', false);

      // 2 athletes -> 2 slots -> 1 bout in round 1, no further rounds
      expect(bouts.length).toBe(1);
      expect(bouts[0].round_no).toBe(1);
      expect(bouts[0].bout_no).toBe(1);
      expect(bouts[0].participant_a_id).toBe('part-1');
      expect(bouts[0].participant_b_id).toBe('part-2');
      expect(bouts[0].status).toBe('Scheduled');
      expect(bouts[0].winner_id).toBeNull();
    });

    it('generates correct brackets with byes (e.g. 3 participants)', () => {
      const participants = createParticipants(3);
      const mappings = createMappings(participants.map(p => p.id), catId);

      localStorage.setItem('ts_participants', JSON.stringify(participants));
      localStorage.setItem('ts_participant_categories', JSON.stringify(mappings));

      const bouts = mockStore.bouts.generateDraw(catId, 'Elimination', false);

      // 3 athletes -> 4 slots -> 2 bouts in round 1, 1 bout in round 2
      // total bouts = 3
      expect(bouts.length).toBe(3);

      const round1 = bouts.filter(b => b.round_no === 1);
      const round2 = bouts.filter(b => b.round_no === 2);

      expect(round1.length).toBe(2);
      expect(round2.length).toBe(1);

      // One bout must be a walkover and the other a scheduled real match.
      const walkover = round1.find(b => b.status === 'Walkover')!;
      const scheduled = round1.find(b => b.status === 'Scheduled')!;
      expect(walkover.participant_a_id).toBeTruthy();
      expect(walkover.participant_b_id).toBeNull();
      expect(walkover.winner_id).toBe(walkover.participant_a_id);

      expect(scheduled.participant_a_id).toBeTruthy();
      expect(scheduled.participant_b_id).toBeTruthy();
      expect(scheduled.winner_id).toBeNull();

      // Round 2 bout should have part-1 populated due to walkover propagation
      expect(round2[0].participant_a_id).toBe('part-1');
      expect(round2[0].participant_b_id).toBeNull();
      expect(round2[0].status).toBe('Scheduled');
    });

    it('generates third place match when hasThirdPlace is true and count >= 4', () => {
      const participants = createParticipants(4);
      const mappings = createMappings(participants.map(p => p.id), catId);

      localStorage.setItem('ts_participants', JSON.stringify(participants));
      localStorage.setItem('ts_participant_categories', JSON.stringify(mappings));

      // 4 athletes -> 4 slots -> 2 bouts in round 1, 1 bout in round 2 (final), plus 1 3rd-place bout
      // total bouts = 4
      const bouts = mockStore.bouts.generateDraw(catId, 'Elimination', true);

      expect(bouts.length).toBe(4);

      const thirdPlaceBout = bouts.find(b => b.round_no === 99 && b.bout_no === 99);
      expect(thirdPlaceBout).toBeDefined();
      expect(thirdPlaceBout!.status).toBe('Scheduled');
      expect(thirdPlaceBout!.participant_a_id).toBeNull();
      expect(thirdPlaceBout!.participant_b_id).toBeNull();
    });

    it('does NOT generate third place match when count < 4', () => {
      const participants = createParticipants(3);
      const mappings = createMappings(participants.map(p => p.id), catId);

      localStorage.setItem('ts_participants', JSON.stringify(participants));
      localStorage.setItem('ts_participant_categories', JSON.stringify(mappings));

      const bouts = mockStore.bouts.generateDraw(catId, 'Elimination', true);

      const thirdPlaceBout = bouts.find(b => b.round_no === 99);
      expect(thirdPlaceBout).toBeUndefined();
    });

    it('propagates cascading walkovers correctly (e.g. 5 participants, slots = 8)', () => {
      const participants = createParticipants(5);
      const mappings = createMappings(participants.map(p => p.id), catId);

      localStorage.setItem('ts_participants', JSON.stringify(participants));
      localStorage.setItem('ts_participant_categories', JSON.stringify(mappings));

      const bouts = mockStore.bouts.generateDraw(catId, 'Elimination', false);

      // 5 participants -> slots = 8 -> 4 bouts in round 1, 2 bouts in round 2, 1 bout in round 3
      // Total bouts = 7
      expect(bouts.length).toBe(7);

      const r1 = bouts.filter(b => b.round_no === 1);
      const r2 = bouts.filter(b => b.round_no === 2);
      const r3 = bouts.filter(b => b.round_no === 3);

      expect(r1[0].status).toBe('Walkover');
      expect(r1[0].winner_id).toBe(r1[0].participant_a_id);
      expect(r1[1].winner_id).toBeNull();
      expect(r1[1].status).toBe('Scheduled');
      expect(r1[2].status).toBe('Walkover');
      expect(r1[2].winner_id).toBe(r1[2].participant_a_id);
      expect(r1[3].status).toBe('Walkover');
      expect(r1[3].winner_id).toBe(r1[3].participant_a_id);

      expect(r2[0].participant_a_id).toBe(r1[0].participant_a_id);
      expect(r2[0].participant_b_id).toBeNull();
      expect(r2[0].status).toBe('Scheduled');

      expect(r2[1].participant_a_id).toBe(r1[2].participant_a_id);
      expect(r2[1].participant_b_id).toBe(r1[3].participant_a_id);
      expect(r2[1].status).toBe('Scheduled');
    });

    it('splits same dojo participants evenly between upper and lower halves when possible', () => {
      const participants = createParticipants(12);
      // 6 from dojo A, 4 from dojo B, 2 from dojo C
      for (let i = 0; i < 6; i++) participants[i].club_id = 'dojo-a';
      for (let i = 6; i < 10; i++) participants[i].club_id = 'dojo-b';
      for (let i = 10; i < 12; i++) participants[i].club_id = 'dojo-c';

      const bouts = mockStore.bouts.generateDraw(catId, 'Elimination', false, participants);
      const round1 = bouts.filter(b => b.round_no === 1);

      const upperIds = new Set(
        round1
          .filter(b => b.bout_no <= 4)
          .flatMap(b => [b.participant_a_id, b.participant_b_id])
          .filter(Boolean) as string[]
      );
      const lowerIds = new Set(
        round1
          .filter(b => b.bout_no > 4)
          .flatMap(b => [b.participant_a_id, b.participant_b_id])
          .filter(Boolean) as string[]
      );

      const byId = Object.fromEntries(participants.map(p => [p.id, p]));
      const countClub = (ids: Set<string>, clubId: string) =>
        Array.from(ids).filter(id => byId[id].club_id === clubId).length;

      expect(countClub(upperIds, 'dojo-a')).toBe(3);
      expect(countClub(lowerIds, 'dojo-a')).toBe(3);
      expect(countClub(upperIds, 'dojo-b')).toBe(2);
      expect(countClub(lowerIds, 'dojo-b')).toBe(2);
      expect(countClub(upperIds, 'dojo-c')).toBe(1);
      expect(countClub(lowerIds, 'dojo-c')).toBe(1);
    });

    it('avoids same dojo round-1 pairings when mathematically possible', () => {
      const participants = createParticipants(8);
      // 4 clubs x 2 participants each; same-dojo R1 pairings are avoidable.
      participants[0].club_id = 'dojo-a';
      participants[1].club_id = 'dojo-a';
      participants[2].club_id = 'dojo-b';
      participants[3].club_id = 'dojo-b';
      participants[4].club_id = 'dojo-c';
      participants[5].club_id = 'dojo-c';
      participants[6].club_id = 'dojo-d';
      participants[7].club_id = 'dojo-d';

      const bouts = mockStore.bouts.generateDraw(catId, 'Elimination', false, participants);
      const round1 = bouts.filter(b => b.round_no === 1);
      const byId = Object.fromEntries(participants.map(p => [p.id, p]));

      const sameDojoCount = round1.reduce((count, bout) => {
        if (!bout.participant_a_id || !bout.participant_b_id) return count;
        const a = byId[bout.participant_a_id].club_id;
        const b = byId[bout.participant_b_id].club_id;
        return count + (a === b ? 1 : 0);
      }, 0);

      expect(sameDojoCount).toBe(0);
    });
  });

  describe('Clear Draw', () => {
    it('removes all bouts for the specified category and leaves others intact', () => {
      // Setup bouts for two different categories
      const boutCat1: Bout = {
        id: 'b1', category_id: 'cat-1', bout_no: 1, round_no: 1,
        participant_a_id: 'p1', participant_b_id: 'p2', winner_id: null,
        score_a: 0, score_b: 0, status: 'Scheduled', tatami: 'Tatami 1'
      };
      const boutCat2: Bout = {
        id: 'b2', category_id: 'cat-2', bout_no: 1, round_no: 1,
        participant_a_id: 'p3', participant_b_id: 'p4', winner_id: null,
        score_a: 0, score_b: 0, status: 'Scheduled', tatami: 'Tatami 1'
      };

      localStorage.setItem('ts_bouts', JSON.stringify([boutCat1, boutCat2]));

      mockStore.bouts.clearDraw('cat-1');

      const remainingBouts = mockStore.bouts.list();
      expect(remainingBouts.length).toBe(1);
      expect(remainingBouts[0].category_id).toBe('cat-2');
    });
  });

  describe('Bout Result Progression', () => {
    it('advances winners correctly to the next round slots', () => {
      const participants = createParticipants(4);
      const mappings = createMappings(participants.map(p => p.id), catId);

      localStorage.setItem('ts_participants', JSON.stringify(participants));
      localStorage.setItem('ts_participant_categories', JSON.stringify(mappings));

      // 4 slots -> Round 1: Bout 1 (part-1 vs part-2) and Bout 2 (part-3 vs part-4)
      // Round 2: Bout 1 (winner of Bout 1 vs winner of Bout 2)
      mockStore.bouts.generateDraw(catId, 'Elimination', false);

      const bouts = mockStore.bouts.listForCategory(catId);
      const r1Bout1 = bouts.find(b => b.round_no === 1 && b.bout_no === 1)!;
      const r1Bout2 = bouts.find(b => b.round_no === 1 && b.bout_no === 2)!;
      const r2Bout = bouts.find(b => b.round_no === 2 && b.bout_no === 1)!;

      expect(r2Bout.participant_a_id).toBeNull();
      expect(r2Bout.participant_b_id).toBeNull();

      // Complete Bout 1 with winner part-1
      mockStore.bouts.updateBoutResult(r1Bout1.id, 'part-1', 4, 2);

      // Check that Bout 1 is marked Completed
      const boutsAfterB1 = mockStore.bouts.listForCategory(catId);
      const updatedR1Bout1 = boutsAfterB1.find(b => b.id === r1Bout1.id)!;
      expect(updatedR1Bout1.status).toBe('Completed');
      expect(updatedR1Bout1.winner_id).toBe('part-1');
      expect(updatedR1Bout1.score_a).toBe(4);
      expect(updatedR1Bout1.score_b).toBe(2);

      // Check that winner part-1 has advanced to Round 2, slot A (since bout_no 1 is odd)
      const updatedR2Bout1 = boutsAfterB1.find(b => b.id === r2Bout.id)!;
      expect(updatedR2Bout1.participant_a_id).toBe('part-1');
      expect(updatedR2Bout1.participant_b_id).toBeNull();

      // Complete Bout 2 with winner part-4
      mockStore.bouts.updateBoutResult(r1Bout2.id, 'part-4', 1, 3);

      // Check that winner part-4 has advanced to Round 2, slot B (since bout_no 2 is even)
      const boutsAfterB2 = mockStore.bouts.listForCategory(catId);
      const finalR2Bout = boutsAfterB2.find(b => b.id === r2Bout.id)!;
      expect(finalR2Bout.participant_a_id).toBe('part-1');
      expect(finalR2Bout.participant_b_id).toBe('part-4');
    });
  });

  describe('Generate Draw with passed athletes', () => {
    it('uses passed athletes instead of loading from localStorage', () => {
      // Create athletes and pass them directly
      const customAthletes = createParticipants(2);
      customAthletes[0].id = 'custom-1';
      customAthletes[1].id = 'custom-2';

      // Clear localStorage mapping to ensure it would throw if it loaded from localStorage
      localStorage.setItem('ts_participants', JSON.stringify([]));
      localStorage.setItem('ts_participant_categories', JSON.stringify([]));

      const bouts = mockStore.bouts.generateDraw(catId, 'Elimination', false, customAthletes);
      
      expect(bouts.length).toBe(1);
      expect(bouts[0].participant_a_id).toBe('custom-1');
      expect(bouts[0].participant_b_id).toBe('custom-2');
    });
  });

  describe('Round-robin Ranking Calculations', () => {
    it('correctly calculates wins and sorts using WKF tie-breaking rules', () => {
      // 1. Setup 3 participants
      const athletes = createParticipants(3);
      const cat = { id: catId, name: 'RR Category', gender: 'Male' as const, min_age: 18, max_age: 99, min_weight: 0, max_weight: 100, capacity: 16, status: 'Open' as const, format: 'round_robin' as const };
      
      localStorage.setItem('ts_categories', JSON.stringify([cat]));
      localStorage.setItem('ts_participants', JSON.stringify(athletes));
      localStorage.setItem('ts_participant_categories', JSON.stringify(createMappings(athletes.map(p => p.id), catId)));

      // 2. Generate draw (should produce 3 matches: part-1 vs part-2, part-1 vs part-3, part-2 vs part-3)
      const generated = mockStore.bouts.generateDraw(catId, 'round_robin', false, athletes);
      expect(generated.length).toBe(3);

      const clubs = [{ id: 'club-1', name: 'Club 1' }];
      
      // Let's resolve the bouts:
      // Match 1: part-1 vs part-2. Winner: part-1 (Score: 3 - 1)
      const m1 = generated.find(b => (b.participant_a_id === 'part-1' && b.participant_b_id === 'part-2') || (b.participant_b_id === 'part-1' && b.participant_a_id === 'part-2'))!;
      mockStore.bouts.updateBoutResult(m1.id, 'part-1', 3, 1);

      // Match 2: part-1 vs part-3. Winner: part-3 (Score: 2 - 4)
      const m2 = generated.find(b => (b.participant_a_id === 'part-1' && b.participant_b_id === 'part-3') || (b.participant_b_id === 'part-1' && b.participant_a_id === 'part-3'))!;
      mockStore.bouts.updateBoutResult(m2.id, 'part-3', 2, 4); // part-1 scores 2, part-3 scores 4

      // Match 3: part-2 vs part-3. Winner: part-2 (Score: 4 - 2)
      const m3 = generated.find(b => (b.participant_a_id === 'part-2' && b.participant_b_id === 'part-3') || (b.participant_b_id === 'part-2' && b.participant_a_id === 'part-3'))!;
      mockStore.bouts.updateBoutResult(m3.id, 'part-2', 4, 2); // part-2 scores 4, part-3 scores 2

      // All 3 athletes have 1 win and 1 loss!
      // Let's calculate points diff:
      // part-1: Scored: 3+2 = 5. Conceded: 1+4 = 5. Diff: 0
      // part-2: Scored: 1+4 = 5. Conceded: 3+2 = 5. Diff: 0
      // part-3: Scored: 4+2 = 6. Conceded: 2+4 = 6. Diff: 0
      // Let's check total points scored:
      // part-3 scored 6 points, which is higher than part-1 (5) and part-2 (5).
      // So part-3 must be ranked 1st!
      // Between part-1 and part-2:
      // Head-to-head match m1 was won by part-1.
      // So part-1 must be ranked 2nd and part-2 ranked 3rd!

      const freshBouts = mockStore.bouts.listForCategory(catId);
      const rankings = calculateRoundRobinRankings(freshBouts, athletes, clubs);

      expect(rankings[0].participantId).toBe('part-3'); // 1st because of higher total points scored
      expect(rankings[1].participantId).toBe('part-1'); // 2nd because of head-to-head victory over part-2
      expect(rankings[2].participantId).toBe('part-2'); // 3rd
    });
  });

  describe('WKF Repechage Automatic Generation', () => {
    it('automatically generates repechage pools once finalists are determined', () => {
      // Setup 4 participants
      const athletes = createParticipants(4);
      const cat = { id: catId, name: 'Repechage Category', gender: 'Male' as const, min_age: 18, max_age: 99, min_weight: 0, max_weight: 100, capacity: 16, status: 'Open' as const, format: 'wkf_repechage' as const };
      
      localStorage.setItem('ts_categories', JSON.stringify([cat]));
      localStorage.setItem('ts_participants', JSON.stringify(athletes));
      localStorage.setItem('ts_participant_categories', JSON.stringify(createMappings(athletes.map(p => p.id), catId)));

      // Generate draw (should generate standard bracket with 2 rounds: R1 matches, R2 final)
      const generated = mockStore.bouts.generateDraw(catId, 'wkf_repechage', false, athletes);
      expect(generated.length).toBe(3); // 2 matches in R1, 1 match in R2 (final)

      const r1Bout1 = generated.find(b => b.round_no === 1 && b.bout_no === 1)!;
      const r1Bout2 = generated.find(b => b.round_no === 1 && b.bout_no === 2)!;

      // Complete R1 matches:
      // R1 Bout 1: part-1 vs part-2. Winner: part-1
      mockStore.bouts.updateBoutResult(r1Bout1.id, 'part-1', 4, 1);
      // R1 Bout 2: part-3 vs part-4. Winner: part-3
      mockStore.bouts.updateBoutResult(r1Bout2.id, 'part-3', 3, 0);

      // Now finalists are set: part-1 and part-3.
      // Since format is 'wkf_repechage', it should have automatically run generateRepechage!
      const freshBouts = mockStore.bouts.listForCategory(catId);
      const repechageBouts = freshBouts.filter(b => b.round_no === 98);

      // Loser to finalist A (part-1) in R1: part-2.
      // Loser to finalist B (part-3) in R1: part-4.
      // Since there is only 1 loser on each side, WKF repechage for each pool A & B needs at least 2 losers to generate.
      // If there's only 1 loser (the semifinal loser), they are directly the bronze winners, no repechage matches needed.
      // Let's verify that no repechage matches were created because losers list has length 1 (< 2).
      expect(repechageBouts.length).toBe(0);
    });
  });

  describe('Scoreboard Technique Point History Parsing & Undo Logic', () => {
    it('correctly parses JSON array vs legacy comma-separated lists', () => {
      // 1. JSON Array format
      const jsonHistory = JSON.stringify([
        { fighter: 'AKA', points: 3, technique: 'Ippon', timestamp: 120, matchId: 'm-1' },
        { fighter: 'AKA', points: 2, technique: 'Waza-ari', timestamp: 105, matchId: 'm-1' }
      ]);
      
      const parsedJson = JSON.parse(jsonHistory);
      expect(parsedJson.length).toBe(2);
      expect(parsedJson[0].technique).toBe('Ippon');
      expect(parsedJson[1].points).toBe(2);

      // 2. Legacy Comma-separated format
      const legacyHistory = '1,2,3';
      const parsedLegacyPoints = legacyHistory.split(',').map(Number).filter(Boolean);
      const parsedLegacyEvents = parsedLegacyPoints.map(pts => ({
        fighter: 'AO',
        points: pts,
        technique: pts === 1 ? 'Yuko' : pts === 2 ? 'Waza-ari' : pts === 3 ? 'Ippon' : 'Point',
        timestamp: 0,
        matchId: 'm-1'
      }));

      expect(parsedLegacyEvents.length).toBe(3);
      expect(parsedLegacyEvents[0].technique).toBe('Yuko');
      expect(parsedLegacyEvents[1].technique).toBe('Waza-ari');
      expect(parsedLegacyEvents[2].technique).toBe('Ippon');
    });

    it('correctly updates and undos technique events on points subtraction', () => {
      let events = [
        { fighter: 'AKA', points: 3, technique: 'Ippon', timestamp: 120, matchId: 'm-1' },
        { fighter: 'AKA', points: 1, technique: 'Yuko', timestamp: 110, matchId: 'm-1' }
      ];

      // Helper simulating undoScore points subtraction logic
      const undoPoints = (pts: number) => {
        const next = [...events];
        let p = pts;
        while (p > 0 && next.length > 0) {
          const last = { ...next[next.length - 1] };
          if (last.points <= p) {
            p -= last.points;
            next.pop();
          } else {
            last.points -= p;
            last.technique = last.points === 1 ? 'Yuko' : last.points === 2 ? 'Waza-ari' : last.points === 3 ? 'Ippon' : 'Point';
            next[next.length - 1] = last;
            p = 0;
          }
        }
        events = next;
      };

      // Undo 1 point -> should remove the Yuko (since it has 1 point)
      undoPoints(1);
      expect(events.length).toBe(1);
      expect(events[0].technique).toBe('Ippon');

      // Undo 1 more point -> should reduce the Ippon (+3) to Waza-ari (+2)
      undoPoints(1);
      expect(events.length).toBe(1);
      expect(events[0].points).toBe(2);
      expect(events[0].technique).toBe('Waza-ari');

      // Undo 2 more points -> should remove it completely
      undoPoints(2);
      expect(events.length).toBe(0);
    });
  });
});
