import { supabase } from './supabase';

export async function extractFrames(videoFile: File, interval: number = 5): Promise<{ timestamp: number, blob: Blob }[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const frames: { timestamp: number, blob: Blob }[] = [];

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const duration = video.duration;
      let currentTime = 0;

      function captureFrame() {
        if (currentTime <= duration) {
          video.currentTime = currentTime;
        } else {
          URL.revokeObjectURL(video.src);
          resolve(frames);
          return;
        }
      }

      video.onseeked = () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                frames.push({ timestamp: Math.round(currentTime), blob });
                currentTime += interval;
                captureFrame();
              }
            },
            'image/jpeg',
            0.8
          );
        }
      };

      captureFrame();
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Error loading video'));
    };

    video.src = URL.createObjectURL(videoFile);
  });
}

export async function uploadFrames(frames: { timestamp: number, blob: Blob }[], recipeId: string) {
  const uploadedFrames: { timestamp: number, imageUrl: string }[] = [];
  
  // Get current user to ensure proper permissions
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    throw new Error('User not authenticated');
  }
  
  // Check recipe ownership
  const { data: recipeData, error: recipeError } = await supabase
    .from('recipes')
    .select('user_id')
    .eq('id', recipeId)
    .single();
    
  if (recipeError || recipeData.user_id !== userData.user.id) {
    throw new Error('Not authorized to upload frames for this recipe');
  }

  for (const frame of frames) {
    // Include user_id in the path to avoid permission issues
    const path = `${userData.user.id}/${recipeId}/${frame.timestamp}.jpg`;
    
    const { error: uploadError } = await supabase.storage
      .from('frames')
      .upload(path, frame.blob);

    if (uploadError) {
      console.error('Error uploading frame:', uploadError);
      continue;
    }

    const { data: urlData } = supabase.storage
      .from('frames')
      .getPublicUrl(path);

    uploadedFrames.push({
      timestamp: frame.timestamp,
      imageUrl: urlData.publicUrl
    });
  }

  return uploadedFrames;
}