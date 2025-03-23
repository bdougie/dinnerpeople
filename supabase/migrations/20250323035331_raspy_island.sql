/*
  # Initial Schema Setup for dinnerpeople

  1. New Tables
    - `recipes`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `thumbnail_url` (text)
      - `ingredients` (text[])
      - `instructions` (text)
      - `user_id` (uuid, references auth.users)
      - `attribution` (jsonb)
      - `created_at` (timestamptz)
    
    - `video_frames`
      - `id` (uuid, primary key)
      - `recipe_id` (uuid, references recipes)
      - `timestamp` (integer)
      - `description` (text)
      - `image_url` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to:
      - Read their own recipes
      - Create new recipes
      - Update their own recipes
      - Delete their own recipes
      - Read video frames for their recipes
      - Create video frames for their recipes
*/

-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  thumbnail_url text,
  ingredients text[] NOT NULL DEFAULT '{}',
  instructions text,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  attribution jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create video_frames table
CREATE TABLE IF NOT EXISTS video_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  timestamp integer NOT NULL,
  description text,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_frames ENABLE ROW LEVEL SECURITY;

-- Policies for recipes
CREATE POLICY "Users can read own recipes"
  ON recipes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create recipes"
  ON recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes"
  ON recipes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes"
  ON recipes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for video_frames
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