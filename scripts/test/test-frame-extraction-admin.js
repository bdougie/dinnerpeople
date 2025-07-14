import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import { mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Supabase client with service role
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || (!supabaseServiceKey && !supabaseAnonKey)) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

if (supabaseServiceKey) {
  console.log('🔐 Using service role key (bypasses RLS)\n');
} else {
  console.log('🔑 Using anon key (subject to RLS policies)\n');
}

// Extract frames from video using ffmpeg
async function extractFrames(videoPath, outputDir, interval = 5) {
  return new Promise((resolve, reject) => {
    console.log(`🎬 Extracting frames every ${interval} seconds...`);
    
    // Create output directory if it doesn't exist
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Build ffmpeg command
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-vf', `fps=1/${interval}`,
      '-q:v', '2',
      join(outputDir, 'frame_%04d.jpg')
    ]);

    let errorOutput = '';

    ffmpeg.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg exited with code ${code}: ${errorOutput}`));
      } else {
        resolve();
      }
    });
  });
}

// Test frame extraction functionality
async function testFrameExtraction() {
  console.log('🚀 Testing video frame extraction...\n');

  try {
    const videoPath = process.argv[2];
    
    if (!videoPath) {
      console.error('Please provide a video file path as argument');
      console.log('Usage: node test-frame-extraction-admin.js <path-to-video-file>');
      process.exit(1);
    }

    // Check if video file exists
    if (!existsSync(videoPath)) {
      console.error(`Video file not found: ${videoPath}`);
      process.exit(1);
    }

    // Create temporary directory for frames
    const tempDir = join(process.cwd(), 'upload-test', 'temp-frames');
    console.log(`📁 Using temporary directory: ${tempDir}`);

    // Extract frames
    await extractFrames(videoPath, tempDir, 5);

    // List extracted frames
    console.log('\n📸 Extracted frames:');
    const fs = await import('fs');
    const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.jpg'));
    console.log(`Found ${files.length} frames`);

    // Upload frames to Supabase storage
    console.log('\n📤 Uploading frames to Supabase...');
    const uploadedFrames = [];

    for (const file of files) {
      const framePath = join(tempDir, file);
      const frameBuffer = readFileSync(framePath);
      const frameNumber = parseInt(file.match(/frame_(\d+)/)[1]);
      const timestamp = (frameNumber - 1) * 5; // Convert to seconds
      
      const fileName = `upload-test/frames/${Date.now()}-frame-${timestamp}s.jpg`;
      
      const { data, error } = await supabase.storage
        .from('frames')
        .upload(fileName, frameBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error(`❌ Failed to upload ${file}:`, error);
      } else {
        console.log(`✅ Uploaded frame at ${timestamp}s: ${data.path}`);
        
        const { data: { publicUrl } } = supabase.storage
          .from('frames')
          .getPublicUrl(data.path);
          
        uploadedFrames.push({
          timestamp,
          path: data.path,
          url: publicUrl
        });
      }
    }

    console.log(`\n✅ Successfully uploaded ${uploadedFrames.length} frames`);

    // Display frame URLs
    console.log('\n🔗 Frame URLs:');
    uploadedFrames.forEach(frame => {
      console.log(`  ${frame.timestamp}s: ${frame.url}`);
    });

    // Ask about cleanup
    console.log('\n💡 Uploaded frames locations:');
    uploadedFrames.forEach(frame => {
      console.log(`  - ${frame.path}`);
    });
    console.log('⚠️  Note: Uploaded frames were NOT deleted. Delete manually if needed.');

    // Clean up temp directory
    console.log('\n🧹 Cleaning up temporary files...');
    rmSync(tempDir, { recursive: true, force: true });
    console.log('✅ Temporary files removed');

    console.log('\n✨ Frame extraction test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Cleanup on error
    const tempDir = join(process.cwd(), 'upload-test', 'temp-frames');
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    
    process.exit(1);
  }
}

// Check if ffmpeg is installed
async function checkFFmpeg() {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-version']);
    
    ffmpeg.on('error', () => {
      console.error('❌ ffmpeg is not installed or not in PATH');
      console.log('Please install ffmpeg: https://ffmpeg.org/download.html');
      console.log('On macOS: brew install ffmpeg');
      console.log('On Ubuntu: sudo apt-get install ffmpeg');
      process.exit(1);
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('✅ ffmpeg is installed\n');
        resolve();
      }
    });
  });
}

// Run the test
checkFFmpeg().then(() => testFrameExtraction());