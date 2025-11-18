-- Add priority field to animals table
-- Priority is a boolean flag indicating high priority placement needs

ALTER TABLE public.animals
ADD COLUMN priority BOOLEAN DEFAULT false;

