-- Migration: Add created_by field to animal_groups table
-- This allows tracking which user created each group

-- Add created_by column to animal_groups table
ALTER TABLE public.animal_groups
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- Add comment to document the field
COMMENT ON COLUMN public.animal_groups.created_by IS 'User ID who created the group';

