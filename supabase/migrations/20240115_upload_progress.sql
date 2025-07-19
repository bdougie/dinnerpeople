-- Create upload_progress table for realtime upload tracking
CREATE TABLE IF NOT EXISTS upload_progress (
  recipe_id UUID PRIMARY KEY REFERENCES recipes(id) ON DELETE CASCADE,
  progress NUMERIC(5,2) NOT NULL DEFAULT 0,
  bytes_uploaded BIGINT NOT NULL DEFAULT 0,
  total_bytes BIGINT NOT NULL,
  speed NUMERIC DEFAULT 0, -- bytes per second
  status TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'completed', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_upload_progress_status ON upload_progress(status);

-- Enable RLS
ALTER TABLE upload_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own upload progress
CREATE POLICY "Users can view own upload progress" ON upload_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = upload_progress.recipe_id 
      AND recipes.user_id = auth.uid()
    )
  );

-- Policy: Users can insert/update their own upload progress
CREATE POLICY "Users can manage own upload progress" ON upload_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = upload_progress.recipe_id 
      AND recipes.user_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE upload_progress;

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_upload_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER upload_progress_updated_at
  BEFORE UPDATE ON upload_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_upload_progress_updated_at();