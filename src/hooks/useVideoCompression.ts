import { useState, useCallback } from 'react';
import { compressVideo, isCompressionNeeded } from '../lib/videoCompression';

export interface CompressionState {
  isCompressing: boolean;
  progress: number;
  originalSize: number;
  compressedSize: number;
  error: string | null;
}

export function useVideoCompression() {
  const [state, setState] = useState<CompressionState>({
    isCompressing: false,
    progress: 0,
    originalSize: 0,
    compressedSize: 0,
    error: null,
  });

  const compress = useCallback(async (file: File): Promise<File> => {
    // Check if compression is needed
    if (!isCompressionNeeded(file)) {
      console.log('File is already small enough, skipping compression');
      return file;
    }

    setState({
      isCompressing: true,
      progress: 0,
      originalSize: file.size,
      compressedSize: 0,
      error: null,
    });

    try {
      const compressedFile = await compressVideo(file, {
        targetSizeMB: 200,
        onProgress: (progress) => {
          setState(prev => ({ ...prev, progress }));
        },
      });

      setState(prev => ({
        ...prev,
        isCompressing: false,
        progress: 100,
        compressedSize: compressedFile.size,
      }));

      return compressedFile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Compression failed';
      setState(prev => ({
        ...prev,
        isCompressing: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isCompressing: false,
      progress: 0,
      originalSize: 0,
      compressedSize: 0,
      error: null,
    });
  }, []);

  return {
    compress,
    reset,
    ...state,
  };
}

export function formatCompressionStats(originalSize: number, compressedSize: number): string {
  const originalMB = originalSize / (1024 * 1024);
  const compressedMB = compressedSize / (1024 * 1024);
  const reduction = ((originalSize - compressedSize) / originalSize) * 100;
  
  return `${originalMB.toFixed(1)}MB → ${compressedMB.toFixed(1)}MB (${reduction.toFixed(0)}% smaller)`;
}