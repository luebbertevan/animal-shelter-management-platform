-- Recreate coordinator group chat for default organization
-- Uses the ensure_coordinator_group_chat function to safely recreate if missing

DO $$
DECLARE
  default_org_id UUID := '2c20afd1-43b6-4e67-8790-fac084a71fa2';
  conversation_id UUID;
BEGIN
  -- Use the existing function to ensure coordinator group chat exists
  -- This will create it if missing, or return existing ID if it already exists
  SELECT public.ensure_coordinator_group_chat(default_org_id) INTO conversation_id;
  
  -- Log the result (optional, for debugging)
  RAISE NOTICE 'Coordinator group chat ID: %', conversation_id;
END;
$$;

