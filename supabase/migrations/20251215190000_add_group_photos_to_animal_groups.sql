-- Migration: Add group_photos JSONB column to animal_groups table
-- This column stores an array of photo metadata objects with url, uploaded_at, and uploaded_by fields

-- Add group_photos column to animal_groups table
ALTER TABLE public.animal_groups
  ADD COLUMN IF NOT EXISTS group_photos JSONB DEFAULT '[]'::jsonb;

-- Add comment to document the field
COMMENT ON COLUMN public.animal_groups.group_photos IS 'Array of group photo metadata objects. Each object contains: url (string), uploaded_at (ISO date string), uploaded_by (user ID string)';

