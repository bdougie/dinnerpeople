import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Supabase client with service role (bypasses RLS)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || (!supabaseServiceKey && !supabaseAnonKey)) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Use service role key if available, otherwise fall back to anon key
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

if (supabaseServiceKey) {
  console.log('🔐 Using service role key (bypasses RLS)\n');
} else {
  console.log('🔑 Using anon key (subject to RLS policies)\n');
}

// Test video upload functionality
async function testVideoUpload() {
  console.log('🚀 Testing video upload to Supabase Storage...\n');

  try {
    // Create a test video file (we'll use a small sample file)
    const testVideoPath = process.argv[2];
    
    if (!testVideoPath) {
      console.error('Please provide a video file path as argument');
      console.log('Usage: node test-upload-admin.js <path-to-video-file>');
      process.exit(1);
    }

    // Check if buckets exist
    console.log('🔍 Checking storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Cannot list buckets:', bucketsError);
      return;
    }
    
    console.log('📦 Available buckets:', buckets.map(b => `${b.name} (${b.public ? 'public' : 'private'})`).join(', '));
    
    // Check if videos bucket exists
    const videosBucket = buckets.find(b => b.name === 'videos');
    if (!videosBucket) {
      console.log('\n⚠️  "videos" bucket not found. Creating it...');
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('videos', {
        public: false,
        fileSizeLimit: 104857600 // 100MB
      });
      
      if (createError) {
        console.error('❌ Failed to create bucket:', createError);
        return;
      }
      console.log('✅ Created "videos" bucket');
    }

    console.log(`\n📁 Reading video file: ${testVideoPath}`);
    const videoBuffer = readFileSync(testVideoPath);
    const fileName = `upload-test/test-video-${Date.now()}.mp4`;

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
      .list('upload-test', {
        limit: 10,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (listError) {
      console.error('❌ Failed to list files:', listError);
    } else {
      console.log(`Found ${listData.length} files in upload-test folder:`);
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

    // Ask user if they want to delete the test file
    console.log(`\n✨ Video upload test completed successfully!`);
    console.log(`\n💡 Test file location: ${uploadData.path}`);
    console.log('⚠️  Note: Test file was NOT deleted. Delete manually if needed.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testVideoUpload();