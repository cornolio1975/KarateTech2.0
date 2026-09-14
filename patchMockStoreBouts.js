const fs = require('fs');

const mockStorePath = 'c:\\Users\\svana\\Projects\\KarateTech2.0\\src\\db\\mockStore.ts';
let code = fs.readFileSync(mockStorePath, 'utf8');

const newCategoriesCode = `
import { TOURNAMENT_BRACKETS } from './bracketDatabase2026';

const SEED_CATEGORIES: Category[] = TOURNAMENT_BRACKETS.categories.map((c, i) => ({
  id: c.categoryId,
  name: c.name,
  gender: (c.gender === "Mixed" ? "Male" : c.gender) as "Male" | "Female",
  min_age: 0,
  max_age: 99,
  min_weight: 0,
  max_weight: 999,
  capacity: 64,
  status: 'Open',
  format: 'knockout',
  discipline: (c.discipline || (c.name.includes('KATA') ? 'Kata' : 'Kumite')) as "Kata" | "Kumite" | "Team Kata" | "Team Kumite"
}));

const SEED_PARTICIPANTS: Participant[] = [];
const SEED_PARTICIPANT_CATEGORIES: ParticipantCategory[] = [];
const SEED_BOUTS: Bout[] = [];
let pcId = 1;

TOURNAMENT_BRACKETS.categories.forEach(c => {
  c.participants.forEach(p => {
    if (!SEED_PARTICIPANTS.find(ex => ex.id === p.participantId)) {
      SEED_PARTICIPANTS.push({
        id: p.participantId,
        registration_no: 'REG-' + p.participantId,
        full_name: p.name,
        club_id: 'club-1',
        gender: (c.gender === "Mixed" ? "Male" : c.gender) as "Male" | "Female",
        dob: '2000-01-01',
        weight: 60,
        height: 170,
        status: 'Confirmed',
        medical_status: 'Cleared',
        payment_status: 'Paid',
      });
    }
    SEED_PARTICIPANT_CATEGORIES.push({
      id: 'pc-' + (pcId++),
      participant_id: p.participantId,
      category_id: c.categoryId,
      manual_override: true
    });
  });

  // Pre-load all bouts exactly as provided in the JSON!
  c.rounds.forEach(r => {
    r.bouts.forEach(b => {
      SEED_BOUTS.push({
        id: b.boutId,
        category_id: c.categoryId,
        bout_no: b.position,
        round_no: r.round,
        participant_a_id: b.red || null,
        participant_b_id: b.blue || null,
        winner_id: b.winnerId || null,
        score_a: 0,
        score_b: 0,
        status: b.status === 'bye' ? 'Walkover' : (b.status === 'completed' ? 'Completed' : 'Scheduled'),
        tatami: 'Tatami 1',
        senshu_a: false,
        senshu_b: false,
        penalties_a: '',
        penalties_b: '',
        penalties_c1_a: '0',
        penalties_c2_a: '0',
        penalties_c3_a: '0',
        penalties_c1_b: '0',
        penalties_c2_b: '0',
        penalties_c3_b: '0',
        points_aka_history: '',
        points_ao_history: '',
        victory_method: '',
        timer_seconds: 180,
        timer_active: false
      });
    });
  });
});
`;

// Replace the previous dynamic block
code = code.replace(/import \{ TOURNAMENT_BRACKETS \} from '\.\/bracketDatabase2026';[\s\S]*?\}\);/m, newCategoriesCode.trim());

// We also need to update mockStore.bouts.list() to return SEED_BOUTS instead of [] initially!
code = code.replace(/list: \(\): Bout\[\] => getStoreData\('ts_bouts', \[\]\),/g, "list: (): Bout[] => getStoreData('ts_bouts', SEED_BOUTS),");

// Force version bump so it clears local storage cache
code = code.replace(/const SEED_VERSION = 'v[\d.]+';/g, "const SEED_VERSION = 'v1.5." + Date.now() + "';");

fs.writeFileSync(mockStorePath, code);
console.log('Patched mockStore.ts successfully with Pre-loaded SEED_BOUTS');
