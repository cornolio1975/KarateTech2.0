import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const accounts = [
  'admin@spsportdatasolution.org',
  'tatami_1@spsportdatasolution.org',
  'tatami_2@spsportdatasolution.org'
];

const NEW_PASSWORD = 'Karatetech@123';

async function resetPasswords() {
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error("Error fetching users:", listError);
    return;
  }

  for (const email of accounts) {
    const user = users.find(u => u.email === email);
    if (user) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        password: NEW_PASSWORD
      });
      
      if (updateError) {
        console.error(`Failed to update password for ${email}:`, updateError.message);
      } else {
        console.log(`Successfully updated password for ${email} to ${NEW_PASSWORD}`);
      }
    } else {
      console.log(`Account ${email} not found in Supabase Auth!`);
    }
  }
}

resetPasswords();
