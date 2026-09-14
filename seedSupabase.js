const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, val] = line.split('=');
  if (key && val) acc[key.trim()] = val.trim();
  return acc;
}, {});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const brackets = JSON.parse(fs.readFileSync('./src/db/tournamentBrackets.json', 'utf-8'));

async function run() {
  const { data: dbCategories, error: errCat } = await supabase.from('categories').select('id, name');
  if (errCat) throw errCat;

  const { data: dbParticipants, error: errPart } = await supabase.from('participants').select('id, full_name, club_id');
  if (errPart) throw errPart;

  const bouts = [];
  let mappedCats = 0;
  let missingParts = 0;
  let totalParts = 0;

  const normalizeName = (n) => n.trim().toUpperCase().replace(/\s+/g, ' ').replace(/\(\d+\s+ATHLETES\)/g, '').trim();

  brackets.categories.forEach(c => {
    const jsonNorm = normalizeName(c.name);
    const matchCat = dbCategories.find(dbC => normalizeName(dbC.name) === jsonNorm || normalizeName(dbC.name).includes(jsonNorm) || jsonNorm.includes(normalizeName(dbC.name)));
    
    if (!matchCat) return;
    mappedCats++;

    const participantMap = {};
    if (c.participants) {
      c.participants.forEach(p => {
        participantMap[p.participantId] = p.name;
      });
    }

    c.rounds.forEach(r => {
      r.bouts.forEach(b => {
        const findParticipantId = (localId) => {
          if (!localId) return null;
          let fullName = participantMap[localId];
          if (!fullName) return null;
          
          totalParts++;
          let cleanName = fullName.replace('…', '').replace('...', '').trim().toLowerCase();
          
          let match = dbParticipants.find(p => p.full_name.trim().toLowerCase() === cleanName);
          if (!match) {
            match = dbParticipants.find(p => p.full_name.trim().toLowerCase().startsWith(cleanName));
          }
          if (!match) {
             match = dbParticipants.find(p => p.full_name.trim().toLowerCase().includes(cleanName));
          }
          
          if (!match) {
            console.warn(`Could not map participant: ${fullName}`);
            missingParts++;
          }
          return match ? match.id : null;
        };

        const partA_id = findParticipantId(b.red);
        const partB_id = findParticipantId(b.blue);
        const winner_id = findParticipantId(b.winnerId);

        bouts.push({
          category_id: matchCat.id,
          bout_no: b.position,
          round_no: r.round,
          participant_a_id: partA_id,
          participant_b_id: partB_id,
          winner_id: winner_id,
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

  console.log(`Missing participants: ${missingParts} out of ${totalParts} mapped slots.`);

  if (bouts.length > 0) {
    const { data: allBouts } = await supabase.from('bouts').select('id');
    if (allBouts && allBouts.length > 0) {
      const ids = allBouts.map(b => b.id);
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        await supabase.from('bouts').delete().in('id', chunk);
      }
    }

    const chunkSize = 100;
    for (let i = 0; i < bouts.length; i += chunkSize) {
      const chunk = bouts.slice(i, i + chunkSize);
      await supabase.from('bouts').insert(chunk);
    }
    console.log('Seed completed successfully! The draw should now display.');
  }
}

run().catch(console.error);
