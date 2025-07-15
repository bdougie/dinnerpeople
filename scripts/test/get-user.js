import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: users } = await supabase.from('users').select('id').limit(1);
if (users && users.length > 0) {
  console.log(users[0].id);
} else {
  console.log('no-users');
}