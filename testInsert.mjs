import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const payload = {
    pc_identifier: 'test_pc',
    pc_name: 'Test PC',
    status: 'online',
    last_heartbeat: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('tournament_pcs')
    .upsert(payload, { onConflict: 'pc_identifier' })
    .select()
    .single();

  console.log("Data:", data);
  console.log("Error type:", typeof error);
  if (error) {
    console.log("Error keys:", Object.keys(error));
    console.log("Error stringify:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.log("Error object:", error);
  }
}

testInsert();
