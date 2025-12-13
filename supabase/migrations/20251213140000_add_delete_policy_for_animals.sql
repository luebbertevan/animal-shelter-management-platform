-- Migration: Add DELETE policy for animals table
-- Allows coordinators to delete animals in their organization

-- Coordinators can delete animals in their organization
CREATE POLICY "Coordinators can delete animals in their organization"
  ON public.animals FOR DELETE
  USING (
    public.is_coordinator()
    AND organization_id = public.get_user_organization_id()
  );

