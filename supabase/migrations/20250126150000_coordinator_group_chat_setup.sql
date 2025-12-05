-- Coordinator Group Chat Setup (Milestone 5.3)
-- Creates trigger to automatically create coordinator group chat when organization is created
-- Also includes optional safety function for edge cases

-- ============================================
-- TRIGGER FUNCTION: Create Coordinator Group Chat on Organization Creation
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Automatically create coordinator group chat for new organization
  INSERT INTO public.conversations (organization_id, type, foster_profile_id)
  VALUES (
    NEW.id,
    'coordinator_group',
    NULL  -- coordinator_group type requires foster_profile_id to be NULL
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires when a new organization is created
CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_organization();

-- ============================================
-- OPTIONAL SAFETY FUNCTION: Ensure Coordinator Group Chat Exists
-- ============================================
-- Purpose: Safety net for edge cases:
--   - If trigger fails for any reason
--   - If coordinator group chat is accidentally deleted and needs recreation
--   - For data recovery/maintenance scenarios
-- Note: Not required for normal operation (trigger handles automatic creation)

CREATE OR REPLACE FUNCTION public.ensure_coordinator_group_chat(org_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_conversation_id UUID;
  new_conversation_id UUID;
BEGIN
  -- Check if coordinator group chat already exists for this organization
  SELECT id INTO existing_conversation_id
  FROM public.conversations
  WHERE organization_id = org_id
    AND type = 'coordinator_group'
  LIMIT 1;
  
  -- If it exists, return the existing conversation ID
  IF existing_conversation_id IS NOT NULL THEN
    RETURN existing_conversation_id;
  END IF;
  
  -- If it doesn't exist, create it
  INSERT INTO public.conversations (organization_id, type, foster_profile_id)
  VALUES (org_id, 'coordinator_group', NULL)
  RETURNING id INTO new_conversation_id;
  
  RETURN new_conversation_id;
END;
$$;

