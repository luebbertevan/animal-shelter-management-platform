-- Migration: Add DELETE policy for animal_groups table
-- Allows coordinators to delete groups in their organization

-- Coordinators can delete animal groups in their organization
CREATE POLICY "Coordinators can delete animal groups in their organization"
  ON public.animal_groups FOR DELETE
  USING (
    public.is_coordinator()
    AND organization_id = public.get_user_organization_id()
  );

