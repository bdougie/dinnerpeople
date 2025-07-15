import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

interface CompressionOptions {
  targetSizeMB?: number;
  onProgress?: (progress: number) => void;
}

export async function initializeFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;
  
  ffmpeg = new FFmpeg();
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm';
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
  });
  
  return ffmpeg;
}

export async function compressVideo(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const { onProgress } = options;
  
  try {
    // Initialize FFmpeg if not already done
    const ffmpeg = await initializeFFmpeg();
    
    // Set up progress tracking
    ffmpeg.on('progress', ({ progress }) => {
      if (onProgress) {
        // FFmpeg progress is 0-1, convert to percentage
        onProgress(Math.round(progress * 100));
      }
    });
    
    // Write input file to FFmpeg filesystem
    const inputFileName = 'input.mp4';
    const outputFileName = 'output.mp4';
    
    await ffmpeg.writeFile(inputFileName, await fetchFile(file));
    
    // Calculate target bitrate based on file size
    // Get video duration first with a quick probe
    await ffmpeg.exec(['-i', inputFileName]);
    
    // For recipe videos, we can be aggressive with compression
    // Target bitrate calculation: (targetSize * 8) / duration
    // We'll use a conservative estimate of 750kbps for good quality at small size
    const targetBitrate = '750k';
    
    // Compression settings optimized for recipe videos
    const compressionArgs = [
      '-i', inputFileName,
      // Video codec settings
      '-c:v', 'libx264',           // Use H.264 codec
      '-preset', 'fast',            // Fast encoding
      '-crf', '28',                 // Higher CRF = more compression (18-28 is good range)
      '-b:v', targetBitrate,        // Target video bitrate
      '-maxrate', '1000k',          // Maximum bitrate
      '-bufsize', '2000k',          // Buffer size
      // Resolution - keep at 720p max for recipe videos
      '-vf', 'scale=\'min(1280,iw)\':\'min(720,ih)\':force_original_aspect_ratio=decrease',
      // Audio settings - reduce quality since we don't need high fidelity
      '-c:a', 'aac',               // AAC audio codec
      '-b:a', '64k',                // Low audio bitrate (recipe videos don't need high quality audio)
      '-ar', '22050',               // Lower sample rate
      // Format settings
      '-f', 'mp4',                  // MP4 format
      '-movflags', '+faststart',    // Enable fast start for web playback
      outputFileName
    ];
    
    console.log('Starting video compression with settings:', compressionArgs.join(' '));
    
    // Execute compression
    await ffmpeg.exec(compressionArgs);
    
    // Read the compressed file
    const data = await ffmpeg.readFile(outputFileName);
    
    // Convert to Blob and then File
    const blob = new Blob([data], { type: 'video/mp4' });
    const compressedFile = new File([blob], file.name, { type: 'video/mp4' });
    
    // Log compression results
    const compressionRatio = ((file.size - compressedFile.size) / file.size) * 100;
    console.log(`Compression complete: ${formatFileSize(file.size)} → ${formatFileSize(compressedFile.size)} (${compressionRatio.toFixed(1)}% reduction)`);
    
    // Clean up
    await ffmpeg.deleteFile(inputFileName);
    await ffmpeg.deleteFile(outputFileName);
    
    return compressedFile;
  } catch (error) {
    console.error('Video compression failed:', error);
    throw new Error('Failed to compress video. Please try again or use a smaller file.');
  }
}

function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)}MB`;
}

export function isCompressionNeeded(file: File): boolean {
  // Don't compress if already under 50MB
  const fileSizeMB = file.size / (1024 * 1024);
  return fileSizeMB > 50;
}

export function estimateCompressionTime(fileSizeMB: number): number {
  // Rough estimate: 10 seconds per 100MB on average hardware
  return Math.ceil((fileSizeMB / 100) * 10);
}