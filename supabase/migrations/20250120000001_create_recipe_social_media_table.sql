-- Create recipe_social_media table to store extracted social media handles
CREATE TABLE IF NOT EXISTS recipe_social_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  username TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Add unique constraint to prevent duplicate entries
  UNIQUE(recipe_id, platform, username)
);

-- Create index for faster lookups
CREATE INDEX idx_recipe_social_media_recipe_id ON recipe_social_media(recipe_id);

-- Enable RLS
ALTER TABLE recipe_social_media ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view social media handles for all recipes
CREATE POLICY "Anyone can view recipe social media handles"
  ON recipe_social_media
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can insert social media handles for their own recipes
CREATE POLICY "Users can add social media to own recipes"
  ON recipe_social_media
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_social_media.recipe_id
      AND recipes.user_id = auth.uid()
    )
  );

-- Policy: Users can update social media handles for their own recipes
CREATE POLICY "Users can update social media for own recipes"
  ON recipe_social_media
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_social_media.recipe_id
      AND recipes.user_id = auth.uid()
    )
  );

-- Policy: Users can delete social media handles for their own recipes
CREATE POLICY "Users can delete social media for own recipes"
  ON recipe_social_media
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_social_media.recipe_id
      AND recipes.user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT ON recipe_social_media TO authenticated;
GRANT INSERT, UPDATE, DELETE ON recipe_social_media TO authenticated;