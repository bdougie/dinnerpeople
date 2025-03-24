import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  recipeId: string;
  processingStatus: string;
}

export async function uploadVideo(file: File): Promise<UploadResult> {
  console.log('[DEBUG] uploadVideo started with file:', file.name, file.size);
  
  const userResponse = await supabase.auth.getUser();
  console.log('[DEBUG] Auth getUser response:', userResponse);
  
  const userId = userResponse.data.user?.id;
  if (!userId) {
    console.error('[DEBUG] User not authenticated');
    throw new Error('User not authenticated');
  }

  // Generate unique ID for the recipe
  const recipeId = uuidv4();
  console.log('[DEBUG] Generated recipeId:', recipeId);

  // Create recipe entry with a temporary title
  console.log('[DEBUG] Creating recipe entry in database');
  const { data: recipeData, error: recipeError } = await supabase
    .from('recipes')
    .insert({
      id: recipeId,
      user_id: userId,
      status: 'draft',
      title: `Untitled Recipe ${new Date().toLocaleDateString()}`, // Temporary title
      description: 'Recipe details will be added after processing'
    })
    .select();

  console.log('[DEBUG] Recipe insert response:', { data: recipeData, error: recipeError });
  
  if (recipeError) {
    console.error('[DEBUG] Recipe creation error:', recipeError);
    throw recipeError;
  }

  // Add to processing queue
  console.log('[DEBUG] Adding to processing queue');
  const { data: queueData, error: queueError } = await supabase
    .from('processing_queue')
    .insert({
      recipe_id: recipeId,
      status: 'pending'
    })
    .select();

  console.log('[DEBUG] Processing queue insert response:', { data: queueData, error: queueError });
  
  if (queueError) {
    console.error('[DEBUG] Processing queue error:', queueError);
    throw queueError;
  }

  // Now upload the actual video file to storage
  console.log('[DEBUG] Uploading video file to storage');
  const filePath = `${userId}/${recipeId}.mp4`;
  
  try {
    const { data: storageData, error: storageError } = await supabase.storage
      .from('videos')
      .upload(filePath, file);

    console.log('[DEBUG] Storage upload response:', { data: storageData, error: storageError });
    
    if (storageError) {
      console.error('[DEBUG] Storage upload error:', storageError);
      
      // Check for payload size issues
      if (
        storageError.message?.includes("payload too large") ||
        storageError.message?.includes("request entity too large") ||
        storageError.message?.includes("413") ||
        storageError.message?.includes("size limit")
      ) {
        // Update processing queue with more specific error
        await supabase
          .from('processing_queue')
          .update({ 
            status: 'failed',
            error: `Video file is too large. Please compress or resize your video to a smaller file size.`
          })
          .eq('recipe_id', recipeId);
        
        throw new Error("Video file is too large. Please compress or resize your video to a smaller file size.");
      } else {
        // Update the status to failed with generic error
        await supabase
          .from('processing_queue')
          .update({ 
            status: 'failed',
            error: `Failed to upload video: ${storageError.message}`
          })
          .eq('recipe_id', recipeId);
        
        throw storageError;
      }
    }

    // Upload successful - update processing_queue status to "processing"
    console.log('[DEBUG] Updating processing queue status to "processing"');
    const { error: updateError } = await supabase
      .from('processing_queue')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('recipe_id', recipeId);
    
    if (updateError) {
      console.error('[DEBUG] Error updating processing status:', updateError);
    } else {
      console.log('[DEBUG] Processing status updated to "processing"');
    }

    return { 
      recipeId,
      processingStatus: 'processing' 
    };
  } catch (error: any) {
    // Catch and rethrow errors, including network issues that might occur during large uploads
    console.error('[DEBUG] Upload exception:', error);
    
    // Check if it's already a payload size error
    if (
      error.message?.includes("payload too large") ||
      error.message?.includes("request entity too large") ||
      error.message?.includes("413") ||
      error.message?.includes("size limit")
    ) {
      throw error; // Already formatted, just rethrow
    }
    
    // Update processing queue status
    await supabase
      .from('processing_queue')
      .update({ 
        status: 'failed',
        error: `Upload failed: ${error.message}`
      })
      .eq('recipe_id', recipeId);
      
    throw error;
  }

  console.log('[DEBUG] Video upload completed successfully');
  return { recipeId, processingStatus: 'processing' };
}