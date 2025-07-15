# Database Configuration Fix

## Issue
The database writes were failing with the error:
```
unrecognized configuration parameter "app.settings.supabase_url"
```

This was caused by a migration (`20250326000002_update_video_urls.sql`) that tried to use a custom configuration parameter that doesn't exist in the database.

## Current Status

✅ Database connection is working
✅ Can query existing recipes
❌ Cannot insert new recipes due to the trigger error

## Solution

### Option 1: Quick Fix (Apply Now)

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run this SQL to remove the problematic trigger:

```sql
-- Drop the problematic trigger
DROP TRIGGER IF EXISTS format_video_url_trigger ON recipes;

-- Drop the function that uses app.settings
DROP FUNCTION IF EXISTS format_storage_url();

-- Verify the fix
SELECT 'Trigger removed successfully' as status;
```

4. After running this, the tests should work

### Option 2: Apply the Full Fix Migration

1. Run the fix migration in your Supabase project:
   ```bash
   supabase migration up
   ```

   Or apply it manually through the Supabase dashboard by running the SQL in:
   ```
   supabase/migrations/20250715000001_fix_app_settings_error.sql
   ```

2. This migration:
   - Removes the dependency on `app.settings.supabase_url`
   - Simplifies the video URL handling
   - Adds a helper function `test_create_recipe` for testing

### Option 2: Quick Fix (Temporary)

If you can't apply migrations right now, you can set the configuration parameter temporarily:

```sql
-- Run this in the SQL editor before your tests
SET app.settings.supabase_url = 'https://your-project.supabase.co';
```

### Option 3: Use Service Role Key

The test scripts with `-admin` suffix use the service role key which bypasses some of these issues:
- `test-upload-admin.js`
- `test-frame-extraction-admin.js`
- `test-embeddings-fixed.js`

## Testing After Fix

1. Run the improved embeddings test:
   ```bash
   node scripts/test/test-embeddings-fixed.js
   ```

2. This version:
   - Uses service role key for better access
   - Has better error handling
   - Falls back to direct insert if the helper function doesn't exist

## Prevention

For future migrations:
- Avoid using custom configuration parameters
- Store configuration in environment variables or a settings table
- Test migrations in a local Supabase instance first