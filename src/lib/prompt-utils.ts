import { supabase } from './supabase';

/**
 * Common interfaces for recipe data
 */
export interface RecipeSummary {
  title: string;
  description: string;
  ingredients?: string[];
}

/**
 * Prompt templates for AI models
 */
export const PROMPTS = {
  FRAME_ANALYSIS: 
    `Analyze this image and identify the food shown. 
    If you are uncertain, DO NOT GUESS specific dishes.
    Instead, describe what you can see with certainty (colors, textures, etc).
    Is this: 1) A dessert, 2) A main dish, 3) A side dish, 4) Something else?`,
  
  SOCIAL_MEDIA_DETECTION:
    `Analyze the provided image carefully and locate any visible social media
    handles or usernames (e.g., @username for Instagram/TikTok, YouTube channel
    names, etc.). Focus on text overlays or prominent text elements in the
    image. If a social handle is detected, respond in this exact format:
    ‘SOCIAL:platform:username’ (e.g., ‘SOCIAL:instagram:foodiefromvt’). If no
    social media handle is visible, respond with ‘SOCIAL:none’. Ignore any
    blurred faces or unrelated elements in the image.`,
  
  RECIPE_SUMMARY: 
    `Based on the following video frame descriptions, create a concise recipe title and detailed description.
    The title should be appealing, descriptive, and under 60 characters.
    The description should be 1 sentences summarizing the dish, key ingredients, and cooking methods seen in the video.
    
    Video frame descriptions:
    {steps}
    
    YOU MUST FORMAT YOUR RESPONSE AS VALID JSON with only 'title' and 'description' fields.
    For example: {"title": "Recipe Title", "description": "Recipe description text"}
    
    If you cannot determine what the recipe is about, respond with:
    {"title": "Unknown Recipe", "description": "The recipe content could not be determined from the video frames."}`
}

/**
 * Get all frame descriptions for a recipe
 */
export async function getFrameDescriptions(recipeId: string): Promise<string[]> {
  const { data: frames, error } = await supabase
    .from('video_frames')
    .select('description, timestamp')
    .eq('recipe_id', recipeId)
    .order('timestamp', { ascending: true });
  
  if (error) throw error;
  
  if (!frames || frames.length === 0) {
    throw new Error('No frames found for this recipe');
  }
  
  return frames.map(frame => frame.description);
}

/**
 * Format frame descriptions into a chronological narrative
 */
export function formatCookingSteps(descriptions: string[]): string {
  return descriptions.join('\n\n');
}

/**
 * Parse JSON response or return default values
 */
export function parseRecipeSummaryResponse(response: string): RecipeSummary {
  // Log the raw response to see what we're getting
  console.log('[DEBUG] Raw response before parsing:', response);
  console.log('[DEBUG] Response type:', typeof response);
  console.log('[DEBUG] Response length:', response?.length);
  
  try {
    // Log the first 100 characters to get a preview
    console.log('[DEBUG] Response preview:', response?.substring(0, 100));
    
    const parsed = JSON.parse(response);
    console.log('[DEBUG] Successfully parsed JSON:', parsed);
    
    return {
      title: parsed.title || 'Untitled Recipe',
      description: parsed.description || 'No description available',
      ingredients: parsed.ingredients || []
    };
  } catch (e) {
    console.error('Failed to parse AI response as JSON:', e);
    // Log more details about the error
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    console.error('[DEBUG] Error details:', errorMessage);
    
    return {
      title: 'Unknown Recipe',
      description: 'The recipe content could not be determined from the video frames.',
      ingredients: []
    };
  }
}

/**
 * Update recipe with summary information
 */
