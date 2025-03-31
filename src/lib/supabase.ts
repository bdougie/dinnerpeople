import { createClient } from '@supabase/supabase-js';

// Determine Supabase URL and anon key based on environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Create Supabase client
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