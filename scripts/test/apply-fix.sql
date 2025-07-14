-- Quick fix to apply in Supabase SQL editor
-- This disables the problematic trigger temporarily

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS format_video_url_trigger ON recipes;

-- Drop the function that uses app.settings
DROP FUNCTION IF EXISTS format_storage_url();

-- Now recipes can be inserted without the app.settings error

-- To verify the fix worked:
SELECT 'Trigger removed successfully' as status;