export async function updateRecipeWithGeneratedSummary(
  recipeId: string, 
  summary: RecipeSummary
): Promise<void> {
  try {
    const { error } = await supabase
      .from('recipes')
      .update({
        title: summary.title,
        description: summary.description,
        ingredients: summary.ingredients || [],
        ai_generated: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', recipeId);
      
    if (error) throw error;
    
    console.log('[DEBUG] Updated recipe with AI-generated summary:', summary);
  } catch (error) {
    console.error('Error updating recipe with summary:', error);
    throw error;
  }
}

/**
 * Complete recipe summarization process (fetch frames, generate summary, update database)
 */
export async function summarizeAndUpdateRecipe(
  recipeId: string,
  generateSummaryFn: (cookingSteps: string) => Promise<RecipeSummary>
): Promise<RecipeSummary> {
  try {
    // Get frame descriptions
    const descriptions = await getFrameDescriptions(recipeId);
    
    // Format cooking steps
    const cookingSteps = formatCookingSteps(descriptions);
    
    // Generate summary using the provided function (either OpenAI or Ollama)
    const summary = await generateSummaryFn(cookingSteps);
    
    // Update recipe in database
    await updateRecipeWithGeneratedSummary(recipeId, summary);
    
    return summary;
  } catch (error) {
    console.error('Error in summarizeAndUpdateRecipe:', error);
    const fallback = {
      title: 'Unknown Recipe',
      description: 'The recipe content could not be determined from the video frames.'
    };
    await updateRecipeWithGeneratedSummary(recipeId, fallback);
    return fallback;
  }
}

/**
 * Generate recipe summary from frame descriptions without database updates
 * This is useful for preview or testing purposes
 */
export async function summarize(
  recipeId: string,
  generateSummaryFn: (cookingSteps: string) => Promise<RecipeSummary>
): Promise<RecipeSummary> {
  try {
    // Get frame descriptions
    const descriptions = await getFrameDescriptions(recipeId);
    
    // Format cooking steps
    const cookingSteps = formatCookingSteps(descriptions);
    
    // Generate summary using the provided function (either OpenAI or Ollama)
    return await generateSummaryFn(cookingSteps);
  } catch (error) {
    console.error('Error in summarize:', error);
    return {
      title: 'Unknown Recipe',
      description: 'The recipe content could not be determined from the video frames.'
    };
  }
}

/**
 * Extract social media handles from end frames
 */
export async function extractSocialHandles(
  recipeId: string, 
  analyzeFrameFn: (imageUrl: string, prompt?: string) => Promise<string>
): Promise<string[]> {
  try {
    // Get the last 2 frames of the video
    const { data: frames, error } = await supabase
      .from('video_frames')
      .select('image_url')
      .eq('recipe_id', recipeId)
      .order('timestamp', { ascending: false })
      .limit(2);
    
    if (error) throw error;
    if (!frames || frames.length === 0) return [];
    
    const socialHandles: string[] = [];
    
    // Analyze each frame specifically for social media handles
    for (const frame of frames) {
      // Pass the custom prompt specifically for social media detection
      const result = await analyzeFrameFn(frame.image_url, PROMPTS.SOCIAL_MEDIA_DETECTION);
      
      // Extract social handle if found
      if (result.includes('SOCIAL:') && !result.includes('SOCIAL:none')) {
        const handleMatch = result.match(/SOCIAL:([^:]+):(.+)/);
        if (handleMatch && handleMatch.length >= 3) {
          const platform = handleMatch[1]?.trim();
          const username = handleMatch[2]?.trim();
          if (platform && username) {
            socialHandles.push(`${platform}:${username}`);
          }
        }
      }
    }
    
    return [...new Set(socialHandles)]; // Remove duplicates
  } catch (error) {
    console.error('Error extracting social handles:', error);
    return [];
  }
}

/**
 * Format a social media handle into a proper URL
 */
function formatSocialMediaUrl(platform: string, username: string): string {
  const cleanUsername = username.startsWith('@') ? username.substring(1) : username;

  switch (platform.toLowerCase()) {
    case 'instagram':
      return `https://www.instagram.com/${cleanUsername}/`;
    case 'tiktok':
      return `https://www.tiktok.com/@${cleanUsername}`;
    case 'youtube':
      return `https://www.youtube.com/${cleanUsername}`;
    case 'twitter':
    case 'x':
      return `https://twitter.com/${cleanUsername}`;
    case 'facebook':
      return `https://www.facebook.com/${cleanUsername}`;
    default:
      return `${platform}:${cleanUsername}`;
  }
}

/**
 * Process social handles and update the recipe with proper URLs
 */
export async function processSocialHandles(
  recipeId: string,
  analyzeFrameFn: (imageUrl: string, prompt?: string) => Promise<string>
): Promise<string[]> {
  try {
    const socialHandles = await extractSocialHandles(recipeId, analyzeFrameFn);

    if (socialHandles && socialHandles.length > 0) {
      for (const handle of socialHandles) {
        const [platform, username] = handle.split(':');
        const { error } = await supabase
          .from('recipe_social_media')
          .insert({
            recipe_id: recipeId,
            platform,
            username,
          });

        if (error) console.error('Error storing social handle:', error);
      }

      // Format the first handle as a proper URL and update the recipe attribution
      const firstHandle = socialHandles[0];
      if (!firstHandle) return socialHandles;
      
      const parts = firstHandle.split(':');
      const platform = parts[0] || '';
      const username = parts[1] || '';
      const formattedUrl = formatSocialMediaUrl(platform, username);

      const attribution = {
        handle: formattedUrl,
        original_url: "", // Preserve existing structure
      };

      const { error: updateError } = await supabase
        .from('recipes')
        .update({
          attribution: JSON.stringify(attribution),
        })
        .eq('id', recipeId);

      if (updateError) console.error('Error updating recipe attribution:', updateError);

      console.log('[DEBUG] Stored recipe social handles:', socialHandles);
      console.log('[DEBUG] Updated recipe attribution with formatted URL:', formattedUrl);
    } else {
      console.log('[DEBUG] No social handles found, skipping database update');
    }

    return socialHandles;
  } catch (error) {
    console.error('Error processing social handles:', error);
    return [];
  }
}
