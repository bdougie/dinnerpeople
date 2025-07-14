import OpenAI from 'openai';
import { supabase, formatAttribution } from './supabase';
import * as PromptUtils from './prompt-utils';
import { RecipeSummary } from './prompt-utils';
import { OPENAI_IMAGE_MODEL, OPENAI_TEXT_MODEL, OPENAI_EMBED_MODEL } from './constants';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, API calls should be made from backend
});

export async function analyzeFrame(imageUrl: string, customPrompt?: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_IMAGE_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: customPrompt || PromptUtils.PROMPTS.FRAME_ANALYSIS
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 150
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error analyzing frame:', error);
    throw error;
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: OPENAI_EMBED_MODEL,
      input: text,
      encoding_format: "float"
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

export async function storeFrameWithEmbedding(
  recipeId: string, 
  timestamp: number,
  description: string,
  imageUrl: string
): Promise<void> {
  try {
    // Generate embedding for the description
    const embedding = await generateEmbedding(description);
    
    // Store in database with embedding
    const { error } = await supabase
      .from('video_frames')
      .insert({
        recipe_id: recipeId,
        timestamp,
        description,
        image_url: imageUrl,
        embedding
      });
      
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error storing frame with embedding:', error);
    throw error;
  }
}

export async function processVideoFrames(videoId: string, frames: { timestamp: number, imageUrl: string }[]) {
  const descriptions: { timestamp: number, description: string }[] = [];

  // Process frames sequentially to avoid rate limits
  for (const frame of frames) {
    try {
      const description = await analyzeFrame(frame.imageUrl);
      descriptions.push({
        timestamp: frame.timestamp,
        description
      });

      // Store each frame description as we get it
      await storeFrameWithEmbedding(videoId, frame.timestamp, description, frame.imageUrl);

    } catch (error) {
      console.error(`Error processing frame at ${frame.timestamp}:`, error);
    }
  }

  return descriptions;
}

/**
 * Generate a recipe title and description based on analyzed frames using OpenAI
 */
export async function generateRecipeSummary(cookingSteps: string): Promise<PromptUtils.RecipeSummary> {
  try {
    // Format the prompt with the cooking steps
    const prompt = PromptUtils.PROMPTS.RECIPE_SUMMARY.replace('{steps}', cookingSteps);
    
    // Use OpenAI to generate a title and description
    const response = await openai.chat.completions.create({
      model: OPENAI_TEXT_MODEL,
      messages: [
        {
          role: "system", 
          content: "You are a culinary expert specializing in creating engaging and accurate recipe titles and descriptions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const responseText = response.choices[0]?.message?.content || '';
    return PromptUtils.parseRecipeSummaryResponse(responseText);
  } catch (error) {
    console.error('Error generating recipe summary with OpenAI:', error);
    return {
      title: 'Untitled Recipe',
      description: 'This recipe was created automatically from a cooking video.'
    };
  }
}

/**
 * Generate a recipe summary with a custom prompt
 */
export async function generateRecipeSummaryWithCustomPrompt(
  cookingSteps: string,
  customPrompt: string
): Promise<PromptUtils.RecipeSummary> {
  try {
    // Use OpenAI to generate a title and description with the custom prompt
    const response = await openai.chat.completions.create({
      model: OPENAI_TEXT_MODEL,
      messages: [
        {
          role: "system", 
          content: "You are a culinary expert specializing in creating engaging and accurate recipe titles and descriptions."
        },
        {
          role: "user",
          content: customPrompt
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const responseText = response.choices[0]?.message?.content || '';
    return PromptUtils.parseRecipeSummaryResponse(responseText);
  } catch (error) {
    console.error('Error generating recipe summary with custom prompt:', error);
    return {
      title: 'Error Generating Recipe',
      description: 'There was an error processing this recipe with the custom prompt.'
    };
  }
}

/**
 * Update recipe with AI-generated title and description
 */
export async function updateRecipeWithSummary(recipeId: string): Promise<RecipeSummary> {
  return PromptUtils.summarizeAndUpdateRecipe(recipeId, generateRecipeSummary);
}

/**
 * Generate recipe summary without updating the database (for previews)
 */
export async function summarize(recipeId: string): Promise<PromptUtils.RecipeSummary> {
  return PromptUtils.summarize(recipeId, generateRecipeSummary);
}