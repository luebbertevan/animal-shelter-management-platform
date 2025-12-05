-- Milestone 5.9a: Photo Sharing Setup
-- Adds photo_urls column to messages table and sets up storage bucket

-- ============================================
-- DATABASE SCHEMA UPDATE
-- ============================================

-- Add photo_urls column to messages table
-- Stores array of Supabase Storage URLs: ["url1", "url2", ...]
ALTER TABLE public.messages
ADD COLUMN photo_urls JSONB DEFAULT NULL;

-- Add comment to document the column structure
COMMENT ON COLUMN public.messages.photo_urls IS 
  'Array of photo URLs from Supabase Storage. Structure: ["https://.../photo1.jpg", "https://.../photo2.jpg"]. NULL if message has no photos.';

-- ============================================
-- STORAGE BUCKET SETUP
-- ============================================

-- Create storage bucket for photos (unified bucket for messages, animals, groups)
-- Note: Bucket creation via SQL requires INSERT into storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  true, -- Public bucket (RLS policies control access)
  8388608, -- 8MB file size limit (8 * 1024 * 1024 bytes)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] -- Allowed file types
)
ON CONFLICT (id) DO NOTHING; -- Don't error if bucket already exists

-- ============================================
-- STORAGE RLS POLICIES
-- ============================================

-- Enable RLS on storage.objects (idempotent - won't error if already enabled)
DO $$
BEGIN
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN
    -- RLS might already be enabled, ignore error
    NULL;
END $$;

-- Policy: Users can upload photos to their organization's folder
-- Path structure: {organization_id}/messages/{conversation_id}/{filename}
DROP POLICY IF EXISTS "Users can upload photos to their organization" ON storage.objects;
CREATE POLICY "Users can upload photos to their organization"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photos' AND
  -- Extract organization_id from path (first segment before first '/')
  split_part(name, '/', 1) = (
    SELECT organization_id::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Policy: Users can view photos from conversations they have access to
-- This relies on the path structure: {organization_id}/messages/{conversation_id}/...
DROP POLICY IF EXISTS "Users can view photos from accessible conversations" ON storage.objects;
CREATE POLICY "Users can view photos from accessible conversations"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'photos' AND
  -- Check if user has access to the conversation
  EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE c.organization_id = p.organization_id
    AND (
      -- Path structure: {organization_id}/messages/{conversation_id}/...
      split_part(name, '/', 1) = p.organization_id::text
      AND split_part(name, '/', 2) = 'messages'
      AND split_part(name, '/', 3) = c.id::text
    )
  )
);

-- Policy: Users can delete photos they uploaded (from their organization)
DROP POLICY IF EXISTS "Users can delete photos from their organization" ON storage.objects;
CREATE POLICY "Users can delete photos from their organization"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'photos' AND
  split_part(name, '/', 1) = (
    SELECT organization_id::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Note: Update policy not needed for photos (photos are immutable - upload new, delete old)

