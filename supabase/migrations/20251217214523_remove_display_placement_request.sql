-- Remove display_placement_request column from animals table
-- This field has been replaced by foster_visibility

ALTER TABLE animals
DROP COLUMN IF EXISTS display_placement_request;

