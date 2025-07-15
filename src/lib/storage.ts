import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';
import { uploadVideoWithRealtimeProgress } from './uploadWithRealtimeProgress';

export interface UploadResult {
  recipeId: string;
  processingStatus: string;
}

export async function uploadVideo(file: File, thumbnailUrl?: string): Promise<UploadResult> {
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

  // Create recipe entry with a temporary title and thumbnail if provided
  console.log('[DEBUG] Creating recipe entry in database');
  const { data: recipeData, error: recipeError } = await supabase
    .from('recipes')
    .insert({
      id: recipeId,
      user_id: userId,
      status: 'draft',
      title: `Untitled Recipe ${new Date().toLocaleDateString()}`, // Temporary title
      description: 'Recipe details will be added after processing',
      thumbnail_url: thumbnailUrl || null, // Save the thumbnail URL if provided
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

  // Now upload the actual video file to storage with progress tracking
  console.log('[DEBUG] Uploading video file to storage with progress tracking');
  const filePath = `${userId}/${recipeId}.mp4`;
  
  try {
    // Use the enhanced upload function with realtime progress
    await uploadVideoWithRealtimeProgress(file, filePath, 'videos', recipeId);
    
    console.log('[DEBUG] Storage upload completed');

    // Get the proper public URL with the full path
    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath);

    // Make sure the URL is complete with the file path
    console.log('[DEBUG] Generated video URL:', urlData.publicUrl);

    // Update the recipe with the correct URL
    const { error: updateError } = await supabase
      .from('recipes')
      .update({ 
        video_url: urlData.publicUrl  // This should now contain the full path
      })
      .eq('id', recipeId);

    if (updateError) {
      console.error('[DEBUG] Error updating recipe with video URL:', updateError);
    } else {
      console.log('[DEBUG] Recipe updated with video URL');
    }

    // Upload successful - update processing_queue status to "processing"
    console.log('[DEBUG] Updating processing queue status to "processing"');
    const { error: queueUpdateError } = await supabase
      .from('processing_queue')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('recipe_id', recipeId);
    
    if (queueUpdateError) {
      console.error('[DEBUG] Error updating processing status:', queueUpdateError);
    } else {
      console.log('[DEBUG] Processing status updated to "processing"');
    }

    // If we have a data URL for the thumbnail, save it to storage
    if (thumbnailUrl && thumbnailUrl.startsWith('data:')) {
      try {
        console.log('[DEBUG] Saving thumbnail to storage');
        // Convert data URL to blob
        const response = await fetch(thumbnailUrl);
        const blob = await response.blob();
        
        // Upload the thumbnail
        const thumbnailPath = `${userId}/${recipeId}.jpg`;
        const { error: thumbError } = await supabase.storage
          .from('thumbnails')
          .upload(thumbnailPath, blob);
          
        if (thumbError) {
          console.error('[DEBUG] Error uploading thumbnail:', thumbError);
        } else {
          // Get the public URL
          const { data: urlData } = supabase.storage
            .from('thumbnails')
            .getPublicUrl(thumbnailPath);
            
          // Update the recipe with the thumbnail URL
          const { error: updateThumbError } = await supabase
            .from('recipes')
            .update({ 
              thumbnail_url: urlData.publicUrl 
            })
            .eq('id', recipeId);
            
          if (updateThumbError) {
            console.error('[DEBUG] Error updating recipe with thumbnail URL:', updateThumbError);
          } else {
            console.log('[DEBUG] Recipe updated with thumbnail URL:', urlData.publicUrl);
          }
        }
      } catch (thumbErr) {
        console.error('[DEBUG] Error processing thumbnail:', thumbErr);
        // Don't fail the whole upload if just the thumbnail processing fails
      }
    }

    return { 
      recipeId,
      processingStatus: 'processing' 
    };
  } catch (error) {
    // Catch and rethrow errors, including network issues that might occur during large uploads
    console.error('[DEBUG] Upload exception:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if it's already a payload size error
    if (
      errorMessage.includes("payload too large") ||
      errorMessage.includes("request entity too large") ||
      errorMessage.includes("413") ||
      errorMessage.includes("size limit")
    ) {
      throw error; // Already formatted, just rethrow
    }
    
    // Update processing queue status
    await supabase
      .from('processing_queue')
      .update({ 
        status: 'failed',
        error: `Upload failed: ${errorMessage}`
      })
      .eq('recipe_id', recipeId);
      
    throw error;
  }

  console.log('[DEBUG] Video upload completed successfully');
  return { recipeId, processingStatus: 'processing' };
}