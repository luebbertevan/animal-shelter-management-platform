-- Remove age_estimate column from animals table
-- Age will now be calculated on-demand from date_of_birth

ALTER TABLE public.animals
DROP COLUMN IF EXISTS age_estimate;

