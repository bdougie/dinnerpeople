import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';
import { uploadVideoWithRealtimeProgress } from './uploadWithRealtimeProgress';
import { generateVideoTitle } from './openai';

export interface UploadResult {
  recipeId: string;
  processingStatus: string;
}

export async function uploadVideo(file: File, thumbnailUrl?: string): Promise<UploadResult> {
  
  const userResponse = await supabase.auth.getUser();
  
  const userId = userResponse.data.user?.id;
  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Generate unique ID for the recipe
  const recipeId = uuidv4();

  // Create recipe entry with a temporary title and thumbnail if provided
  const { error: recipeError } = await supabase
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

  
  if (recipeError) {
    throw recipeError;
  }

  // Generate a better title using the thumbnail if available
  if (thumbnailUrl) {
    try {
      const generatedTitle = await generateVideoTitle(thumbnailUrl);
      
      if (generatedTitle && !generatedTitle.includes('Untitled Recipe')) {
        
        // Update the recipe with the generated title
        const { error: updateError } = await supabase
          .from('recipes')
          .update({ title: generatedTitle })
          .eq('id', recipeId);
          
        if (updateError) {
          // Continue even if title update fails
        }
      }
    } catch (titleError) {
      // Continue with the default title
    }
  }

  // Add to processing queue
  const { error: queueError } = await supabase
    .from('processing_queue')
    .insert({
      recipe_id: recipeId,
      status: 'pending'
    })
    .select();

  
  if (queueError) {
    throw queueError;
  }

  // Now upload the actual video file to storage with progress tracking
  const filePath = `${userId}/${recipeId}.mp4`;
  
  try {
    // Use the enhanced upload function with realtime progress
    await uploadVideoWithRealtimeProgress(file, filePath, 'videos', recipeId);
    

    // Get the proper public URL with the full path
    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath);

    // Make sure the URL is complete with the file path

    // Update the recipe with the correct URL
    const { error: updateError } = await supabase
      .from('recipes')
      .update({ 
        video_url: urlData.publicUrl  // This should now contain the full path
      })
      .eq('id', recipeId);

    if (updateError) {
    } else {
    }

    // Upload successful - update processing_queue status to "processing"
    const { error: queueUpdateError } = await supabase
      .from('processing_queue')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('recipe_id', recipeId);
    
    if (queueUpdateError) {
    } else {
    }

    // If we have a data URL for the thumbnail, save it to storage
    if (thumbnailUrl && thumbnailUrl.startsWith('data:')) {
      try {
        // Convert data URL to blob
        const response = await fetch(thumbnailUrl);
        const blob = await response.blob();
        
        // Upload the thumbnail
        const thumbnailPath = `${userId}/${recipeId}.jpg`;
        const { error: thumbError } = await supabase.storage
          .from('thumbnails')
          .upload(thumbnailPath, blob);
          
        if (thumbError) {
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
          } else {
          }
        }
      } catch (thumbErr) {
        // Don't fail the whole upload if just the thumbnail processing fails
      }
    }

    return { 
      recipeId,
      processingStatus: 'processing' 
    };
  } catch (error) {
    // Catch and rethrow errors, including network issues that might occur during large uploads
    
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

  return { recipeId, processingStatus: 'processing' };
}