/*
  # Add status column to recipes table

  1. Changes
    - Add `status` column to `recipes` table with valid status values
    - Add default value of 'draft'
    - Add check constraint for valid status values

  2. Notes
    - Status values: draft, processing, published, failed
    - Non-destructive change (adds column only)
*/

DO $$ BEGIN
  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recipes' AND column_name = 'status'
  ) THEN
    ALTER TABLE recipes 
    ADD COLUMN status text NOT NULL DEFAULT 'draft';

    -- Add check constraint for valid status values
    ALTER TABLE recipes 
    ADD CONSTRAINT valid_recipe_status 
    CHECK (status IN ('draft', 'processing', 'published', 'failed'));
  END IF;
END $$;

-- Update existing recipes to have a status if needed
UPDATE recipes 
SET status = 'draft' 
WHERE status IS NULL;