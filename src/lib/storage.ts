import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  recipeId: string;
}

export async function uploadVideo(file: File): Promise<UploadResult> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Generate unique ID for the recipe
  const recipeId = uuidv4();

  // Create recipe entry with a temporary title
  const { error: recipeError } = await supabase
    .from('recipes')
    .insert({
      id: recipeId,
      user_id: userId,
      status: 'draft',
      title: `Untitled Recipe ${new Date().toLocaleDateString()}`, // Temporary title
      description: 'Recipe details will be added after processing'
    });

  if (recipeError) {
    throw recipeError;
  }

  // Add to processing queue
  const { error: queueError } = await supabase
    .from('processing_queue')
    .insert({
      recipe_id: recipeId,
      status: 'pending'
    });

  if (queueError) throw queueError;

  return { recipeId };
}