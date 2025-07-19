import { supabase } from './supabase';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

export interface ChunkedUploadOptions {
  file: File;
  path: string;
  bucket: string;
  onProgress?: (progress: { loaded: number; total: number }) => void;
}

export async function uploadFileInChunks({
  file,
  path,
  bucket,
  onProgress,
}: ChunkedUploadOptions): Promise<void> {
  const totalSize = file.size;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
  let uploadedBytes = 0;

  // For files smaller than chunk size, use regular upload
  if (totalSize <= CHUNK_SIZE) {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file);
    
    if (error) throw error;
    
    if (onProgress) {
      onProgress({ loaded: totalSize, total: totalSize });
    }
    return;
  }

  // Initialize multipart upload
  // const fileName = path.split('/').pop() || 'file';
  // const contentType = file.type || 'application/octet-stream';

  // For larger files, we'll use a workaround with multiple part uploads
  // Note: This is a simplified implementation. In production, you might want
  // to use a more sophisticated approach with resumable uploads
  
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunk = file.slice(start, end);
    
    // Create a temporary path for each chunk
    const chunkPath = `${path}.part${chunkIndex}`;
    
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .upload(chunkPath, chunk);
      
      if (error) throw error;
      
      uploadedBytes += chunk.size;
      
      if (onProgress) {
        onProgress({ loaded: uploadedBytes, total: totalSize });
      }
    } catch (error) {
      // Clean up uploaded chunks on error
      for (let i = 0; i <= chunkIndex; i++) {
        await supabase.storage
          .from(bucket)
          .remove([`${path}.part${i}`]);
      }
      throw error;
    }
  }

  // After all chunks are uploaded, we need to combine them
  // This would typically be done server-side, but for now we'll
  // just upload the full file after confirming chunks work
  // In a production environment, you'd want to implement proper
  // multipart upload with server-side concatenation
  
  // Clean up chunks
  const chunkPaths = Array.from({ length: totalChunks }, 
    (_, i) => `${path}.part${i}`);
  
  await supabase.storage
    .from(bucket)
    .remove(chunkPaths);
  
  // Upload the complete file
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file);
  
  if (error) throw error;
}

// Alternative approach using XMLHttpRequest for progress tracking
export async function uploadWithProgress(
  file: File,
  bucket: string,
  path: string,
  onProgress?: (progress: { loaded: number; total: number }) => void
): Promise<void> {
  // Get the upload URL from Supabase
  const { data, error: urlError } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);
  
  if (urlError || !data?.signedUrl) {
    throw urlError || new Error('Failed to create upload URL');
  }
  
  const signedUrl = data.signedUrl;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
        });
      }
    });
    
    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });
    
    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });
    
    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });
    
    // Send the request
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });
}