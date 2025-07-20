import { createContext, useState, useCallback, ReactNode } from 'react';
import { UploadProgress } from '../hooks/useUploadProgress';

export interface BackgroundUpload {
  recipeId: string;
  fileName: string;
  fileSize: number;
  progress: UploadProgress;
  status: 'compressing' | 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

interface UploadContextType {
  backgroundUploads: BackgroundUpload[];
  activeUploadId: string | null;
  addBackgroundUpload: (upload: BackgroundUpload) => void;
  updateUploadProgress: (recipeId: string, progress: Partial<BackgroundUpload>) => void;
  removeUpload: (recipeId: string) => void;
  setActiveUpload: (recipeId: string | null) => void;
}

export const UploadContext = createContext<UploadContextType | null>(null);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [backgroundUploads, setBackgroundUploads] = useState<BackgroundUpload[]>([]);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);

  const addBackgroundUpload = useCallback((upload: BackgroundUpload) => {
    setBackgroundUploads(prev => [...prev, upload]);
  }, []);

  const updateUploadProgress = useCallback((recipeId: string, update: Partial<BackgroundUpload>) => {
    setBackgroundUploads(prev => 
      prev.map(upload => 
        upload.recipeId === recipeId 
          ? { ...upload, ...update }
          : upload
      )
    );
  }, []);

  const removeUpload = useCallback((recipeId: string) => {
    setBackgroundUploads(prev => prev.filter(upload => upload.recipeId !== recipeId));
    if (activeUploadId === recipeId) {
      setActiveUploadId(null);
    }
  }, [activeUploadId]);

  const setActiveUpload = useCallback((recipeId: string | null) => {
    setActiveUploadId(recipeId);
  }, []);

  return (
    <UploadContext.Provider value={{
      backgroundUploads,
      activeUploadId,
      addBackgroundUpload,
      updateUploadProgress,
      removeUpload,
      setActiveUpload,
    }}>
      {children}
    </UploadContext.Provider>
  );
}

