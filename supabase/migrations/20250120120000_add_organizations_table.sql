-- Add Organizations Table
-- Organizations support multi-tenancy - multiple shelters using the same system
-- Organizations are created manually by admin (via Supabase dashboard)
-- Coordinators and fosters are assigned to organizations via confirmation codes during signup

CREATE TABLE public.organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view organizations they belong to
-- Note: This policy will be refined in Milestone 4.2 when we add organization_id to profiles
-- For now, we allow all authenticated users to view organizations
-- This will be updated to check if user's profile.organization_id matches
CREATE POLICY "Users can view organizations they belong to"
  ON public.organizations FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Note: Organizations are created manually by admin via Supabase dashboard
-- No INSERT/UPDATE policies are needed at this stage since admins will use service role
-- In the future, we may add policies for coordinators to view their organization

