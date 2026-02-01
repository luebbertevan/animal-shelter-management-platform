-- Foster request RPCs
-- These functions run as SECURITY DEFINER to safely perform multi-table updates
-- (insert foster_requests + update animals.foster_visibility) while still enforcing
-- that the caller is the foster and belongs to the organization.

-- Create foster request (animal or group)
CREATE OR REPLACE FUNCTION public.create_foster_request(
	p_organization_id UUID,
	p_animal_id UUID DEFAULT NULL,
	p_group_id UUID DEFAULT NULL,
	p_message TEXT DEFAULT NULL
)
RETURNS public.foster_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_user_id UUID;
	v_profile_org UUID;
	v_animal RECORD;
	v_group RECORD;
	v_previous_visibility TEXT;
	v_request public.foster_requests;
BEGIN
	v_user_id := auth.uid();
	IF v_user_id IS NULL THEN
		RAISE EXCEPTION 'Not authenticated';
	END IF;

	-- Ensure caller belongs to organization
	SELECT organization_id INTO v_profile_org
	FROM public.profiles
	WHERE id = v_user_id;

	IF v_profile_org IS NULL OR v_profile_org <> p_organization_id THEN
		RAISE EXCEPTION 'Invalid organization';
	END IF;

	-- Validate inputs: exactly one of animal_id / group_id
	IF (p_animal_id IS NULL AND p_group_id IS NULL) OR (p_animal_id IS NOT NULL AND p_group_id IS NOT NULL) THEN
		RAISE EXCEPTION 'Must provide exactly one of animal_id or group_id';
	END IF;

	-- If animal is provided, load it (and auto-upgrade to group request if needed)
	IF p_animal_id IS NOT NULL THEN
		SELECT id, name, foster_visibility, group_id, current_foster_id
		INTO v_animal
		FROM public.animals
		WHERE id = p_animal_id
		  AND organization_id = p_organization_id;

		IF v_animal.id IS NULL THEN
			RAISE EXCEPTION 'Animal not found';
		END IF;

		IF v_animal.current_foster_id = v_user_id THEN
			RAISE EXCEPTION 'Animal is already assigned to you';
		END IF;

		-- Enforce group rule: requests must be for the whole group
		IF v_animal.group_id IS NOT NULL THEN
			p_group_id := v_animal.group_id;
			p_animal_id := NULL;
		ELSE
			v_previous_visibility := v_animal.foster_visibility;
		END IF;
	END IF;

	-- Group request path (either directly requested or upgraded from animal-in-group)
	IF p_group_id IS NOT NULL THEN
		SELECT id, name, animal_ids, current_foster_id
		INTO v_group
		FROM public.animal_groups
		WHERE id = p_group_id
		  AND organization_id = p_organization_id;

		IF v_group.id IS NULL THEN
			RAISE EXCEPTION 'Group not found';
		END IF;

		IF v_group.current_foster_id = v_user_id THEN
			RAISE EXCEPTION 'Group is already assigned to you';
		END IF;

		-- Determine previous visibility from the first animal in the group (plan assumes group visibility consistency)
		IF v_group.animal_ids IS NULL OR array_length(v_group.animal_ids, 1) IS NULL THEN
			-- Empty group fallback: default to available_now
			v_previous_visibility := 'available_now';
		ELSE
			SELECT foster_visibility
			INTO v_previous_visibility
			FROM public.animals
			WHERE id = v_group.animal_ids[1]
			  AND organization_id = p_organization_id;

			IF v_previous_visibility IS NULL THEN
				v_previous_visibility := 'available_now';
			END IF;
		END IF;
	END IF;

	-- Insert request
	INSERT INTO public.foster_requests (
		organization_id,
		foster_profile_id,
		animal_id,
		group_id,
		status,
		previous_foster_visibility,
		message
	)
	VALUES (
		p_organization_id,
		v_user_id,
		p_animal_id,
		p_group_id,
		'pending',
		v_previous_visibility,
		NULLIF(BTRIM(COALESCE(p_message, '')), '')
	)
	RETURNING * INTO v_request;

	-- Update visibility to foster_pending
	IF v_request.animal_id IS NOT NULL THEN
		UPDATE public.animals
		SET foster_visibility = 'foster_pending'
		WHERE id = v_request.animal_id
		  AND organization_id = p_organization_id;
	ELSIF v_request.group_id IS NOT NULL THEN
		-- Update all animals in group to foster_pending
		IF v_group.id IS NULL THEN
			-- group record not loaded yet (shouldn't happen), load minimal for safety
			SELECT id, animal_ids INTO v_group
			FROM public.animal_groups
			WHERE id = v_request.group_id
			  AND organization_id = p_organization_id;
		END IF;

		IF v_group.animal_ids IS NOT NULL AND array_length(v_group.animal_ids, 1) IS NOT NULL THEN
			UPDATE public.animals
			SET foster_visibility = 'foster_pending'
			WHERE organization_id = p_organization_id
			  AND id = ANY(v_group.animal_ids);
		END IF;
	END IF;

	RETURN v_request;
END;
$$;

REVOKE ALL ON FUNCTION public.create_foster_request(UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_foster_request(UUID, UUID, UUID, TEXT) TO authenticated;

-- Cancel foster request (revert visibility to previous_foster_visibility)
CREATE OR REPLACE FUNCTION public.cancel_foster_request(
	p_organization_id UUID,
	p_request_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_user_id UUID;
	v_profile_org UUID;
	v_request public.foster_requests;
	v_group RECORD;
BEGIN
	v_user_id := auth.uid();
	IF v_user_id IS NULL THEN
		RAISE EXCEPTION 'Not authenticated';
	END IF;

	-- Ensure caller belongs to organization
	SELECT organization_id INTO v_profile_org
	FROM public.profiles
	WHERE id = v_user_id;

	IF v_profile_org IS NULL OR v_profile_org <> p_organization_id THEN
		RAISE EXCEPTION 'Invalid organization';
	END IF;

	-- Fetch request and verify ownership + status
	SELECT * INTO v_request
	FROM public.foster_requests
	WHERE id = p_request_id
	  AND organization_id = p_organization_id;

	IF v_request.id IS NULL THEN
		RAISE EXCEPTION 'Request not found';
	END IF;

	IF v_request.foster_profile_id <> v_user_id THEN
		RAISE EXCEPTION 'Not authorized';
	END IF;

	IF v_request.status <> 'pending' THEN
		RAISE EXCEPTION 'Only pending requests can be cancelled';
	END IF;

	-- Update request
	UPDATE public.foster_requests
	SET status = 'cancelled',
		resolved_at = NOW(),
		updated_at = NOW()
	WHERE id = p_request_id
	  AND organization_id = p_organization_id;

	-- Revert visibility
	IF v_request.animal_id IS NOT NULL THEN
		UPDATE public.animals
		SET foster_visibility = v_request.previous_foster_visibility
		WHERE id = v_request.animal_id
		  AND organization_id = p_organization_id;
	ELSIF v_request.group_id IS NOT NULL THEN
		SELECT id, animal_ids INTO v_group
		FROM public.animal_groups
		WHERE id = v_request.group_id
		  AND organization_id = p_organization_id;

		IF v_group.animal_ids IS NOT NULL AND array_length(v_group.animal_ids, 1) IS NOT NULL THEN
			UPDATE public.animals
			SET foster_visibility = v_request.previous_foster_visibility
			WHERE organization_id = p_organization_id
			  AND id = ANY(v_group.animal_ids);
		END IF;
	END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_foster_request(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_foster_request(UUID, UUID) TO authenticated;


