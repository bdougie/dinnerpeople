import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all files from the videos bucket
    const { data: files, error: listError } = await supabaseClient
      .storage
      .from('videos')
      .list();

    if (listError) {
      throw listError;
    }

    const now = new Date();
    const filesToDelete: string[] = [];

    // Check each file's metadata for deletion date
    for (const file of files) {
      if (file.metadata?.deleteAt) {
        const deleteAt = new Date(file.metadata.deleteAt);
        if (deleteAt <= now) {
          filesToDelete.push(file.name);
        }
      }
    }

    // Delete expired files
    if (filesToDelete.length > 0) {
      const { error: deleteError } = await supabaseClient
        .storage
        .from('videos')
        .remove(filesToDelete);

      if (deleteError) {
        throw deleteError;
      }

      // Also delete corresponding thumbnails
      const thumbnailPaths = filesToDelete.map(path => 
        path.replace(/\.[^/.]+$/, '.jpg') // Replace video extension with .jpg
      );

      await supabaseClient
        .storage
        .from('thumbnails')
        .remove(thumbnailPaths);
    }

    return new Response(
      JSON.stringify({
        message: `Cleanup completed. Deleted ${filesToDelete.length} expired files.`,
        deletedFiles: filesToDelete
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});