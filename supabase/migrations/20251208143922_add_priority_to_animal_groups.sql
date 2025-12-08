-- Add priority field to animal_groups table
-- Priority is a boolean flag indicating high priority placement needs
-- Priority defaults to high if any animal in the group is high priority (handled in frontend)

ALTER TABLE public.animal_groups
ADD COLUMN priority BOOLEAN DEFAULT false;

