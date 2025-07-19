import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface UploadProgressData {
  recipe_id: string;
  progress: number;
  bytes_uploaded: number;
  total_bytes: number;
  speed: number;
  status: 'uploading' | 'completed' | 'failed';
  error?: string;
}

/**
 * Creates a realtime subscription to track upload progress
 */
export function subscribeToUploadProgress(
  recipeId: string,
  onProgress: (data: UploadProgressData) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`upload_progress_${recipeId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'upload_progress',
        filter: `recipe_id=eq.${recipeId}`,
      },
      (payload) => {
        const data = payload.new as UploadProgressData;
        onProgress(data);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Updates upload progress in the database (which triggers realtime updates)
 */
export async function updateUploadProgress(
  recipeId: string,
  progress: number,
  bytesUploaded: number,
  totalBytes: number,
  speed: number
) {
  const { error } = await supabase
    .from('upload_progress')
    .upsert({
      recipe_id: recipeId,
      progress,
      bytes_uploaded: bytesUploaded,
      total_bytes: totalBytes,
      speed,
      status: progress >= 100 ? 'completed' : 'uploading',
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error updating upload progress:', error);
  }
}

/**
 * Enhanced upload function with realtime progress tracking
 */
export async function uploadVideoWithRealtimeProgress(
  file: File,
  path: string,
  bucket: string,
  recipeId: string
): Promise<void> {
  const totalSize = file.size;
  const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB chunks for more frequent updates
  // const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
  let uploadedBytes = 0;
  const startTime = Date.now();

  // Initialize progress record
  await updateUploadProgress(recipeId, 0, 0, totalSize, 0);

  try {
    // For small files, upload directly
    if (totalSize <= CHUNK_SIZE * 2) {
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file);
      
      if (error) throw error;
      
      await updateUploadProgress(recipeId, 100, totalSize, totalSize, 0);
      return;
    }

    // For larger files, simulate chunked upload with progress updates
    // Note: This is a simulation since Supabase doesn't support true chunked uploads
    // In production, you'd use TUS protocol or implement server-side chunking
    
    // We'll upload the whole file but simulate progress updates
    const uploadPromise = supabase.storage
      .from(bucket)
      .upload(path, file);

    // Simulate progress updates based on expected upload time
    const updateInterval = setInterval(async () => {
      const elapsedTime = (Date.now() - startTime) / 1000; // seconds
      const estimatedSpeed = totalSize / 30; // Assume 30 second upload for estimation
      uploadedBytes = Math.min(estimatedSpeed * elapsedTime, totalSize * 0.95); // Cap at 95% until actual completion
      
      const speed = uploadedBytes / elapsedTime;
      const progress = (uploadedBytes / totalSize) * 100;
      
      await updateUploadProgress(
        recipeId,
        Math.min(progress, 95), // Cap at 95% until confirmed
        uploadedBytes,
        totalSize,
        speed
      );
    }, 500); // Update every 500ms

    const { error } = await uploadPromise;
    
    clearInterval(updateInterval);
    
    if (error) throw error;
    
    // Update to 100% on completion
    await updateUploadProgress(recipeId, 100, totalSize, totalSize, 0);
    
  } catch (error) {
    // Update status to failed
    await supabase
      .from('upload_progress')
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Upload failed',
      })
      .eq('recipe_id', recipeId);
    
    throw error;
  }
}

/**
 * Clean up upload progress record
 */
export async function cleanupUploadProgress(recipeId: string) {
  await supabase
    .from('upload_progress')
    .delete()
    .eq('recipe_id', recipeId);
}