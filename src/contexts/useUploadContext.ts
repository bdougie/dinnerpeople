import { useContext } from 'react';
import { UploadContext } from './UploadContext';
import type { BackgroundUpload } from './UploadContext';

export function useUploadContext() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUploadContext must be used within UploadProvider');
  }
  return context;
}

// Helper hook to get current active upload
export function useActiveUpload(): BackgroundUpload | null {
  const { backgroundUploads, activeUploadId } = useUploadContext();
  return backgroundUploads.find(upload => upload.recipeId === activeUploadId) || null;
}

// Helper hook to get uploads in progress
export function useUploadsInProgress(): BackgroundUpload[] {
  const { backgroundUploads } = useUploadContext();
  return backgroundUploads.filter(upload => 
    upload.status !== 'completed' && upload.status !== 'failed'
  );
}