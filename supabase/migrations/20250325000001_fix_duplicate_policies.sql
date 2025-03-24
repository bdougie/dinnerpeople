/*
  # Fix duplicate policies in migrations
  
  1. Changes
    - Drop duplicate policies if they exist
    - Recreate policies safely with existence checks
    
  2. Notes
    - Resolves policy conflicts between multiple migrations
    - Non-destructive approach - only acts if needed
*/

-- Function to safely recreate policies
DO $$
DECLARE
  policy_exists boolean;
BEGIN
  -- Check if each policy exists before attempting operations
  
  -- Check for Users can read own recipes
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recipes' AND policyname = 'Users can read own recipes'
  ) INTO policy_exists;
  
  -- If exists, drop and recreate
  IF policy_exists THEN
    DROP POLICY IF EXISTS "Users can read own recipes" ON recipes;
    
    CREATE POLICY "Users can read own recipes"
      ON recipes
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- Users can create recipes
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recipes' AND policyname = 'Users can create recipes'
  ) INTO policy_exists;
  
  IF policy_exists THEN
    DROP POLICY IF EXISTS "Users can create recipes" ON recipes;
    
    CREATE POLICY "Users can create recipes"
      ON recipes
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Users can update own recipes
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recipes' AND policyname = 'Users can update own recipes'
  ) INTO policy_exists;
  
  IF policy_exists THEN
    DROP POLICY IF EXISTS "Users can update own recipes" ON recipes;
    
    CREATE POLICY "Users can update own recipes"
      ON recipes
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Users can delete own recipes
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recipes' AND policyname = 'Users can delete own recipes'
  ) INTO policy_exists;
  
  IF policy_exists THEN
    DROP POLICY IF EXISTS "Users can delete own recipes" ON recipes;
    
    CREATE POLICY "Users can delete own recipes"
      ON recipes
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- Video frames policies - Users can read frames of own recipes
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'video_frames' AND policyname = 'Users can read frames of own recipes'
  ) INTO policy_exists;
  
  IF policy_exists THEN
    DROP POLICY IF EXISTS "Users can read frames of own recipes" ON video_frames;
    
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
  END IF;

  -- Users can create frames for own recipes
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'video_frames' AND policyname = 'Users can create frames for own recipes'
  ) INTO policy_exists;
  
  IF policy_exists THEN
    DROP POLICY IF EXISTS "Users can create frames for own recipes" ON video_frames;
    
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
  END IF;

END $$;
