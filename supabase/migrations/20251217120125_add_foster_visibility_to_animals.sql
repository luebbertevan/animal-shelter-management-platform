-- Migration: Add foster_visibility column to animals table
-- Adds non-nullable foster_visibility field with default 'available_now'
-- Sets all existing animals to 'available_now' to ensure group consistency

-- Step 1: Add foster_visibility column with default
ALTER TABLE public.animals
  ADD COLUMN IF NOT EXISTS foster_visibility TEXT NOT NULL DEFAULT 'available_now'
  CHECK (foster_visibility IN ('available_now', 'available_future', 'foster_pending', 'not_visible'));

-- Step 2: Set all existing animals to 'available_now'
-- This ensures all animals in groups have the same foster_visibility value
-- Note: Since column has DEFAULT 'available_now', existing rows already have this value,
-- but this UPDATE ensures consistency explicitly
UPDATE public.animals
SET foster_visibility = 'available_now';

-- Add comment to foster_visibility column
COMMENT ON COLUMN public.animals.foster_visibility IS 'Controls whether animal appears on Fosters Needed page and what badge message is shown. Values: available_now, available_future, foster_pending, not_visible';

