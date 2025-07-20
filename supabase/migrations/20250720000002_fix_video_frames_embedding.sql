-- Fix video_frames embedding column to handle OpenAI embeddings
-- The text-embedding-3-small model produces 1536-dimensional embeddings by default

-- First, drop any existing triggers that might interfere
DROP TRIGGER IF EXISTS resize_video_frame_embedding ON video_frames;
DROP TRIGGER IF EXISTS fix_embedding_dimensions_trigger ON video_frames;

-- Alter the embedding column to ensure it can handle 1536 dimensions
-- First drop the column if it exists with wrong type
ALTER TABLE video_frames DROP COLUMN IF EXISTS embedding;

-- Add it back with the correct type
ALTER TABLE video_frames ADD COLUMN embedding vector(1536);

-- Create an index for vector similarity search
CREATE INDEX IF NOT EXISTS video_frames_embedding_idx 
ON video_frames 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Add a comment explaining the column
COMMENT ON COLUMN video_frames.embedding IS 'OpenAI text-embedding-3-small embeddings (1536 dimensions)';