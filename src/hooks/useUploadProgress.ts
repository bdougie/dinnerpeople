import { useState, useCallback } from 'react';

export interface UploadProgress {
  percentage: number;
  bytesUploaded: number;
  totalBytes: number;
  speed: number; // bytes per second
  timeRemaining: number; // seconds
}

export function useUploadProgress() {
  const [progress, setProgress] = useState<UploadProgress>({
    percentage: 0,
    bytesUploaded: 0,
    totalBytes: 0,
    speed: 0,
    timeRemaining: 0,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);

  const startUpload = useCallback((totalBytes: number) => {
    setIsUploading(true);
    setStartTime(Date.now());
    setProgress({
      percentage: 0,
      bytesUploaded: 0,
      totalBytes,
      speed: 0,
      timeRemaining: 0,
    });
  }, []);

  const updateProgress = useCallback((bytesUploaded: number) => {
    if (!startTime) return;

    const now = Date.now();
    const elapsedSeconds = (now - startTime) / 1000;
    const speed = bytesUploaded / elapsedSeconds;
    
    setProgress((prev) => {
      const bytesRemaining = prev.totalBytes - bytesUploaded;
      const timeRemaining = speed > 0 ? bytesRemaining / speed : 0;
      const percentage = (bytesUploaded / prev.totalBytes) * 100;

      return {
        percentage: Math.min(percentage, 100),
        bytesUploaded,
        totalBytes: prev.totalBytes,
        speed,
        timeRemaining: Math.max(0, timeRemaining),
      };
    });
  }, [startTime]);

  const completeUpload = useCallback(() => {
    setIsUploading(false);
    setProgress((prev) => ({
      ...prev,
      percentage: 100,
      bytesUploaded: prev.totalBytes,
      timeRemaining: 0,
    }));
  }, []);

  const resetProgress = useCallback(() => {
    setIsUploading(false);
    setStartTime(null);
    setProgress({
      percentage: 0,
      bytesUploaded: 0,
      totalBytes: 0,
      speed: 0,
      timeRemaining: 0,
    });
  }, []);

  return {
    progress,
    isUploading,
    startUpload,
    updateProgress,
    completeUpload,
    resetProgress,
  };
}

// Helper functions for formatting
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 KB/s';
  const kbps = bytesPerSecond / 1024;
  const mbps = kbps / 1024;
  
  if (mbps >= 1) {
    return `${mbps.toFixed(1)} MB/s`;
  }
  return `${kbps.toFixed(0)} KB/s`;
}

export function formatTimeRemaining(seconds: number): string {
  if (seconds === 0 || !isFinite(seconds)) return 'calculating...';
  
  if (seconds < 60) {
    return `${Math.round(seconds)} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}