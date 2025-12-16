-- Migration: Update storage DELETE policy to explicitly allow group photos
-- The current policy should work, but we'll make it explicit for groups
-- This ensures RLS allows deletion of photos in the groups folder

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can delete photos from their organization" ON storage.objects;

-- Recreate the policy with explicit path checks for animals, groups, and messages
CREATE POLICY "Users can delete photos from their organization"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'photos' AND
  split_part(name, '/', 1) = public.get_user_organization_id()::text AND
  (
    split_part(name, '/', 2) = 'animals' OR
    split_part(name, '/', 2) = 'groups' OR
    split_part(name, '/', 2) = 'messages'
  )
);

