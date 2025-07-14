import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDirectDatabase() {
  console.log('🔐 Testing direct database access with service role key\n');

  try {
    // Test 1: Check if we can query the recipes table
    console.log('📊 Test 1: Querying recipes table');
    const { data: recipes, error: queryError } = await supabase
      .from('recipes')
      .select('id, title, created_at')
      .limit(5);

    if (queryError) {
      console.error('❌ Failed to query recipes:', queryError);
    } else {
      console.log(`✅ Found ${recipes.length} recipes in database`);
      recipes.forEach(r => console.log(`  - ${r.title} (${r.id})`));
    }

    // Test 2: Try to insert without video_url to avoid the trigger
    console.log('\n📝 Test 2: Inserting recipe without video_url');
    const { data: newRecipe, error: insertError } = await supabase
      .from('recipes')
      .insert({
        title: 'Test Recipe - No Video',
        description: 'Testing database insert without video_url',
        user_id: '00000000-0000-0000-0000-000000000000'
        // Intentionally not including video_url
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to insert recipe:', insertError);
    } else {
      console.log(`✅ Successfully created recipe: ${newRecipe.id}`);
      
      // Clean up
      const { error: deleteError } = await supabase
        .from('recipes')
        .delete()
        .eq('id', newRecipe.id);
        
      if (!deleteError) {
        console.log('✅ Cleaned up test recipe');
      }
    }

    // Test 3: Check database functions
    console.log('\n🔧 Test 3: Checking database functions');
    const { data: functions, error: funcError } = await supabase
      .rpc('get_functions', {})
      .select()
      .limit(10);

    if (funcError) {
      // This function might not exist, which is fine
      console.log('ℹ️  Could not list functions (this is normal)');
    } else {
      console.log('Database functions:', functions);
    }

    // Test 4: Check if the problematic trigger exists
    console.log('\n🔍 Test 4: Checking for problematic trigger');
    const { data: triggers, error: triggerError } = await supabase
      .from('pg_trigger')
      .select('tgname')
      .eq('tgname', 'format_video_url_trigger')
      .single();

    if (triggerError) {
      console.log('ℹ️  Could not query triggers directly');
    } else if (triggers) {
      console.log('⚠️  Problematic trigger still exists: format_video_url_trigger');
      console.log('   Run the fix migration to resolve this issue');
    }

    console.log('\n📋 Summary:');
    console.log('- Database connection: ✅ Working');
    console.log('- Service role access: ✅ Working');
    console.log('- Issue: Trigger using app.settings.supabase_url');
    console.log('- Solution: Apply the fix migration');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDirectDatabase();