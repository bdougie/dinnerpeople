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
  console.log('[DEBUG] Starting frame analysis for:', imageUrl.substring(0, 100) + '...');
  
  // Check if API key is configured
  if (!import.meta.env['VITE_OPENAI_API_KEY']) {
    console.warn('[DEBUG] OpenAI API key not configured, returning placeholder description');
    return 'Frame analysis unavailable - OpenAI API key not configured';
  }
  
  try {
    let finalImageUrl = imageUrl;
    
    // If the image URL is from localhost, fetch and convert to base64
    if (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1')) {
      console.log('[DEBUG] Converting local image to base64 for analysis');
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        finalImageUrl = `data:${blob.type};base64,${base64}`;
        console.log('[DEBUG] Image converted to base64 successfully');
      } catch (fetchError) {
        console.error('[DEBUG] Error fetching local image:', fetchError);
        throw new Error('Failed to fetch local image for analysis');
      }
    }
    
    console.log('[DEBUG] Calling OpenAI for frame analysis');
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
    console.log('[DEBUG] Frame analysis completed, description length:', description.length);
    return description;
  } catch (error) {
    console.error('[DEBUG] Error analyzing frame:', error);
    if (error instanceof Error) {
      console.error('[DEBUG] Error details:', error.message);
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.error('[DEBUG] OpenAI API key appears to be invalid');
        return 'Frame analysis failed - Invalid API key';
      }
    }
    throw error;
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  console.log('[DEBUG] Generating embedding for text of length:', text.length);
  
  // Check if API key is configured
  if (!import.meta.env['VITE_OPENAI_API_KEY']) {
    console.warn('[DEBUG] OpenAI API key not configured, returning empty embedding');
    return [];
  }
  
  try {
    // Use OpenAI embeddings API with explicit dimensions
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 1536 // Explicitly set to match our database column
    });
    
    const embedding = response.data[0].embedding;
    console.log(`[DEBUG] Generated embedding successfully with ${embedding.length} dimensions`);
    return embedding;
  } catch (error) {
    console.error('[DEBUG] Error generating OpenAI embedding:', error);
    if (error instanceof Error) {
      console.error('[DEBUG] Error details:', error.message);
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.error('[DEBUG] OpenAI API key appears to be invalid');
      } else if (error.message.includes('rate limit')) {
        console.error('[DEBUG] OpenAI rate limit exceeded');
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
  console.log(`[DEBUG] Storing frame for recipe ${recipeId} at ${timestamp}s`);
  
  try {
    // Generate embedding for the description
    const embedding = await generateEmbedding(description);
    
    // Store in database with embedding (or null if embedding failed)
    console.log(`[DEBUG] Inserting frame with ${embedding.length > 0 ? 'embedding' : 'null embedding'}`);
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
      console.error('[DEBUG] Error inserting frame:', error);
      throw error;
    }
    
    console.log(`[DEBUG] Frame stored successfully at ${timestamp}s`);
  } catch (error) {
    console.error('[DEBUG] Error storing frame with embedding:', error);
    // Even if embedding fails, try to store the frame without embedding
    try {
      console.log('[DEBUG] Attempting fallback storage without embedding');
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
        console.error('[DEBUG] Fallback storage also failed:', fallbackError);
        throw fallbackError;
      }
      console.log('[DEBUG] Frame stored without embedding due to embedding generation failure');
    } catch (fallbackError) {
      console.error('[DEBUG] Error storing frame even without embedding:', fallbackError);
      throw fallbackError;
    }
  }
}

export async function processVideoFrames(videoId: string, frames: { timestamp: number, imageUrl: string }[]) {
  console.log(`[DEBUG] Starting batch processing of ${frames.length} frames for video ${videoId}`);
  const descriptions: { timestamp: number, description: string }[] = [];
  const BATCH_SIZE = 3; // Process 3 frames at a time to balance speed and rate limits
  const RATE_LIMIT_DELAY = 1000; // 1 second delay between batches
  
  // Process frames in batches
  for (let i = 0; i < frames.length; i += BATCH_SIZE) {
    const batch = frames.slice(i, i + BATCH_SIZE);
    console.log(`[DEBUG] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(frames.length / BATCH_SIZE)}`);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (frame) => {
      try {
        console.log(`[DEBUG] Analyzing frame at ${frame.timestamp}s`);
        const description = await analyzeFrame(frame.imageUrl);
        
        // Store frame with embedding
        await storeFrameWithEmbedding(videoId, frame.timestamp, description, frame.imageUrl);
        
        return {
          timestamp: frame.timestamp,
          description,
          success: true
        };
      } catch (error) {
        console.error(`[DEBUG] Error processing frame at ${frame.timestamp}s:`, error);
        
        // Try to store frame with error description
        try {
          await storeFrameWithEmbedding(
            videoId, 
            frame.timestamp, 
            'Frame processing failed', 
            frame.imageUrl
          );
        } catch (storeError) {
          console.error(`[DEBUG] Failed to store error frame at ${frame.timestamp}s:`, storeError);
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
    const successCount = batchResults.filter(r => r.success).length;
    console.log(`[DEBUG] Batch completed: ${successCount}/${batch.length} frames processed successfully`);
    
    // Add delay between batches to avoid rate limits (except for last batch)
    if (i + BATCH_SIZE < frames.length) {
      console.log(`[DEBUG] Waiting ${RATE_LIMIT_DELAY}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
  }
  
  console.log(`[DEBUG] Frame processing completed: ${descriptions.length}/${frames.length} frames processed`);
  return descriptions;
}

/**
 * Generate a recipe title and description based on analyzed frames using OpenAI
 */
export async function generateRecipeSummary(cookingSteps: string): Promise<PromptUtils.RecipeSummary> {
  console.log('[DEBUG] Generating recipe summary from cooking steps');
  
  // Check if API key is configured
  if (!import.meta.env['VITE_OPENAI_API_KEY']) {
    console.warn('[DEBUG] OpenAI API key not configured, using default recipe summary');
    return {
      title: 'Untitled Recipe',
      description: 'This recipe was created automatically from a cooking video. Enable OpenAI to get detailed descriptions.'
    };
  }
  
  try {
    // Format the prompt with the cooking steps
    const prompt = PromptUtils.PROMPTS.RECIPE_SUMMARY.replace('{steps}', cookingSteps);
    console.log('[DEBUG] Recipe summary prompt length:', prompt.length);
    
    // Use OpenAI to generate a title and description
    console.log('[DEBUG] Calling OpenAI for recipe summary generation');
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
    console.log('[DEBUG] OpenAI recipe summary response received, length:', responseText.length);
    
    const summary = PromptUtils.parseRecipeSummaryResponse(responseText);
    console.log('[DEBUG] Parsed recipe summary:', { title: summary.title, descriptionLength: summary.description.length });
    
    return summary;
  } catch (error) {
    console.error('[DEBUG] Error generating recipe summary with OpenAI:', error);
    if (error instanceof Error) {
      console.error('[DEBUG] Error details:', error.message);
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.error('[DEBUG] OpenAI API key appears to be invalid');
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
  console.log('[DEBUG] Starting title generation from thumbnail');
  
  // Check if API key is configured
  if (!import.meta.env['VITE_OPENAI_API_KEY']) {
    console.warn('[DEBUG] OpenAI API key not configured, using default title');
    return `Untitled Recipe ${new Date().toLocaleDateString()}`;
  }
  
  try {
    let finalImageUrl = thumbnailUrl;
    
    // If the image URL is from localhost, fetch and convert to base64
    if (thumbnailUrl.includes('localhost') || thumbnailUrl.includes('127.0.0.1')) {
      console.log('[DEBUG] Converting local thumbnail to base64');
      try {
        const response = await fetch(thumbnailUrl);
        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        finalImageUrl = `data:${blob.type};base64,${base64}`;
        console.log('[DEBUG] Thumbnail converted to base64 successfully');
      } catch (fetchError) {
        console.error('[DEBUG] Error fetching local thumbnail:', fetchError);
        // Continue with the original URL
      }
    }
    
    console.log('[DEBUG] Calling OpenAI for title generation');
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
    console.log('[DEBUG] OpenAI response:', title);
    
    // Validate the title
    if (title && title.length > 0 && title.length <= 60) {
      console.log('[DEBUG] Title validated successfully:', title);
      return title;
    }
    
    console.log('[DEBUG] Title validation failed, using fallback');
    // Fallback to default
    return `Untitled Recipe ${new Date().toLocaleDateString()}`;
  } catch (error) {
    console.error('[DEBUG] Error generating video title:', error);
    if (error instanceof Error) {
      console.error('[DEBUG] Error details:', error.message);
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.error('[DEBUG] OpenAI API key appears to be invalid');
      }
    }
    return `Untitled Recipe ${new Date().toLocaleDateString()}`;
  }
}