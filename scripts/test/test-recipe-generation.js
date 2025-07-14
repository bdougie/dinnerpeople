import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize clients
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const openaiApiKey = process.env.VITE_OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey || !openaiApiKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

// Generate recipe summary from frame descriptions
async function generateRecipeSummary(frameDescriptions) {
  const cookingSteps = frameDescriptions
    .map((frame, index) => `${index + 1}. ${frame.description}`)
    .join('\n');

  const prompt = `Based on these cooking video frames, generate a comprehensive recipe:

${cookingSteps}

Please provide:
1. Recipe title
2. Brief description
3. Ingredient list with quantities
4. Step-by-step instructions
5. Cooking time and servings

Format the response as JSON with keys: title, description, ingredients (array), instructions (array), cookingTime, servings`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a professional chef creating recipes from cooking video analysis.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 800,
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content);
}

// Test recipe generation functionality
async function testRecipeGeneration() {
  console.log('🚀 Testing recipe summary generation...\n');

  try {
    // Test 1: Generate recipe from sample frame descriptions
    console.log('📝 Test 1: Basic recipe generation from frame descriptions');
    
    const sampleFrames = [
      {
        timestamp: 0,
        description: "A chef is preparing ingredients on a wooden cutting board. There are fresh tomatoes, garlic cloves, fresh basil leaves, and olive oil visible."
      },
      {
        timestamp: 5,
        description: "The chef is finely chopping garlic with a chef's knife. The chopped garlic is being collected on the side of the cutting board."
      },
      {
        timestamp: 10,
        description: "Olive oil is being heated in a large stainless steel pan on medium heat. The oil is starting to shimmer."
      },
      {
        timestamp: 15,
        description: "The chopped garlic is being added to the hot oil. It's sizzling and releasing aroma, being stirred with a wooden spoon."
      },
      {
        timestamp: 20,
        description: "Fresh tomatoes are being added to the pan with garlic. The chef is crushing them with the wooden spoon to release their juices."
      },
      {
        timestamp: 25,
        description: "The tomato sauce is simmering. Fresh basil leaves are being torn and added to the sauce. Salt and pepper are being added."
      },
      {
        timestamp: 30,
        description: "Cooked spaghetti is being added to the pan with the tomato sauce. The chef is tossing the pasta to coat it evenly."
      },
      {
        timestamp: 35,
        description: "The finished pasta is being plated in a white bowl, garnished with fresh basil leaves and a drizzle of olive oil."
      }
    ];

    console.log('Frame descriptions provided:');
    sampleFrames.forEach(frame => {
      console.log(`  ${frame.timestamp}s: ${frame.description.substring(0, 60)}...`);
    });

    console.log('\n🤖 Generating recipe summary...');
    const recipe = await generateRecipeSummary(sampleFrames);
    
    console.log('\n✅ Generated Recipe:');
    console.log(`Title: ${recipe.title}`);
    console.log(`Description: ${recipe.description}`);
    console.log(`Cooking Time: ${recipe.cookingTime}`);
    console.log(`Servings: ${recipe.servings}`);
    
    console.log('\nIngredients:');
    recipe.ingredients.forEach(ingredient => {
      console.log(`  • ${ingredient}`);
    });
    
    console.log('\nInstructions:');
    recipe.instructions.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step}`);
    });

    // Test 2: Test with database integration
    console.log('\n\n💾 Test 2: Recipe generation with database storage');
    
    // Create a test recipe in database
    const { data: dbRecipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        title: 'Test Recipe Generation',
        description: 'Testing recipe generation',
        video_url: 'https://example.com/test-video.mp4',
        user_id: '00000000-0000-0000-0000-000000000000'
      })
      .select()
      .single();

    if (recipeError) {
      console.error('❌ Failed to create test recipe:', recipeError);
      return;
    }

    console.log(`✅ Created test recipe: ${dbRecipe.id}`);

    // Store frame descriptions
    const frameData = sampleFrames.map(frame => ({
      recipe_id: dbRecipe.id,
      timestamp: frame.timestamp,
      description: frame.description,
      frame_url: `https://example.com/frame-${frame.timestamp}.jpg`
    }));

    const { error: framesError } = await supabase
      .from('frame_descriptions')
      .insert(frameData);

    if (framesError) {
      console.error('❌ Failed to store frame descriptions:', framesError);
      return;
    }

    console.log('✅ Stored frame descriptions');

    // Fetch and generate summary
    const { data: storedFrames, error: fetchError } = await supabase
      .from('frame_descriptions')
      .select('timestamp, description')
      .eq('recipe_id', dbRecipe.id)
      .order('timestamp', { ascending: true });

    if (fetchError) {
      console.error('❌ Failed to fetch frames:', fetchError);
      return;
    }

    console.log(`✅ Retrieved ${storedFrames.length} frame descriptions`);

    const generatedRecipe = await generateRecipeSummary(storedFrames);

    // Update recipe with generated content
    const { error: updateError } = await supabase
      .from('recipes')
      .update({
        title: generatedRecipe.title,
        description: generatedRecipe.description,
        ingredients: generatedRecipe.ingredients,
        instructions: generatedRecipe.instructions,
        cooking_time_minutes: parseInt(generatedRecipe.cookingTime) || 30,
        servings: generatedRecipe.servings
      })
      .eq('id', dbRecipe.id);

    if (updateError) {
      console.error('❌ Failed to update recipe:', updateError);
    } else {
      console.log('✅ Updated recipe with generated content');
    }

    // Test 3: Social media attribution
    console.log('\n\n🏷️  Test 3: Testing social media attribution extraction');
    
    const socialFrames = [
      {
        timestamp: 0,
        description: "Opening title card showing '@ChefJohnDoe' watermark in the corner"
      },
      {
        timestamp: 40,
        description: "End card showing 'Follow @ChefJohnDoe on Instagram for more recipes'"
      }
    ];

    const socialPrompt = `Extract any social media handles or attribution from these frames:
${socialFrames.map(f => f.description).join('\n')}

Return JSON with keys: handles (array of {platform, handle}), originalUrl`;

    const socialResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: socialPrompt }],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const attribution = JSON.parse(socialResponse.choices[0].message.content);
    console.log('Extracted attribution:', JSON.stringify(attribution, null, 2));

    // Cleanup
    console.log('\n\n🗑️  Cleaning up test data...');
    
    // Delete frame descriptions
    await supabase
      .from('frame_descriptions')
      .delete()
      .eq('recipe_id', dbRecipe.id);

    // Delete recipe
    const { error: deleteError } = await supabase
      .from('recipes')
      .delete()
      .eq('id', dbRecipe.id);

    if (!deleteError) {
      console.log('✅ Test data cleaned up');
    }

    console.log('\n✨ Recipe generation test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Test token usage and cost estimation
async function estimateUsage() {
  console.log('\n💰 Estimating token usage for typical workflow:');
  
  const typicalFrameCount = 12; // 1 minute video at 5-second intervals
  const avgDescriptionTokens = 50;
  const summaryPromptTokens = 400;
  const summaryResponseTokens = 600;
  
  const totalTokens = (typicalFrameCount * avgDescriptionTokens) + summaryPromptTokens + summaryResponseTokens;
  const costPer1M = 0.15; // GPT-4o-mini pricing
  const estimatedCost = (totalTokens / 1000000) * costPer1M;
  
  console.log(`  Frames: ${typicalFrameCount}`);
  console.log(`  Total tokens: ~${totalTokens}`);
  console.log(`  Estimated cost per recipe: $${estimatedCost.toFixed(4)}`);
  console.log(`  Cost for 1000 recipes: $${(estimatedCost * 1000).toFixed(2)}`);
}

// Run the tests
testRecipeGeneration().then(() => estimateUsage());