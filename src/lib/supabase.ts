import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    attribution.handle = handle.trim();
  }
  
  if (videoUrl && videoUrl.trim() !== '') {
    attribution.original_url = videoUrl.trim();
  }
  
  // Return the object - Supabase will handle converting to JSONB
  return attribution;
}