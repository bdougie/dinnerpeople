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
    `Describe this cooking step in detail, focusing on the ingredients,
    techniques, and any important details visible in the frame. Keep it concise
    but informative.`,
  
  SOCIAL_MEDIA_DETECTION:
    `Analyze the provided image carefully and locate any visible social media
    handles or usernames (e.g., @username for Instagram/TikTok, YouTube channel
    names, etc.). Focus on text overlays or prominent text elements in the
    image. If a social handle is detected, respond in this exact format:
    ‘SOCIAL:platform:username’ (e.g., ‘SOCIAL:instagram:foodiefromvt’). If no
    social media handle is visible, respond with ‘SOCIAL:none’. Ignore any
    blurred faces or unrelated elements in the image.`,
  
  RECIPE_SUMMARY: 
    `Based ONLY on the following chronological cooking steps, create a concise recipe title and detailed description.
    The title should be appealing, descriptive, and under 60 characters.
    The description should be 2-3 sentences summarizing the dish, key ingredients, and cooking methods.
    
    DO NOT invent or add any ingredients or steps that are not mentioned in the provided cooking steps.
    ONLY use information that appears in the provided steps.
    
    Cooking steps:
    {steps}
    
    Format your response as valid JSON with 'title' and 'description' fields only.
    Example: {"title": "Recipe Title", "description": "Recipe description text"}`
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
  try {
    const parsed = JSON.parse(response);
    return {
      title: parsed.title || 'Untitled Recipe',
      description: parsed.description || 'No description available',
      ingredients: parsed.ingredients || []
    };
  } catch (e) {
    console.error('Failed to parse AI response as JSON:', e);
    return {
      title: 'Untitled Recipe',
      description: response || 'This recipe was created automatically from a cooking video.',
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
      title: 'Untitled Recipe',
      description: 'This recipe was created automatically from a cooking video.'
    };
    await updateRecipeWithGeneratedSummary(recipeId, fallback);
    return fallback;
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
          const platform = handleMatch[1].trim();
          const username = handleMatch[2].trim();
          socialHandles.push(`${platform}:${username}`);
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
 * Process social handles and update the recipe
 */
export async function processSocialHandles(
  recipeId: string,
  analyzeFrameFn: (imageUrl: string, prompt?: string) => Promise<string>
): Promise<string[]> {
  try {
    const socialHandles = await extractSocialHandles(recipeId, analyzeFrameFn);
    
    // Only update the recipe if social handles were actually found
    if (socialHandles && socialHandles.length > 0) {
      const { error } = await supabase
        .from('recipes')
        .update({
          social_handles: socialHandles
        })
        .eq('id', recipeId);
        
      if (error) throw error;
      
      console.log('[DEBUG] Updated recipe with social handles:', socialHandles);
    } else {
      console.log('[DEBUG] No social handles found, skipping database update');
    }
    
    return socialHandles;
  } catch (error) {
    console.error('Error processing social handles:', error);
    return [];
  }
}
