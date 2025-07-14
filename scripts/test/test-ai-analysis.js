import 'dotenv/config';
import OpenAI from 'openai';

// Initialize OpenAI client
const openaiApiKey = process.env.VITE_OPENAI_API_KEY;

if (!openaiApiKey) {
  console.error('Missing VITE_OPENAI_API_KEY environment variable');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

// Test AI frame analysis functionality
async function testAIAnalysis() {
  console.log('🚀 Testing OpenAI Vision API for frame analysis...\n');

  try {
    const imageUrl = process.argv[2];
    
    if (!imageUrl) {
      console.error('Please provide an image URL as argument');
      console.log('Usage: node test-ai-analysis.js <image-url>');
      console.log('Example: node test-ai-analysis.js https://example.com/image.jpg');
      process.exit(1);
    }

    console.log(`🖼️  Analyzing image: ${imageUrl}`);

    // Test 1: Basic frame analysis
    console.log('\n📋 Test 1: Basic cooking analysis');
    const basicPrompt = "What's happening in this cooking video frame? Describe any ingredients, cooking techniques, or equipment you can see.";
    
    const basicResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: basicPrompt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      max_tokens: 300,
    });

    console.log('Response:', basicResponse.choices[0].message.content);

    // Test 2: Ingredient detection
    console.log('\n🥗 Test 2: Ingredient detection');
    const ingredientPrompt = "List all the ingredients you can identify in this cooking video frame. Format as a bullet list.";
    
    const ingredientResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: ingredientPrompt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      max_tokens: 200,
    });

    console.log('Ingredients:', ingredientResponse.choices[0].message.content);

    // Test 3: Cooking technique identification
    console.log('\n👨‍🍳 Test 3: Cooking technique identification');
    const techniquePrompt = "What cooking technique or method is being demonstrated in this frame? Be specific about the action being performed.";
    
    const techniqueResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: techniquePrompt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      max_tokens: 150,
    });

    console.log('Technique:', techniqueResponse.choices[0].message.content);

    // Test 4: Social media detection
    console.log('\n📱 Test 4: Social media handle detection');
    const socialPrompt = "Are there any social media handles, usernames, or watermarks visible in this image? If yes, list them. If no, say 'None found'.";
    
    const socialResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: socialPrompt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      max_tokens: 100,
    });

    console.log('Social handles:', socialResponse.choices[0].message.content);

    // Calculate token usage
    const totalTokens = [basicResponse, ingredientResponse, techniqueResponse, socialResponse]
      .reduce((sum, response) => sum + response.usage.total_tokens, 0);
    
    console.log(`\n💰 Total tokens used: ${totalTokens}`);
    console.log(`Estimated cost: $${(totalTokens * 0.00015 / 1000).toFixed(4)} (at $0.15/1M tokens)`);

    console.log('\n✨ AI analysis test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error.response) {
      console.error('API Error:', error.response.data);
    }
    process.exit(1);
  }
}

// Test multiple images if provided
async function testMultipleImages() {
  const imageUrls = process.argv.slice(2);
  
  if (imageUrls.length === 0) {
    console.error('Please provide at least one image URL');
    console.log('Usage: node test-ai-analysis.js <image-url-1> [image-url-2] ...');
    process.exit(1);
  }

  if (imageUrls.length === 1) {
    await testAIAnalysis();
  } else {
    console.log(`🎯 Testing ${imageUrls.length} images...\n`);
    
    for (let i = 0; i < imageUrls.length; i++) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`Image ${i + 1}/${imageUrls.length}`);
      console.log(`${'='.repeat(50)}`);
      
      // Override argv for single image test
      process.argv = [process.argv[0], process.argv[1], imageUrls[i]];
      await testAIAnalysis();
    }
  }
}

// Run the test
testMultipleImages();