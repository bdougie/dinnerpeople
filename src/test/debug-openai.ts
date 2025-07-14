/**
 * Debug script to test OpenAI integration
 * Run with: npx tsx src/test/debug-openai.ts
 */

import { config } from 'dotenv';
config();

// Mock window object for Node.js environment
global.window = {
  location: {
    hostname: 'production.com' // Force production mode to use OpenAI
  }
} as unknown as Window & typeof globalThis;

import { ai } from '../lib/ai';

async function debugOpenAI() {
  console.log('🔍 Testing OpenAI Integration...\n');

  try {
    // Test 1: Frame Analysis
    console.log('1️⃣ Testing Frame Analysis:');
    const testImageUrl = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800';
    const frameResult = await ai.analyzeFrame(testImageUrl);
    console.log('✅ Frame Analysis Result:', frameResult);
    console.log('');

    // Test 2: Recipe Summary
    console.log('2️⃣ Testing Recipe Summary Generation:');
    const cookingSteps = `
      Step 1: Chef is preparing vegetables - slicing tomatoes and chopping onions
      Step 2: Adding oil to the pan and heating it up
      Step 3: Sautéing the vegetables with garlic
      Step 4: Adding pasta to the boiling water
      Step 5: Mixing the cooked pasta with the vegetable sauce
    `;
    
    const summaryResult = await ai.generateRecipeSummaryWithCustomPrompt(
      cookingSteps,
      'Based on these cooking steps, create a recipe title and description in JSON format: {steps}'
    );
    console.log('✅ Recipe Summary:', summaryResult);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the debug script
debugOpenAI();