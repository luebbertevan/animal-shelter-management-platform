-- Update RLS Policies for Organization Isolation
-- Ensures users can only see and manage data from their own organization

-- Helper function to get current user's organization_id
-- This function bypasses RLS to get the user's organization_id
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Update is_coordinator() function to optionally check organization
-- For now, we keep it simple (just role check) since all users are in default org
-- But we prepare it for future multi-org coordinator checks
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

-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Coordinators can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view animals" ON public.animals;
DROP POLICY IF EXISTS "Coordinators can create animals" ON public.animals;
DROP POLICY IF EXISTS "Coordinators can update animals" ON public.animals;
DROP POLICY IF EXISTS "Anyone can view animal groups" ON public.animal_groups;
DROP POLICY IF EXISTS "Coordinators can create animal groups" ON public.animal_groups;
DROP POLICY IF EXISTS "Coordinators can update animal groups" ON public.animal_groups;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view their own profile (always allowed)
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can view profiles in their organization
CREATE POLICY "Users can view profiles in their organization"
  ON public.profiles FOR SELECT
  USING (
    organization_id = public.get_user_organization_id()
  );

-- Coordinators can view all profiles in their organization
CREATE POLICY "Coordinators can view all profiles in their organization"
  ON public.profiles FOR SELECT
  USING (
    public.is_coordinator() 
    AND organization_id = public.get_user_organization_id()
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- ANIMALS POLICIES
-- ============================================

-- Users can view animals in their organization
CREATE POLICY "Users can view animals in their organization"
  ON public.animals FOR SELECT
  USING (
    organization_id = public.get_user_organization_id()
  );

-- Coordinators can create animals in their organization
CREATE POLICY "Coordinators can create animals in their organization"
  ON public.animals FOR INSERT
  WITH CHECK (
    public.is_coordinator()
    AND organization_id = public.get_user_organization_id()
  );

-- Coordinators can update animals in their organization
CREATE POLICY "Coordinators can update animals in their organization"
  ON public.animals FOR UPDATE
  USING (
    public.is_coordinator()
    AND organization_id = public.get_user_organization_id()
  );

-- ============================================
-- ANIMAL_GROUPS POLICIES
-- ============================================

-- Users can view animal groups in their organization
CREATE POLICY "Users can view animal groups in their organization"
  ON public.animal_groups FOR SELECT
  USING (
    organization_id = public.get_user_organization_id()
  );

-- Coordinators can create animal groups in their organization
CREATE POLICY "Coordinators can create animal groups in their organization"
  ON public.animal_groups FOR INSERT
  WITH CHECK (
    public.is_coordinator()
    AND organization_id = public.get_user_organization_id()
  );

-- Coordinators can update animal groups in their organization
CREATE POLICY "Coordinators can update animal groups in their organization"
  ON public.animal_groups FOR UPDATE
  USING (
    public.is_coordinator()
    AND organization_id = public.get_user_organization_id()
  );

