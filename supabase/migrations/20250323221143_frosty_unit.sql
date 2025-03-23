/*
  # Create storage buckets and policies

  1. New Buckets
    - `videos` bucket for storing uploaded cooking videos
    - `thumbnails` bucket for storing video thumbnails

  2. Security
    - Enable RLS on both buckets
    - Add policies for:
      - Authenticated users can upload to their own folder
      - Authenticated users can read their own files
      - Anyone can read public files
      - Only owners can delete their files
*/

-- Create videos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT DO NOTHING;

-- Create thumbnails bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT DO NOTHING;

-- Videos bucket policies
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own videos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own videos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can read public videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

-- Thumbnails bucket policies
CREATE POLICY "Authenticated users can upload thumbnails"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'thumbnails' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own thumbnails"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'thumbnails' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own thumbnails"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'thumbnails' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can read public thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'thumbnails');