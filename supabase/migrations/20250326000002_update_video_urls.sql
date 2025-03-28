-- Migration for properly storing video URLs in recipes table

-- First check if video_url column exists
DO $$
DECLARE
    column_exists boolean;
    update_sql text := 'UPDATE recipes SET video_url = CASE ';
    has_columns boolean := false;
BEGIN
    -- Add video_url column if it doesn't exist
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
                 WHERE table_name='recipes' AND column_name='video_url') THEN
        ALTER TABLE recipes ADD COLUMN video_url TEXT;
        
        -- Check each possible URL column and build dynamic SQL
        -- This avoids errors from non-existent columns
        
        -- Check for 'url' column
        SELECT EXISTS(
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='recipes' AND column_name='url'
        ) INTO column_exists;
        
        IF column_exists THEN
            update_sql := update_sql || 'WHEN url IS NOT NULL THEN url ';
            has_columns := true;
        END IF;
        
        -- Check for 'video_uri' column
        SELECT EXISTS(
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='recipes' AND column_name='video_uri'
        ) INTO column_exists;
        
        IF column_exists THEN
            update_sql := update_sql || 'WHEN video_uri IS NOT NULL THEN video_uri ';
            has_columns := true;
        END IF;
        
        -- Check for 'uri' column
        SELECT EXISTS(
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='recipes' AND column_name='uri'
        ) INTO column_exists;
        
        IF column_exists THEN
            update_sql := update_sql || 'WHEN uri IS NOT NULL THEN uri ';
            has_columns := true;
        END IF;
        
        -- Check for 'media_url' column
        SELECT EXISTS(
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='recipes' AND column_name='media_url'
        ) INTO column_exists;
        
        IF column_exists THEN
            update_sql := update_sql || 'WHEN media_url IS NOT NULL THEN media_url ';
            has_columns := true;
        END IF;
        
        -- Check for 'thumbnail_url' column
        SELECT EXISTS(
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='recipes' AND column_name='thumbnail_url'
        ) INTO column_exists;
        
        IF column_exists THEN
            update_sql := update_sql || 'WHEN thumbnail_url IS NOT NULL THEN thumbnail_url ';
            has_columns := true;
        END IF;
        
        -- Complete and execute the update SQL if any columns were found
        IF has_columns THEN
            update_sql := update_sql || 'ELSE NULL END WHERE video_url IS NULL';
            EXECUTE update_sql;
            RAISE NOTICE 'Updated video_url from existing columns';
        ELSE
            RAISE NOTICE 'No source URL columns found to initialize video_url';
        END IF;
        
        -- Create index for faster lookups
        CREATE INDEX IF NOT EXISTS idx_recipes_video_url ON recipes(video_url);
        
        RAISE NOTICE 'Added video_url column to recipes table';
    ELSE
        RAISE NOTICE 'video_url column already exists';
    END IF;
    
    -- Create a function to properly format storage URLs
    CREATE OR REPLACE FUNCTION format_storage_url() RETURNS TRIGGER AS $function$
    BEGIN
        -- If URL doesn't contain storage path but has file extension
        IF NEW.video_url IS NOT NULL AND 
           NEW.video_url NOT LIKE '%/storage/v1/object/public/%' AND
           (NEW.video_url LIKE '%.mp4' OR NEW.video_url LIKE '%.mov' OR NEW.video_url LIKE '%.webm')
        THEN
            -- Format URL properly with bucket ID
            NEW.video_url = CONCAT(
                current_setting('app.settings.supabase_url', false),
                '/storage/v1/object/public/videos/',
                'bfd7be67-4135-47c6-af37-70e50630bb10/', -- Default bucket ID
                NEW.video_url
            );
        END IF;
        RETURN NEW;
    END;
    $function$ LANGUAGE plpgsql;
    
    -- Create trigger for auto-formatting URLs
    DROP TRIGGER IF EXISTS format_video_url_trigger ON recipes;
    CREATE TRIGGER format_video_url_trigger
    BEFORE INSERT OR UPDATE OF video_url ON recipes
    FOR EACH ROW
    EXECUTE FUNCTION format_storage_url();
    
END $$;

-- Make sure existing URLs are formatted correctly
UPDATE recipes 
SET video_url = CASE
    WHEN video_url IS NULL THEN NULL
    WHEN video_url LIKE '%/storage/v1/object/public/videos/%' THEN video_url
    WHEN video_url LIKE '%.mp4' OR video_url LIKE '%.mov' OR video_url LIKE '%.webm' 
        THEN CONCAT(
            (SELECT current_setting('app.settings.supabase_url', false)),
            '/storage/v1/object/public/videos/bfd7be67-4135-47c6-af37-70e50630bb10/',
            video_url
        )
    ELSE video_url
END
WHERE video_url IS NOT NULL;

-- Comment on column for documentation
COMMENT ON COLUMN recipes.video_url IS 'Full URL to video in Supabase Storage. Should contain /storage/v1/object/public/videos/';
