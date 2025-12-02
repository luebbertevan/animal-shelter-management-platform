-- Create Conversation on User Signup (Milestone 5.2)
-- Updates handle_new_user() trigger to automatically create foster chat when foster signs up

-- Update profile creation trigger function to also create foster chat
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_org_id UUID := '2c20afd1-43b6-4e67-8790-fac084a71fa2';
  created_profile_id UUID;
  created_role TEXT;
BEGIN
  -- Create profile (existing logic)
  INSERT INTO public.profiles (id, email, role, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    'foster', -- Default role is 'foster' (will be set by confirmation codes in Phase 8)
    default_org_id -- Default organization
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger on_auth_user_created already exists and will use this updated function
-- No need to recreate the trigger

