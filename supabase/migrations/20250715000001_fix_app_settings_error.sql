-- Fix the app.settings.supabase_url configuration error

-- Drop the problematic trigger and function first
DROP TRIGGER IF EXISTS format_video_url_trigger ON recipes;
DROP FUNCTION IF EXISTS format_storage_url();

-- Create a simpler function that doesn't rely on app settings
CREATE OR REPLACE FUNCTION format_storage_url() RETURNS TRIGGER AS $$
BEGIN
    -- If URL doesn't contain storage path but has file extension
    IF NEW.video_url IS NOT NULL AND 
       NEW.video_url NOT LIKE '%/storage/v1/object/public/%' AND
       (NEW.video_url LIKE '%.mp4' OR NEW.video_url LIKE '%.mov' OR NEW.video_url LIKE '%.webm')
    THEN
        -- For now, just prepend the storage path without the domain
        -- The app will handle adding the full Supabase URL
        NEW.video_url = CONCAT(
            'videos/',
            NEW.video_url
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER format_video_url_trigger
BEFORE INSERT OR UPDATE OF video_url ON recipes
FOR EACH ROW
EXECUTE FUNCTION format_storage_url();

-- Update any existing records that might have been affected
-- Just ensure they have proper paths without the full URL
UPDATE recipes 
SET video_url = 
    CASE
        WHEN video_url IS NULL THEN NULL
        WHEN video_url LIKE '%/storage/v1/object/public/videos/%' THEN 
            -- Extract just the path after 'videos/'
            regexp_replace(video_url, '.*/storage/v1/object/public/videos/', 'videos/')
        WHEN video_url LIKE 'videos/%' THEN video_url
        WHEN video_url LIKE '%.mp4' OR video_url LIKE '%.mov' OR video_url LIKE '%.webm' 
            THEN CONCAT('videos/', video_url)
        ELSE video_url
    END
WHERE video_url IS NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN recipes.video_url IS 'Path to video in Supabase Storage. Format: videos/filename.mp4. Full URL is constructed by the application.';

-- Add a helper function for tests that doesn't require app settings
CREATE OR REPLACE FUNCTION test_create_recipe(
    p_title text,
    p_description text,
    p_video_url text,
    p_user_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
) RETURNS uuid AS $$
DECLARE
    v_recipe_id uuid;
BEGIN
    INSERT INTO recipes (title, description, video_url, user_id)
    VALUES (p_title, p_description, p_video_url, p_user_id)
    RETURNING id INTO v_recipe_id;
    
    RETURN v_recipe_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION test_create_recipe TO anon, authenticated;