-- Migration: Update Animal Types and Schema
-- Updates animals table to reflect new field requirements:
-- - Combine sex and spay_neuter_status into sex_spay_neuter_status
-- - Remove needs_foster from status enum
-- - Add display_placement_request column
-- - Add photos JSONB column (minimal metadata)
-- - Add bio column
-- - Remove deprecated columns: vaccines, felv_fiv_test, felv_fiv_test_date, socialization_level, sex, spay_neuter_status
-- - Update life_stage to include 'unknown' option
-- Note: All animal data should be deleted before running this migration

-- Step 1: Add new columns
ALTER TABLE public.animals
  ADD COLUMN IF NOT EXISTS sex_spay_neuter_status TEXT CHECK (sex_spay_neuter_status IN ('female', 'male', 'spayed_female', 'neutered_male')),
  ADD COLUMN IF NOT EXISTS display_placement_request BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- Step 2: Update status CHECK constraint to remove 'needs_foster'
-- Drop the old CHECK constraint
ALTER TABLE public.animals
  DROP CONSTRAINT IF EXISTS animals_status_check;

-- Add new CHECK constraint without 'needs_foster'
ALTER TABLE public.animals
  ADD CONSTRAINT animals_status_check CHECK (status IN (
    'in_foster',
    'adopted',
    'medical_hold',
    'in_shelter',
    'transferring'
  ));

-- Step 3: Update life_stage CHECK constraint to add 'unknown'
-- Drop the old CHECK constraint
ALTER TABLE public.animals
  DROP CONSTRAINT IF EXISTS animals_life_stage_check;

-- Add new CHECK constraint with 'unknown'
ALTER TABLE public.animals
  ADD CONSTRAINT animals_life_stage_check CHECK (life_stage IN ('kitten', 'adult', 'senior', 'unknown'));

-- Step 4: Remove deprecated columns
ALTER TABLE public.animals
  DROP COLUMN IF EXISTS vaccines,
  DROP COLUMN IF EXISTS felv_fiv_test,
  DROP COLUMN IF EXISTS felv_fiv_test_date,
  DROP COLUMN IF EXISTS socialization_level,
  DROP COLUMN IF EXISTS sex,
  DROP COLUMN IF EXISTS spay_neuter_status;

-- Add comment to photos column explaining its structure
COMMENT ON COLUMN public.animals.photos IS 'JSONB array of photo objects with minimal metadata: [{"url": "...", "uploaded_by": "..."}, ...]';

