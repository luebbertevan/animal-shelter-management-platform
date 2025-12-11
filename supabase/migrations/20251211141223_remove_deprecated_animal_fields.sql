-- Migration: Remove Deprecated Animal Fields
-- Removes unused fields from animals table:
-- - intake_date
-- - date_available_for_adoption
-- - source
-- - intake_type
-- - parent_id
-- - sibling_ids
-- - added_to_petstablished
-- - petstablished_sync_needed
-- - petstablished_last_synced
-- Note: created_by is kept for auditing/accountability purposes

-- Drop deprecated columns
ALTER TABLE public.animals
  DROP COLUMN IF EXISTS intake_date,
  DROP COLUMN IF EXISTS date_available_for_adoption,
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS intake_type,
  DROP COLUMN IF EXISTS parent_id,
  DROP COLUMN IF EXISTS sibling_ids,
  DROP COLUMN IF EXISTS added_to_petstablished,
  DROP COLUMN IF EXISTS petstablished_sync_needed,
  DROP COLUMN IF EXISTS petstablished_last_synced;

