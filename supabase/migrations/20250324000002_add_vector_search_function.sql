/*
  # Add function for vector similarity search
  
  1. Changes
    - Create a function to search for similar frames using vector embeddings
    
  2. Notes
    - Uses cosine similarity for matching
    - Returns frame details along with similarity score
*/

-- Create a function for similarity search
CREATE OR REPLACE FUNCTION search_frames(
  query_embedding vector(1536),
  similarity_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  recipe_id uuid,
  "timestamp" int,  -- Escaped reserved keyword with double quotes
  description text,
  image_url text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vf.id,
    vf.recipe_id,
    vf."timestamp",  -- Escaped reserved keyword with double quotes
    vf.description,
    vf.image_url,
    1 - (vf.embedding <=> query_embedding) as similarity
  FROM
    video_frames vf
  WHERE
    1 - (vf.embedding <=> query_embedding) > similarity_threshold
  ORDER BY
    vf.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
