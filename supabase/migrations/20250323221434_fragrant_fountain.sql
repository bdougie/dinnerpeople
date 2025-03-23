/*
  # Set up CRON job for video cleanup

  1. Changes
    - Creates a CRON job to run the cleanup-videos function every 7 days
    - Job will run at midnight UTC
*/

-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup job to run every 7 days at midnight UTC
SELECT cron.schedule(
  'weekly-video-cleanup',           -- unique job name
  '0 0 */7 * *',                   -- CRON expression: At 00:00 every 7th day
  'https://oryvyobhmvztbwjzzllo.supabase.co/functions/v1/cleanup-videos'
);