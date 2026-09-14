const fs = require('fs');

const mockStorePath = 'c:\\Users\\svana\\Projects\\KarateTech2.0\\src\\db\\mockStore.ts';
let code = fs.readFileSync(mockStorePath, 'utf8');

// The replacement logic:
const newCategoriesCode = `
import { TOURNAMENT_BRACKETS } from './bracketDatabase2026';

const SEED_CATEGORIES: Category[] = TOURNAMENT_BRACKETS.categories.map((c, i) => ({
  id: c.categoryId,
  name: c.name,
  gender: c.gender,
  min_age: 0,
  max_age: 99,
  min_weight: 0,
  max_weight: 999,
  capacity: 64,
  status: 'Open',
  format: 'knockout',
  discipline: c.discipline || (c.name.includes('KATA') ? 'Kata' : 'Kumite')
}));

const SEED_PARTICIPANTS: Participant[] = [];
const SEED_PARTICIPANT_CATEGORIES: ParticipantCategory[] = [];
let pcId = 1;

TOURNAMENT_BRACKETS.categories.forEach(c => {
  c.participants.forEach(p => {
    if (!SEED_PARTICIPANTS.find(ex => ex.id === p.participantId)) {
      SEED_PARTICIPANTS.push({
        id: p.participantId,
        registration_no: 'REG-' + p.participantId,
        full_name: p.name,
        club_id: 'club-1',
        gender: c.gender,
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
});
`;

// Replace SEED_CATEGORIES
code = code.replace(/const SEED_CATEGORIES: Category\[\] = \[[\s\S]*?\];/, '');
// Replace SEED_PARTICIPANTS
code = code.replace(/const SEED_PARTICIPANTS: Participant\[\] = \[[\s\S]*?\];/, '');
// Replace SEED_PARTICIPANT_CATEGORIES
code = code.replace(/const SEED_PARTICIPANT_CATEGORIES: ParticipantCategory\[\] = \[[\s\S]*?\];/, '');

// Add our dynamic generator before SEED_TEAMS
code = code.replace('const SEED_TEAMS:', newCategoriesCode + '\nconst SEED_TEAMS:');

// Force version bump so it clears local storage cache
code = code.replace(/const SEED_VERSION = 'v[\d.]+';/g, "const SEED_VERSION = 'v1.4." + Date.now() + "';");

fs.writeFileSync(mockStorePath, code);
console.log('Patched mockStore.ts successfully');
