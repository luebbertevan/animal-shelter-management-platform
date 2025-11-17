-- Fix RLS infinite recursion by using security definer functions
-- The issue: Policies that check coordinator role query the profiles table,
-- which triggers RLS again, causing infinite recursion.

-- Create a security definer function that bypasses RLS to check if user is coordinator
CREATE OR REPLACE FUNCTION public.is_coordinator()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'coordinator'
  );
$$;

-- Drop old policies that cause recursion
DROP POLICY IF EXISTS "Coordinators can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Coordinators can create animals" ON public.animals;
DROP POLICY IF EXISTS "Coordinators can update animals" ON public.animals;
DROP POLICY IF EXISTS "Coordinators can create animal groups" ON public.animal_groups;
DROP POLICY IF EXISTS "Coordinators can update animal groups" ON public.animal_groups;

-- Recreate policies using the security definer function

-- Profiles Policies
-- Coordinators can view all profiles
CREATE POLICY "Coordinators can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_coordinator());

-- Animals Policies
-- Coordinators can create animals
CREATE POLICY "Coordinators can create animals"
  ON public.animals FOR INSERT
  WITH CHECK (public.is_coordinator());

-- Coordinators can update animals
CREATE POLICY "Coordinators can update animals"
  ON public.animals FOR UPDATE
  USING (public.is_coordinator());

-- Animal Groups Policies
-- Coordinators can create animal groups
CREATE POLICY "Coordinators can create animal groups"
  ON public.animal_groups FOR INSERT
  WITH CHECK (public.is_coordinator());

-- Coordinators can update animal groups
CREATE POLICY "Coordinators can update animal groups"
  ON public.animal_groups FOR UPDATE
  USING (public.is_coordinator());

