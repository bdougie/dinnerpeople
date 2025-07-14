import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test video upload functionality
async function testVideoUpload() {
  console.log('🚀 Testing video upload to Supabase Storage...\n');

  try {
    // Create a test video file (we'll use a small sample file)
    const testVideoPath = process.argv[2];
    
    if (!testVideoPath) {
      console.error('Please provide a video file path as argument');
      console.log('Usage: node test-upload.js <path-to-video-file>');
      process.exit(1);
    }

    console.log(`📁 Reading video file: ${testVideoPath}`);
    const videoBuffer = readFileSync(testVideoPath);
    const fileName = `test-video-${Date.now()}.mp4`;

    // Upload to videos bucket
    console.log(`📤 Uploading to videos bucket as: ${fileName}`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, videoBuffer, {
        contentType: 'video/mp4',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      return;
    }

    console.log('✅ Video uploaded successfully!');
    console.log('📍 Path:', uploadData.path);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(uploadData.path);

    console.log('🔗 Public URL:', publicUrl);

    // Test listing files in bucket
    console.log('\n📋 Listing files in videos bucket:');
    const { data: listData, error: listError } = await supabase.storage
      .from('videos')
      .list('', {
        limit: 10,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (listError) {
      console.error('❌ Failed to list files:', listError);
    } else {
      console.log(`Found ${listData.length} files:`);
      listData.forEach(file => {
        console.log(`  - ${file.name} (${(file.metadata.size / 1024 / 1024).toFixed(2)} MB)`);
      });
    }

    // Test downloading the file
    console.log(`\n📥 Testing download of uploaded file...`);
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('videos')
      .download(uploadData.path);

    if (downloadError) {
      console.error('❌ Download failed:', downloadError);
    } else {
      console.log(`✅ Download successful! Size: ${(downloadData.size / 1024 / 1024).toFixed(2)} MB`);
    }

    // Clean up - delete test file
    console.log(`\n🗑️  Cleaning up - deleting test file...`);
    const { error: deleteError } = await supabase.storage
      .from('videos')
      .remove([uploadData.path]);

    if (deleteError) {
      console.error('❌ Failed to delete test file:', deleteError);
    } else {
      console.log('✅ Test file deleted successfully');
    }

    console.log('\n✨ Video upload test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testVideoUpload();