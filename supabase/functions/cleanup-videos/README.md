# Video Cleanup Function

This Edge Function automatically removes expired videos and their corresponding thumbnails from Supabase Storage.

## Features

- Runs on a daily schedule
- Checks video metadata for deletion dates
- Removes expired videos and their thumbnails
- Uses service role key for storage access
- Handles CORS for web access

## Deployment

1. Deploy the function:
```bash
supabase functions deploy cleanup-videos
```

2. Set up a CRON job to run daily:
```sql
select cron.schedule(
  'daily-video-cleanup',
  '0 0 * * *', -- Run at midnight every day
  'https://[PROJECT_REF].supabase.co/functions/v1/cleanup-videos'
);
```

## Environment Variables

The function requires these environment variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Security

- Uses service role key for admin access
- Implements CORS headers for web access
- Only accessible via scheduled CRON job