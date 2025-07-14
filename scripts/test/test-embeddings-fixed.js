import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize Supabase client with service role
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiApiKey = process.env.VITE_OPENAI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
  console.error('Missing required environment variables');
  console.log('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

console.log('🔐 Using service role key for database access\n');

// Generate embedding for text
async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

// Test embedding storage and retrieval
async function testEmbeddings() {
  console.log('🚀 Testing pgvector embedding storage in Supabase...\n');

  try {
    // Test 1: Generate embeddings for cooking descriptions
    console.log('📊 Test 1: Generating embeddings for cooking descriptions');
    
    const testDescriptions = [
      "Chopping onions with a sharp chef's knife on a wooden cutting board",
      "Sautéing garlic and onions in olive oil until golden brown",
      "Adding tomatoes and herbs to make a pasta sauce",
      "Boiling pasta in salted water until al dente",
      "Plating the finished pasta dish with fresh basil garnish"
    ];

    const embeddings = [];
    
    for (const description of testDescriptions) {
      console.log(`\n🔄 Processing: "${description.substring(0, 50)}..."`);
      const embedding = await generateEmbedding(description);
      console.log(`✅ Generated embedding (dimension: ${embedding.length})`);
      embeddings.push({ description, embedding });
    }

    // Test 2: Store embeddings in database using the helper function
    console.log('\n💾 Test 2: Storing embeddings in database');
    
    // Use the test helper function instead of direct insert
    const { data: recipe, error: recipeError } = await supabase
      .rpc('test_create_recipe', {
        p_title: 'Test Recipe for Embeddings',
        p_description: 'Testing embedding storage',
        p_video_url: 'videos/test-video.mp4',
        p_user_id: '00000000-0000-0000-0000-000000000000'
      });

    if (recipeError) {
      console.error('❌ Failed to create test recipe:', recipeError);
      
      // If the function doesn't exist, try direct insert with service role
      console.log('🔄 Trying direct insert with service role key...');
      const { data: directRecipe, error: directError } = await supabase
        .from('recipes')
        .insert({
          title: 'Test Recipe for Embeddings',
          description: 'Testing embedding storage',
          video_url: 'videos/test-video.mp4',
          user_id: '00000000-0000-0000-0000-000000000000'
        })
        .select('id')
        .single();
        
      if (directError) {
        console.error('❌ Direct insert also failed:', directError);
        return;
      }
      
      console.log(`✅ Created test recipe using direct insert: ${directRecipe.id}`);
      recipe = directRecipe.id;
    } else {
      console.log(`✅ Created test recipe using helper function: ${recipe}`);
    }

    const recipeId = typeof recipe === 'string' ? recipe : recipe.id;

    // Store frame descriptions with embeddings
    const frameData = embeddings.map((item, index) => ({
      recipe_id: recipeId,
      timestamp: index * 5, // 5 seconds apart
      description: item.description,
      embedding: item.embedding,
      frame_url: `frames/test-frame-${index}.jpg`
    }));

    const { data: frames, error: framesError } = await supabase
      .from('video_frames')
      .insert(frameData)
      .select();

    if (framesError) {
      console.error('❌ Failed to store embeddings:', framesError);
      
      // Try to understand the error better
      if (framesError.message.includes('dimension')) {
        console.log('💡 Tip: The error might be related to embedding dimensions.');
        console.log(`   Your embeddings have ${embeddings[0].embedding.length} dimensions.`);
        console.log('   Check if the database column expects a different dimension.');
      }
      
      // Cleanup the recipe
      await supabase.from('recipes').delete().eq('id', recipeId);
      return;
    }

    console.log(`✅ Stored ${frames.length} frame embeddings`);

    // Test 3: Vector similarity search
    console.log('\n🔍 Test 3: Testing vector similarity search');
    
    const searchQueries = [
      "cutting vegetables",
      "cooking sauce",
      "preparing pasta"
    ];

    for (const query of searchQueries) {
      console.log(`\n🔎 Searching for: "${query}"`);
      
      // Generate embedding for search query
      const queryEmbedding = await generateEmbedding(query);
      
      // Perform vector similarity search using RPC function
      const { data: results, error: searchError } = await supabase
        .rpc('match_frames', {
          query_embedding: queryEmbedding,
          match_threshold: 0.7,
          match_count: 3
        });

      if (searchError) {
        console.error('❌ Search failed:', searchError);
        continue;
      }

      if (results && results.length > 0) {
        console.log(`Found ${results.length} matches:`);
        results.forEach((result, index) => {
          console.log(`  ${index + 1}. ${result.description.substring(0, 60)}...`);
          console.log(`     Similarity: ${result.similarity.toFixed(3)}`);
        });
      } else {
        console.log('No matches found');
      }
    }

    // Test 4: Aggregate embeddings for recipe summary
    console.log('\n📈 Test 4: Testing embedding aggregation');
    
    const { data: allFrames, error: allFramesError } = await supabase
      .from('video_frames')
      .select('embedding, description')
      .eq('recipe_id', recipeId);

    if (allFramesError) {
      console.error('❌ Failed to fetch frames:', allFramesError);
    } else {
      console.log(`✅ Retrieved ${allFrames.length} frame embeddings`);
      
      // Calculate average embedding (simple aggregation)
      const avgEmbedding = allFrames[0].embedding.map((_, i) => {
        const sum = allFrames.reduce((acc, frame) => acc + frame.embedding[i], 0);
        return sum / allFrames.length;
      });
      
      console.log(`✅ Calculated average embedding (dimension: ${avgEmbedding.length})`);
    }

    // Cleanup
    console.log('\n🗑️  Cleaning up test data...');
    
    // Delete frames
    const { error: deleteFramesError } = await supabase
      .from('video_frames')
      .delete()
      .eq('recipe_id', recipeId);

    if (deleteFramesError) {
      console.error('❌ Failed to delete frames:', deleteFramesError);
    }

    // Delete recipe
    const { error: deleteRecipeError } = await supabase
      .from('recipes')
      .delete()
      .eq('id', recipeId);

    if (deleteRecipeError) {
      console.error('❌ Failed to delete recipe:', deleteRecipeError);
    } else {
      console.log('✅ Test data cleaned up');
    }

    console.log('\n✨ Embedding test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testEmbeddings();