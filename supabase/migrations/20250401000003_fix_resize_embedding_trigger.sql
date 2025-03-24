-- Fix the auto_resize_embedding trigger to check for column existence

-- Modify the auto_resize_embedding function to check if the embedding column exists
CREATE OR REPLACE FUNCTION auto_resize_embedding()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  has_embedding boolean;
BEGIN
  -- First check if the table has an embedding column
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM information_schema.columns 
                 WHERE table_name=%L AND column_name=%L)',
                 TG_TABLE_NAME, 'embedding')
  INTO has_embedding;
  
  IF NOT has_embedding THEN
    -- If no embedding column exists, just return NEW without changes
    RETURN NEW;
  END IF;
  
  -- Now we know the embedding column exists, proceed with the resize logic
  IF TG_OP = 'INSERT' AND NEW.embedding IS NOT NULL THEN
    -- Resize to 1536 dimensions (OpenAI standard)
    NEW.embedding := resize_embedding(NEW.embedding, 1536);
  ELSIF TG_OP = 'UPDATE' AND NEW.embedding IS NOT NULL AND 
        (OLD.embedding IS NULL OR NEW.embedding <> OLD.embedding) THEN
    -- Only resize if embedding is actually changing
    NEW.embedding := resize_embedding(NEW.embedding, 1536);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the triggers with the improved function
DROP TRIGGER IF EXISTS resize_video_frame_embedding ON video_frames;
CREATE TRIGGER resize_video_frame_embedding
BEFORE INSERT OR UPDATE ON video_frames
FOR EACH ROW
EXECUTE FUNCTION auto_resize_embedding();

-- Fix the recipes table trigger to only apply when the recipe_summary column is affected
DROP TRIGGER IF EXISTS resize_recipe_summary ON recipes;
CREATE TRIGGER resize_recipe_summary
BEFORE INSERT OR UPDATE OF recipe_summary ON recipes
FOR EACH ROW
EXECUTE FUNCTION auto_resize_embedding();

COMMENT ON FUNCTION auto_resize_embedding IS 
  'Trigger function that automatically resizes embeddings to 1536 dimensions with safety checks';
