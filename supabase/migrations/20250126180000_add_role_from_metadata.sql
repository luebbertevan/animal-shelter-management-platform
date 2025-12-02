-- Add role selection support from user_metadata
-- Updates handle_new_user() to extract role from user_metadata (defaults to 'foster' if not provided)

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
  user_role TEXT;
BEGIN
  -- Extract full_name from user_metadata if provided
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NULL
  );
  
  -- Extract role from user_metadata, default to 'foster' if not provided
  user_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'foster'
  );
  
  -- Validate role (must be 'coordinator' or 'foster')
  IF user_role NOT IN ('coordinator', 'foster') THEN
    user_role := 'foster';
  END IF;
  
  -- Create profile with full_name and role
  INSERT INTO public.profiles (id, email, role, organization_id, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    user_role,
    default_org_id, -- Default organization
    user_full_name -- Will be NULL if not provided
  )
  RETURNING id, role INTO created_profile_id, created_role;
  
  -- Create foster chat if user is a foster
  -- Coordinators don't get individual foster chats, they use the coordinator group chat
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

