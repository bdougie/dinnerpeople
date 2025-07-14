import { createClient } from '@supabase/supabase-js';

// Production configuration
const SUPABASE_URL = import.meta.env['VITE_SUPABASE_URL'];
const SUPABASE_ANON_KEY = import.meta.env['VITE_SUPABASE_ANON_KEY'];

// Create Supabase client
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

/**
 * Format attribution data for Supabase JSONB storage
 * @param handle Social media handle (optional)
 * @param videoUrl Original video URL (optional)
 * @returns Properly formatted object for JSONB storage
 */
export function formatAttribution(handle?: string, videoUrl?: string): object {
  // Create a clean object with only defined values
  const attribution: Record<string, string> = {};
  
  if (handle && handle.trim() !== '') {
    attribution['handle'] = handle.trim();
  }
  
  if (videoUrl && videoUrl.trim() !== '') {
    attribution['original_url'] = videoUrl.trim();
  }
  
  // Return the object - Supabase will handle converting to JSONB
  return attribution;
}