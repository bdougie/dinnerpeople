-- Ensure video_frames RLS policies exist
-- The previous migration only recreated them if they already existed

-- Enable RLS on video_frames if not already enabled
ALTER TABLE video_frames ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can read frames of own recipes" ON video_frames;
DROP POLICY IF EXISTS "Users can create frames for own recipes" ON video_frames;
DROP POLICY IF EXISTS "Users can update frames for own recipes" ON video_frames;
DROP POLICY IF EXISTS "Users can delete frames for own recipes" ON video_frames;

-- Create comprehensive RLS policies for video_frames
CREATE POLICY "Users can read frames of own recipes"
  ON video_frames
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = video_frames.recipe_id
      AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create frames for own recipes"
  ON video_frames
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = video_frames.recipe_id
      AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update frames for own recipes"
  ON video_frames
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = video_frames.recipe_id
      AND recipes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = video_frames.recipe_id
      AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete frames for own recipes"
  ON video_frames
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = video_frames.recipe_id
      AND recipes.user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT ALL ON video_frames TO authenticated;