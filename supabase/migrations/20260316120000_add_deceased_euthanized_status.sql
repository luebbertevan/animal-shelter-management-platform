-- Migration: Add deceased and euthanized to animal status
-- - Extend animals.status CHECK to include 'deceased' and 'euthanized'
-- - Update RLS so fosters cannot see animals with status deceased or euthanized

-- Step 1: Extend status CHECK constraint
ALTER TABLE public.animals
  DROP CONSTRAINT IF EXISTS animals_status_check;

ALTER TABLE public.animals
  ADD CONSTRAINT animals_status_check CHECK (status IN (
    'in_foster',
    'adopted',
    'medical_hold',
    'in_shelter',
    'transferring',
    'deceased',
    'euthanized'
  ));

-- Step 2: Update RLS so fosters never see deceased/euthanized animals
-- Drop the existing policy that allows all org users to view all animals
DROP POLICY IF EXISTS "Users can view animals in their organization" ON public.animals;

-- Coordinators see all animals in the org; fosters see only animals that are not deceased or euthanized
CREATE POLICY "Users can view animals in their organization"
  ON public.animals FOR SELECT
  USING (
    organization_id = public.get_user_organization_id()
    AND (
      public.is_coordinator()
      OR status NOT IN ('deceased', 'euthanized')
    )
  );
