/*
  # Add video processing tables and functions

  1. New Tables
    - `processing_queue`
      - Tracks video processing status
    - `frames`
      - Stores extracted video frames
    - `frame_descriptions`
      - Stores AI-generated descriptions for frames

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create frames bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('frames', 'frames', true)
ON CONFLICT DO NOTHING;

-- Create processing queue table
CREATE TABLE IF NOT EXISTS processing_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Create frame descriptions table
CREATE TABLE IF NOT EXISTS frame_descriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,
  timestamp integer NOT NULL,
  description text NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_frame_timestamp UNIQUE (recipe_id, timestamp)
);

-- Enable RLS
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE frame_descriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for processing_queue
CREATE POLICY "Users can view own processing queue"
  ON processing_queue
  FOR SELECT
  TO authenticated
  USING (recipe_id IN (
    SELECT id FROM recipes WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own processing queue"
  ON processing_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (recipe_id IN (
    SELECT id FROM recipes WHERE user_id = auth.uid()
  ));

-- RLS Policies for frame_descriptions
CREATE POLICY "Users can view own frame descriptions"
  ON frame_descriptions
  FOR SELECT
  TO authenticated
  USING (recipe_id IN (
    SELECT id FROM recipes WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own frame descriptions"
  ON frame_descriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (recipe_id IN (
    SELECT id FROM recipes WHERE user_id = auth.uid()
  ));

-- Storage policies for frames bucket
CREATE POLICY "Authenticated users can upload frames"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'frames' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read frames"
ON storage.objects FOR SELECT
USING (bucket_id = 'frames');

-- Function to update processing status
CREATE OR REPLACE FUNCTION update_processing_status(
  p_queue_id uuid,
  p_status text,
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE processing_queue
  SET 
    status = p_status,
    error = p_error,
    updated_at = now(),
    started_at = CASE 
      WHEN p_status = 'processing' AND started_at IS NULL 
      THEN now() 
      ELSE started_at 
    END,
    completed_at = CASE 
      WHEN p_status IN ('completed', 'failed') 
      THEN now() 
      ELSE completed_at 
    END
  WHERE id = p_queue_id;
END;
$$;