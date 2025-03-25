/*
  # Add vector resizing support for different embedding models
  
  1. Changes
    - Creates a function to standardize embeddings with different dimensions
    - Allows embeddings from different models (Ollama, OpenAI) to use the same tables
    
  2. Notes
    - Pads shorter vectors with zeros
    - Truncates longer vectors to target size
    - Preserves existing embeddings and indexes
*/

-- Function to resize embeddings to the target dimension
CREATE OR REPLACE FUNCTION resize_embedding(
  input_embedding vector,
  target_dimension integer
)
RETURNS vector
LANGUAGE plpgsql
AS $$
DECLARE
  input_dimension integer;
  result_embedding vector;
  i integer;
BEGIN
  -- Get the current dimension of the input vector
  input_dimension := array_length(input_embedding, 1);
  
  -- Initialize the result vector with zeros
  result_embedding := array_fill(0::float, ARRAY[target_dimension]);
  
  -- Copy values from input to result
  -- If input is shorter, remaining values stay as zeros (padding)
  -- If input is longer, extra values are discarded (truncation)
  FOR i IN 1..LEAST(input_dimension, target_dimension) LOOP
    result_embedding[i] := input_embedding[i];
  END LOOP;
  
  RETURN result_embedding;
END;
$$;

-- Create a trigger function to automatically resize embeddings on insert/update
CREATE OR REPLACE FUNCTION auto_resize_embedding()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if embedding column exists and has a value
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

-- Apply the trigger to video_frames table
DROP TRIGGER IF EXISTS resize_video_frame_embedding ON video_frames;
CREATE TRIGGER resize_video_frame_embedding
BEFORE INSERT OR UPDATE ON video_frames
FOR EACH ROW
EXECUTE FUNCTION auto_resize_embedding();

-- Apply the trigger to recipes table for recipe_summary
DROP TRIGGER IF EXISTS resize_recipe_summary ON recipes;
CREATE TRIGGER resize_recipe_summary
BEFORE INSERT OR UPDATE ON recipes
FOR EACH ROW
EXECUTE FUNCTION auto_resize_embedding();

COMMENT ON FUNCTION resize_embedding IS 
  'Resizes embeddings to a target dimension by padding with zeros or truncating';
COMMENT ON FUNCTION auto_resize_embedding IS 
  'Trigger function that automatically resizes embeddings to 1536 dimensions';
