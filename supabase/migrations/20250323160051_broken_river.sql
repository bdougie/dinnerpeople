/*
  # Add recipe interactions

  1. New Tables
    - `recipe_interactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `recipe_id` (uuid, references recipes)
      - `liked` (boolean)
      - `saved` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes
    - Add unique constraint to prevent duplicate interactions
    - Add indexes for faster querying

  3. Security
    - Enable RLS on recipe_interactions table
    - Add policies for CRUD operations
*/

CREATE TABLE IF NOT EXISTS recipe_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  liked boolean DEFAULT false,
  saved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS recipe_interactions_user_id_idx ON recipe_interactions(user_id);
CREATE INDEX IF NOT EXISTS recipe_interactions_recipe_id_idx ON recipe_interactions(recipe_id);

ALTER TABLE recipe_interactions ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own interactions
CREATE POLICY "Users can read own interactions"
  ON recipe_interactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to create interactions
CREATE POLICY "Users can create interactions"
  ON recipe_interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own interactions
CREATE POLICY "Users can update own interactions"
  ON recipe_interactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own interactions
CREATE POLICY "Users can delete own interactions"
  ON recipe_interactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);