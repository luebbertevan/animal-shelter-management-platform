-- Migration: Add uploaded_at timestamp to animal photos
-- Updates the photos JSONB column structure to include uploaded_at timestamp
-- This migration updates the comment to reflect the new structure.
-- Note: All existing animal photos should be deleted before running this migration
-- as uploaded_at is now a required field in the PhotoMetadata type.

-- Update comment to reflect new structure with uploaded_at
COMMENT ON COLUMN public.animals.photos IS 'JSONB array of photo objects with metadata: [{"url": "...", "uploaded_at": "...", "uploaded_by": "..."}, ...]';

