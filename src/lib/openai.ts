import OpenAI from 'openai';
import { supabase } from './supabase';
import * as PromptUtils from './prompt-utils';
import { RecipeSummary } from './prompt-utils';
import { OPENAI_IMAGE_MODEL, OPENAI_TEXT_MODEL } from './constants';

const openai = new OpenAI({
  apiKey: import.meta.env['VITE_OPENAI_API_KEY'],
  dangerouslyAllowBrowser: true // Note: In production, API calls should be made from backend
});

export async function analyzeFrame(imageUrl: string, customPrompt?: string): Promise<string> {
  try {
    let finalImageUrl = imageUrl;
    
    // If the image URL is from localhost, fetch and convert to base64
    if (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1')) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        finalImageUrl = `data:${blob.type};base64,${base64}`;
      } catch (fetchError) {
        console.error('Error fetching local image:', fetchError);
        throw new Error('Failed to fetch local image for analysis');
      }
    }
    
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
                url: finalImageUrl
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
    // Use OpenAI embeddings API with explicit dimensions
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 1536 // Explicitly set to match our database column
    });
    
    console.log(`Generated embedding with ${response.data[0].embedding.length} dimensions`);
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating OpenAI embedding:', error);
    // Return empty array to allow frame storage to continue
    return [];
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
    
    // Store in database with embedding (or null if embedding failed)
    const { error } = await supabase
      .from('video_frames')
      .insert({
        recipe_id: recipeId,
        timestamp,
        description,
        image_url: imageUrl,
        embedding: embedding.length > 0 ? embedding : null
      });
      
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error storing frame with embedding:', error);
    // Even if embedding fails, try to store the frame without embedding
    try {
      const { error: fallbackError } = await supabase
        .from('video_frames')
        .insert({
          recipe_id: recipeId,
          timestamp,
          description,
          image_url: imageUrl,
          embedding: null
        });
      
      if (fallbackError) {
        throw fallbackError;
      }
      console.log('Frame stored without embedding due to embedding generation failure');
    } catch (fallbackError) {
      console.error('Error storing frame even without embedding:', fallbackError);
      throw fallbackError;
    }
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
  _cookingSteps: string,
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

/**
 * Generate a title for a video based on its thumbnail
 */
export async function generateVideoTitle(thumbnailUrl: string): Promise<string> {
  try {
    let finalImageUrl = thumbnailUrl;
    
    // If the image URL is from localhost, fetch and convert to base64
    if (thumbnailUrl.includes('localhost') || thumbnailUrl.includes('127.0.0.1')) {
      try {
        const response = await fetch(thumbnailUrl);
        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        finalImageUrl = `data:${blob.type};base64,${base64}`;
      } catch (fetchError) {
        console.error('Error fetching local thumbnail:', fetchError);
        // Continue with the original URL
      }
    }
    
    const response = await openai.chat.completions.create({
      model: OPENAI_IMAGE_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: PromptUtils.PROMPTS.VIDEO_TITLE_GENERATION
            },
            {
              type: "image_url",
              image_url: {
                url: finalImageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 50
    });

    const title = response.choices[0]?.message?.content?.trim() || '';
    
    // Validate the title
    if (title && title.length > 0 && title.length <= 60) {
      return title;
    }
    
    // Fallback to default
    return `Untitled Recipe ${new Date().toLocaleDateString()}`;
  } catch (error) {
    console.error('Error generating video title:', error);
    return `Untitled Recipe ${new Date().toLocaleDateString()}`;
  }
}