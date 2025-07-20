import OpenAI from 'openai';
import { supabase } from './supabase';
import * as PromptUtils from './prompt-utils';
import { RecipeSummary } from './prompt-utils';
import { OPENAI_IMAGE_MODEL, OPENAI_TEXT_MODEL } from './constants';

const openai = new OpenAI({
  apiKey: import.meta.env['VITE_OPENAI_API_KEY'],
  dangerouslyAllowBrowser: true // Note: In production, API calls should be made from backend
});

/**
 * Validates if a URL is from an allowed Supabase storage domain
 */
function isAllowedSupabaseUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const supabaseProjectId = import.meta.env['VITE_SUPABASE_URL']?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    
    if (!supabaseProjectId) return false;
    
    // Allow only URLs from our Supabase storage
    const allowedHosts = [
      `${supabaseProjectId}.supabase.co`,
      // Local development URLs that are already validated by our app
      'localhost',
      '127.0.0.1'
    ];
    
    return allowedHosts.some(host => parsedUrl.hostname === host || parsedUrl.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

/**
 * Safely converts an image URL to base64 with validation
 */
async function safeImageToBase64(imageUrl: string): Promise<string | null> {
  // Validate the URL is from allowed sources
  if (!isAllowedSupabaseUrl(imageUrl)) {
    console.warn('[Security] Blocked fetch to non-allowed URL:', imageUrl);
    return null;
  }
  
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    // Validate content type is an image
    if (!blob.type.startsWith('image/')) {
      console.warn('[Security] Blocked non-image content type:', blob.type);
      return null;
    }
    
    const buffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    return `data:${blob.type};base64,${base64}`;
  } catch (error) {
    console.error('[Security] Failed to fetch image:', error);
    return null;
  }
}

export async function analyzeFrame(imageUrl: string, customPrompt?: string): Promise<string> {
  
  // Check if API key is configured
  if (!import.meta.env['VITE_OPENAI_API_KEY']) {
    return 'Frame analysis unavailable - OpenAI API key not configured';
  }
  
  try {
    let finalImageUrl = imageUrl;
    
    // Convert image to base64 if needed, with security validation
    if (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1') || imageUrl.includes('supabase.co')) {
      const base64Image = await safeImageToBase64(imageUrl);
      if (base64Image) {
        finalImageUrl = base64Image;
      } else {
        throw new Error('Failed to fetch image for analysis - invalid or unauthorized URL');
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

    const description = response.choices[0]?.message?.content || '';
    return description;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return 'Frame analysis failed - Invalid API key';
      }
    }
    throw error;
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  
  // Check if API key is configured
  if (!import.meta.env['VITE_OPENAI_API_KEY']) {
    return [];
  }
  
  try {
    // Use OpenAI embeddings API with explicit dimensions
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 1536 // Explicitly set to match our database column
    });
    
    const embedding = response.data[0]?.embedding || [];
    return embedding;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        // Auth error handled
      } else if (error.message.includes('rate limit')) {
        // Rate limit error handled
      }
    }
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
    
  } catch {
    // Even if embedding fails, try to store the frame without embedding
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
  }
}

export async function processVideoFrames(videoId: string, frames: { timestamp: number, imageUrl: string }[]) {
  const descriptions: { timestamp: number, description: string }[] = [];
  const BATCH_SIZE = 3; // Process 3 frames at a time to balance speed and rate limits
  const RATE_LIMIT_DELAY = 1000; // 1 second delay between batches
  
  // Process frames in batches
  for (let i = 0; i < frames.length; i += BATCH_SIZE) {
    const batch = frames.slice(i, i + BATCH_SIZE);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (frame) => {
      try {
        const description = await analyzeFrame(frame.imageUrl);
        
        // Store frame with embedding
        await storeFrameWithEmbedding(videoId, frame.timestamp, description, frame.imageUrl);
        
        return {
          timestamp: frame.timestamp,
          description,
          success: true
        };
      } catch {
        // Try to store frame with error description
        try {
          await storeFrameWithEmbedding(
            videoId, 
            frame.timestamp, 
            'Frame processing failed', 
            frame.imageUrl
          );
        } catch {
          // Storage error handled
        }
        
        return {
          timestamp: frame.timestamp,
          description: 'Frame processing failed',
          success: false
        };
      }
    });
    
    // Wait for batch to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Collect successful descriptions
    batchResults.forEach(result => {
      descriptions.push({
        timestamp: result.timestamp,
        description: result.description
      });
    });
    
    // Log batch completion
    
    // Add delay between batches to avoid rate limits (except for last batch)
    if (i + BATCH_SIZE < frames.length) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
  }
  
  return descriptions;
}

/**
 * Generate a recipe title and description based on analyzed frames using OpenAI
 */
export async function generateRecipeSummary(cookingSteps: string): Promise<PromptUtils.RecipeSummary> {
  
  // Check if API key is configured
  if (!import.meta.env['VITE_OPENAI_API_KEY']) {
    return {
      title: 'Untitled Recipe',
      description: 'This recipe was created automatically from a cooking video. Enable OpenAI to get detailed descriptions.'
    };
  }
  
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
    
    const summary = PromptUtils.parseRecipeSummaryResponse(responseText);
    
    return summary;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        // Auth error handled
      }
    }
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
  
  // Check if API key is configured
  if (!import.meta.env['VITE_OPENAI_API_KEY']) {
    return `Untitled Recipe ${new Date().toLocaleDateString()}`;
  }
  
  try {
    let finalImageUrl = thumbnailUrl;
    
    // Convert image to base64 if needed, with security validation
    if (thumbnailUrl.includes('localhost') || thumbnailUrl.includes('127.0.0.1') || thumbnailUrl.includes('supabase.co')) {
      const base64Image = await safeImageToBase64(thumbnailUrl);
      if (base64Image) {
        finalImageUrl = base64Image;
      }
      // If conversion fails, continue with original URL (OpenAI will handle it)
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
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        // Auth error handled
      }
    }
    return `Untitled Recipe ${new Date().toLocaleDateString()}`;
  }
}