-- Fix: approve_foster_request / deny_foster_request can throw:
--   "record \"v_group\" is not assigned yet"
-- when building JSON payload if v_group / v_animal RECORDs were never assigned.
--
-- Root cause: In PL/pgSQL, a RECORD has indeterminate tuple structure until
-- it is assigned at least once. Referencing fields (v_group.id) before that
-- raises 55000.
--
-- Fix: initialize v_animal and v_group to NULL-typed records at the start of
-- each function so field access is always safe.

-- Approve foster request (assigns animal/group to foster)
CREATE OR REPLACE FUNCTION public.approve_foster_request(
	p_organization_id UUID,
	p_request_id UUID,
	p_coordinator_id UUID,
	p_message TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_user_id UUID;
	v_profile RECORD;
	v_request public.foster_requests;
	v_animal RECORD;
	v_group RECORD;
	v_foster RECORD;
	v_auto_denied_ids UUID[];
	v_result JSON;
BEGIN
	-- Ensure RECORD tuple structures are defined even if not assigned in a branch
	SELECT NULL::uuid AS id, NULL::text AS name, NULL::uuid AS group_id INTO v_animal;
	SELECT NULL::uuid AS id, NULL::text AS name, NULL::uuid[] AS animal_ids INTO v_group;

	v_user_id := auth.uid();
	IF v_user_id IS NULL THEN
		RAISE EXCEPTION 'Not authenticated';
	END IF;

	-- Ensure caller is a coordinator in the organization
	SELECT id, organization_id, role INTO v_profile
	FROM public.profiles
	WHERE id = v_user_id;

	IF v_profile.organization_id IS NULL OR v_profile.organization_id <> p_organization_id THEN
		RAISE EXCEPTION 'Invalid organization';
	END IF;

	IF v_profile.role <> 'coordinator' THEN
		RAISE EXCEPTION 'Only coordinators can approve requests';
	END IF;

	-- Verify p_coordinator_id matches caller
	IF p_coordinator_id <> v_user_id THEN
		RAISE EXCEPTION 'Coordinator ID mismatch';
	END IF;

	-- Fetch and lock the request
	SELECT * INTO v_request
	FROM public.foster_requests
	WHERE id = p_request_id
	  AND organization_id = p_organization_id
	FOR UPDATE;

	IF v_request.id IS NULL THEN
		RAISE EXCEPTION 'Request not found';
	END IF;

	IF v_request.status <> 'pending' THEN
		RAISE EXCEPTION 'This request is no longer pending';
	END IF;

	-- Fetch foster info for message generation
	SELECT id, full_name, email INTO v_foster
	FROM public.profiles
	WHERE id = v_request.foster_profile_id
	  AND organization_id = p_organization_id;

	IF v_foster.id IS NULL THEN
		RAISE EXCEPTION 'Foster not found';
	END IF;

	-- Handle animal assignment
	IF v_request.animal_id IS NOT NULL THEN
		SELECT id, name, group_id INTO v_animal
		FROM public.animals
		WHERE id = v_request.animal_id
		  AND organization_id = p_organization_id;

		IF v_animal.id IS NULL THEN
			RAISE EXCEPTION 'Animal not found';
		END IF;

		-- Block if animal is in a group (should not happen - request creation handles this)
		IF v_animal.group_id IS NOT NULL THEN
			RAISE EXCEPTION 'This animal is in a group. Please approve the group request instead.';
		END IF;

		-- Assign animal to foster
		UPDATE public.animals
		SET current_foster_id = v_request.foster_profile_id,
			status = 'in_foster',
			foster_visibility = 'not_visible',
			updated_at = NOW()
		WHERE id = v_request.animal_id
		  AND organization_id = p_organization_id;

		-- Auto-deny other pending requests for this animal
		UPDATE public.foster_requests
		SET status = 'denied',
			resolved_at = NOW(),
			resolved_by = p_coordinator_id,
			updated_at = NOW()
		WHERE organization_id = p_organization_id
		  AND animal_id = v_request.animal_id
		  AND status = 'pending'
		  AND id <> p_request_id
		RETURNING id INTO v_auto_denied_ids;

	-- Handle group assignment
	ELSIF v_request.group_id IS NOT NULL THEN
		SELECT id, name, animal_ids INTO v_group
		FROM public.animal_groups
		WHERE id = v_request.group_id
		  AND organization_id = p_organization_id;

		IF v_group.id IS NULL THEN
			RAISE EXCEPTION 'Group not found';
		END IF;

		-- Assign group to foster
		UPDATE public.animal_groups
		SET current_foster_id = v_request.foster_profile_id,
			updated_at = NOW()
		WHERE id = v_request.group_id
		  AND organization_id = p_organization_id;

		-- Assign all animals in group to foster
		IF v_group.animal_ids IS NOT NULL AND array_length(v_group.animal_ids, 1) IS NOT NULL THEN
			UPDATE public.animals
			SET current_foster_id = v_request.foster_profile_id,
				status = 'in_foster',
				foster_visibility = 'not_visible',
				updated_at = NOW()
			WHERE organization_id = p_organization_id
			  AND id = ANY(v_group.animal_ids);
		END IF;

		-- Auto-deny other pending requests for this group
		UPDATE public.foster_requests
		SET status = 'denied',
			resolved_at = NOW(),
			resolved_by = p_coordinator_id,
			updated_at = NOW()
		WHERE organization_id = p_organization_id
		  AND group_id = v_request.group_id
		  AND status = 'pending'
		  AND id <> p_request_id
		RETURNING id INTO v_auto_denied_ids;
	END IF;

	-- Update the approved request
	UPDATE public.foster_requests
	SET status = 'approved',
		resolved_at = NOW(),
		resolved_by = p_coordinator_id,
		coordinator_message = NULLIF(BTRIM(COALESCE(p_message, '')), ''),
		updated_at = NOW()
	WHERE id = p_request_id
	  AND organization_id = p_organization_id
	RETURNING * INTO v_request;

	-- Build result JSON with all info needed for frontend message sending
	v_result := json_build_object(
		'request', row_to_json(v_request),
		'foster', json_build_object(
			'id', v_foster.id,
			'name', COALESCE(v_foster.full_name, v_foster.email, 'Foster')
		),
		'animal', CASE WHEN v_animal.id IS NOT NULL THEN json_build_object(
			'id', v_animal.id,
			'name', COALESCE(v_animal.name, 'Unnamed Animal')
		) ELSE NULL END,
		'group', CASE WHEN v_group.id IS NOT NULL THEN json_build_object(
			'id', v_group.id,
			'name', COALESCE(v_group.name, 'Unnamed Group'),
			'animal_count', COALESCE(array_length(v_group.animal_ids, 1), 0)
		) ELSE NULL END,
		'auto_denied_request_ids', COALESCE(v_auto_denied_ids, ARRAY[]::UUID[])
	);

	RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_foster_request(UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_foster_request(UUID, UUID, UUID, TEXT) TO authenticated;


-- Deny foster request (reverts visibility and updates request status)
CREATE OR REPLACE FUNCTION public.deny_foster_request(
	p_organization_id UUID,
	p_request_id UUID,
	p_coordinator_id UUID,
	p_message TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_user_id UUID;
	v_profile RECORD;
	v_request public.foster_requests;
	v_animal RECORD;
	v_group RECORD;
	v_foster RECORD;
	v_result JSON;
BEGIN
	-- Ensure RECORD tuple structures are defined even if not assigned in a branch
	SELECT NULL::uuid AS id, NULL::text AS name INTO v_animal;
	SELECT NULL::uuid AS id, NULL::text AS name, NULL::uuid[] AS animal_ids INTO v_group;

	v_user_id := auth.uid();
	IF v_user_id IS NULL THEN
		RAISE EXCEPTION 'Not authenticated';
	END IF;

	-- Ensure caller is a coordinator in the organization
	SELECT id, organization_id, role INTO v_profile
	FROM public.profiles
	WHERE id = v_user_id;

	IF v_profile.organization_id IS NULL OR v_profile.organization_id <> p_organization_id THEN
		RAISE EXCEPTION 'Invalid organization';
	END IF;

	IF v_profile.role <> 'coordinator' THEN
		RAISE EXCEPTION 'Only coordinators can deny requests';
	END IF;

	-- Verify p_coordinator_id matches caller
	IF p_coordinator_id <> v_user_id THEN
		RAISE EXCEPTION 'Coordinator ID mismatch';
	END IF;

	-- Fetch and lock the request
	SELECT * INTO v_request
	FROM public.foster_requests
	WHERE id = p_request_id
	  AND organization_id = p_organization_id
	FOR UPDATE;

	IF v_request.id IS NULL THEN
		RAISE EXCEPTION 'Request not found';
	END IF;

	IF v_request.status <> 'pending' THEN
		RAISE EXCEPTION 'This request is no longer pending';
	END IF;

	-- Fetch foster info for message generation
	SELECT id, full_name, email INTO v_foster
	FROM public.profiles
	WHERE id = v_request.foster_profile_id
	  AND organization_id = p_organization_id;

	IF v_foster.id IS NULL THEN
		RAISE EXCEPTION 'Foster not found';
	END IF;

	-- Revert visibility for animal or group
	IF v_request.animal_id IS NOT NULL THEN
		SELECT id, name INTO v_animal
		FROM public.animals
		WHERE id = v_request.animal_id
		  AND organization_id = p_organization_id;

		IF v_animal.id IS NOT NULL THEN
			UPDATE public.animals
			SET foster_visibility = v_request.previous_foster_visibility,
				updated_at = NOW()
			WHERE id = v_request.animal_id
			  AND organization_id = p_organization_id;
		END IF;

	ELSIF v_request.group_id IS NOT NULL THEN
		SELECT id, name, animal_ids INTO v_group
		FROM public.animal_groups
		WHERE id = v_request.group_id
		  AND organization_id = p_organization_id;

		IF v_group.id IS NOT NULL AND v_group.animal_ids IS NOT NULL AND array_length(v_group.animal_ids, 1) IS NOT NULL THEN
			UPDATE public.animals
			SET foster_visibility = v_request.previous_foster_visibility,
				updated_at = NOW()
			WHERE organization_id = p_organization_id
			  AND id = ANY(v_group.animal_ids);
		END IF;
	END IF;

	-- Update the denied request
	UPDATE public.foster_requests
	SET status = 'denied',
		resolved_at = NOW(),
		resolved_by = p_coordinator_id,
		coordinator_message = NULLIF(BTRIM(COALESCE(p_message, '')), ''),
		updated_at = NOW()
	WHERE id = p_request_id
	  AND organization_id = p_organization_id
	RETURNING * INTO v_request;

	-- Build result JSON with all info needed for frontend message sending
	v_result := json_build_object(
		'request', row_to_json(v_request),
		'foster', json_build_object(
			'id', v_foster.id,
			'name', COALESCE(v_foster.full_name, v_foster.email, 'Foster')
		),
		'animal', CASE WHEN v_animal.id IS NOT NULL THEN json_build_object(
			'id', v_animal.id,
			'name', COALESCE(v_animal.name, 'Unnamed Animal')
		) ELSE NULL END,
		'group', CASE WHEN v_group.id IS NOT NULL THEN json_build_object(
			'id', v_group.id,
			'name', COALESCE(v_group.name, 'Unnamed Group')
		) ELSE NULL END
	);

	RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.deny_foster_request(UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deny_foster_request(UUID, UUID, UUID, TEXT) TO authenticated;


