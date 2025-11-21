-- Add Organization ID to Core Tables
-- Links users, animals, and animal groups to organizations for data isolation
-- Uses existing "Fractal For Cats" organization (ID: 2c20afd1-43b6-4e67-8790-fac084a71fa2) as default

-- Default organization ID constant
DO $$
DECLARE
  default_org_id UUID := '2c20afd1-43b6-4e67-8790-fac084a71fa2';
BEGIN
  -- Verify organization exists
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = default_org_id) THEN
    RAISE EXCEPTION 'Organization with ID % does not exist', default_org_id;
  END IF;
END $$;

-- Add organization_id to profiles table
ALTER TABLE public.profiles
ADD COLUMN organization_id UUID NOT NULL 
  DEFAULT '2c20afd1-43b6-4e67-8790-fac084a71fa2' 
  REFERENCES public.organizations(id);

-- Add organization_id to animals table
ALTER TABLE public.animals
ADD COLUMN organization_id UUID NOT NULL 
  DEFAULT '2c20afd1-43b6-4e67-8790-fac084a71fa2' 
  REFERENCES public.organizations(id);

-- Add organization_id to animal_groups table
ALTER TABLE public.animal_groups
ADD COLUMN organization_id UUID NOT NULL 
  DEFAULT '2c20afd1-43b6-4e67-8790-fac084a71fa2' 
  REFERENCES public.organizations(id);

-- Create profile creation trigger function
-- This automatically creates a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    'foster', -- Default role is 'foster'
    '2c20afd1-43b6-4e67-8790-fac084a71fa2' -- Default organization
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires when a new user is created in auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Note: This trigger will be updated in Phase 5.2 (Milestone 5.2) to also create conversations
-- For now, it just creates the profile with organization_id

