-- Migration: Fix storage DELETE policy to use helper function
-- The current policy uses a subquery which may not work reliably in storage RLS context
-- This updates it to use the get_user_organization_id() helper function for consistency

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can delete photos from their organization" ON storage.objects;

-- Recreate the policy using the helper function
-- Note: We need to cast to text for comparison since split_part returns text
CREATE POLICY "Users can delete photos from their organization"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'photos' AND
  split_part(name, '/', 1) = public.get_user_organization_id()::text
);

