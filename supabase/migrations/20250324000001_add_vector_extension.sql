/*
  # Enable vector extension and add embedding support
  
  1. Changes
    - Enable the vector extension for embedding support
    - Add embedding column to video_frames table
    - Create an index for similarity searches
    
  2. Notes
    - Uses 1536 dimensions for OpenAI embeddings compatibility
    - Creates an index for efficient similarity queries
*/

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to video_frames table
ALTER TABLE video_frames ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create an index for similarity searches
CREATE INDEX IF NOT EXISTS video_frames_embedding_idx 
ON video_frames 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
