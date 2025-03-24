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

-- Create recipes table if it doesn't exist
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

-- Create video_frames table if it doesn't exist
CREATE TABLE IF NOT EXISTS video_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  timestamp integer NOT NULL,
  description text,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (if not already enabled)
ALTER TABLE IF EXISTS recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS video_frames ENABLE ROW LEVEL SECURITY;

-- Skip all policy creation since they were created in previous migration
-- This migration is essentially a duplicate of 20250323035331_raspy_island.sql