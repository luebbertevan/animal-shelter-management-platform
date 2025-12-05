
-- Add full_name support to profiles
-- Updates handle_new_user() to extract and save full_name from user_metadata

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_org_id UUID := '2c20afd1-43b6-4e67-8790-fac084a71fa2';
  created_profile_id UUID;
  created_role TEXT;
  user_full_name TEXT;
BEGIN
  -- Extract full_name from user_metadata if provided
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NULL
  );
  
  -- Create profile with full_name if available
  INSERT INTO public.profiles (id, email, role, organization_id, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    'foster', -- Default role is 'foster' (will be set by confirmation codes in Phase 8)
    default_org_id, -- Default organization
    user_full_name -- Will be NULL if not provided
  )
  RETURNING id, role INTO created_profile_id, created_role;
  
  -- Create foster chat if user is a foster
  -- This works now (everyone defaults to foster) and in Phase 8 (only fosters get conversations)
  IF created_role = 'foster' THEN
    INSERT INTO public.conversations (organization_id, type, foster_profile_id)
    VALUES (
      default_org_id,
      'foster_chat',
      created_profile_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

