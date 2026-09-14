import { supabase } from './src/db/dbClient.js';

async function checkSchema() {
  const { data, error } = await supabase.from('tournaments').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    if (data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
    } else {
      console.log('No rows, cannot infer columns this way.');
    }
  }
}

checkSchema();
