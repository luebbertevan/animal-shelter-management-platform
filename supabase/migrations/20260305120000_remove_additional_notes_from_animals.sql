-- Remove deprecated additional_notes column from animals
-- This field has been removed from the application UI and types.

ALTER TABLE public.animals
  DROP COLUMN IF EXISTS additional_notes;

