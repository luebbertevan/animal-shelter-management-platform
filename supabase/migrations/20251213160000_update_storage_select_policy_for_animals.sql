-- Migration: Update storage SELECT policy to allow viewing animal photos
-- The current policy only allows viewing photos from conversations
-- This adds support for viewing animal photos from the user's organization

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view photos from accessible conversations" ON storage.objects;

-- Recreate the policy to allow viewing both conversation photos and animal photos
CREATE POLICY "Users can view photos from accessible conversations"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'photos' AND
  (
    -- Allow viewing conversation photos (existing logic)
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
    OR
    -- Allow viewing animal photos from user's organization
    (
      split_part(name, '/', 1) = public.get_user_organization_id()::text
      AND split_part(name, '/', 2) = 'animals'
    )
  )
);

