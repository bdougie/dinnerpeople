import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin access
);

async function setupStorageBuckets() {
  const buckets = ['videos', 'thumbnails', 'frames'];
  
  for (const bucketName of buckets) {
    try {
      // Check if bucket exists
      const { data: existingBucket, error: checkError } = await supabase
        .storage
        .getBucket(bucketName);
      
      if (checkError && checkError.message.includes('not found')) {
        // Create bucket if it doesn't exist
        const { data, error } = await supabase
          .storage
          .createBucket(bucketName, {
            public: bucketName !== 'videos', // videos bucket is private
            fileSizeLimit: bucketName === 'videos' ? 104857600 : 10485760, // 100MB for videos, 10MB for others
            allowedMimeTypes: bucketName === 'videos' 
              ? ['video/mp4', 'video/quicktime', 'video/x-msvideo']
              : ['image/jpeg', 'image/png', 'image/webp']
          });
          
        if (error) {
          console.error(`Error creating bucket ${bucketName}:`, error);
        } else {
          console.log(`✅ Created bucket: ${bucketName}`);
        }
      } else {
        console.log(`✅ Bucket already exists: ${bucketName}`);
      }
    } catch (err) {
      console.error(`Error checking bucket ${bucketName}:`, err);
    }
  }
}

setupStorageBuckets().then(() => {
  console.log('\nStorage setup complete!');
  process.exit(0);
}).catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});