/*
  # Add AI generation tracking to recipes
  
  1. Changes
    - Add ai_generated flag to recipes table
    - Add recipe_summary column with vector embedding
    
  2. Notes
    - Tracks whether recipe content was AI-generated
    - Stores recipe summary as vector embedding for semantic search
*/

-- Add ai_generated flag to recipes table
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS ai_generated boolean DEFAULT false;

-- Add recipe_summary as vector embedding for holistic recipe search
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS recipe_summary vector(1536);

-- Create an index for recipe summary searches
CREATE INDEX IF NOT EXISTS recipes_summary_idx 
ON recipes 
USING ivfflat (recipe_summary vector_cosine_ops) 
WITH (lists = 100);

-- Function to search recipes by semantic similarity
CREATE OR REPLACE FUNCTION search_recipes(
  query_embedding vector(1536),
  similarity_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  thumbnail_url text,
  user_id uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.title,
    r.description,
    r.thumbnail_url,
    r.user_id,
    1 - (r.recipe_summary <=> query_embedding) as similarity
  FROM
    recipes r
  WHERE
    r.recipe_summary IS NOT NULL AND
    1 - (r.recipe_summary <=> query_embedding) > similarity_threshold
  ORDER BY
    r.recipe_summary <=> query_embedding
  LIMIT match_count;
END;
$$;
