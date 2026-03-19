-- Foster Editing: Adoption Photos & Bio (backend enforcement)
-- - Fosters can upload/delete adoption photos only for animals assigned to them
-- - Fosters can delete only photos they uploaded (uploaded_by matches auth.uid())
-- - Legacy photos without uploaded_by are treated as non-owned => non-removable
-- - A dedicated RPC updates animals.bio + animals.photos with ownership validation

-- ============================================================
-- Storage policies (photos bucket)
-- ============================================================

-- Upload:
-- - Coordinators: keep org-wide ability for animals uploads
-- - Fosters: can upload only to {org}/animals/{animal_id}/... where
--   animals.current_foster_id = auth.uid()
DROP POLICY IF EXISTS "Users can upload photos to their organization" ON storage.objects;
CREATE POLICY "Users can upload photos to their organization (foster-restricted animals)"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
	bucket_id = 'photos' AND
	split_part(name, '/', 1) = public.get_user_organization_id()::text AND
	(
		-- Message/group uploads remain organization-based
		split_part(name, '/', 2) IN ('messages', 'groups')
		OR
		(
			-- Animal uploads: coordinators are unrestricted; fosters are assignment-restricted
			split_part(name, '/', 2) = 'animals' AND
			(
				public.is_coordinator()
				OR EXISTS (
					SELECT 1
					FROM public.animals a
					WHERE a.organization_id = public.get_user_organization_id()
						AND a.id = split_part(name, '/', 3)::uuid
						AND a.current_foster_id = auth.uid()
				)
			)
		)
	)
);

-- Delete:
-- - Coordinators: keep org-wide ability for deletions
-- - Fosters: animal photo deletions are constrained by:
--   1) animal.current_foster_id = auth.uid()
--   2) a.photos contains an element whose uploaded_by = auth.uid()
--   3) that element's url maps back to the storage object's name
-- - Legacy photos without uploaded_by => photo->>'uploaded_by' IS NULL => non-removable
DROP POLICY IF EXISTS "Users can delete photos from their organization" ON storage.objects;
CREATE POLICY "Users can delete photos (foster-owned animal photos only)"
ON storage.objects
FOR DELETE
TO authenticated
USING (
	bucket_id = 'photos' AND
	split_part(name, '/', 1) = public.get_user_organization_id()::text AND
	(
		-- Message/group deletions remain org-wide
		split_part(name, '/', 2) IN ('messages', 'groups')
		OR
		(
			-- Animal deletions: enforce assignment + per-photo ownership
			split_part(name, '/', 2) = 'animals' AND
			(
				public.is_coordinator()
				OR EXISTS (
					SELECT 1
					FROM public.animals a
					WHERE a.organization_id = public.get_user_organization_id()
						AND a.id = split_part(name, '/', 3)::uuid
						AND a.current_foster_id = auth.uid()
						AND EXISTS (
							SELECT 1
							FROM jsonb_array_elements(COALESCE(a.photos, '[]'::jsonb)) photo
							WHERE COALESCE(photo->>'uploaded_by', '') = auth.uid()::text
								AND split_part(photo->>'url', '/photos/', 2) = name
						)
				)
			)
		)
	)
);

-- ============================================================
-- RPC: update_animal_adoption_materials
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_animal_adoption_materials(
	p_animal_id uuid,
	p_bio text,
	p_photos jsonb
)
RETURNS public.animals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_user_id uuid := auth.uid();
	v_org_id uuid := public.get_user_organization_id();
	v_old_photos jsonb;
	v_result public.animals;
BEGIN
	-- Must be a foster in the current org
	IF NOT EXISTS (
		SELECT 1
		FROM public.profiles p
		WHERE p.id = v_user_id
			AND p.organization_id = v_org_id
			AND p.role = 'foster'
	) THEN
		RAISE EXCEPTION 'Not authorized to update adoption materials.';
	END IF;

	-- Must be currently assigned to this animal
	IF NOT EXISTS (
		SELECT 1
		FROM public.animals a
		WHERE a.id = p_animal_id
			AND a.organization_id = v_org_id
			AND a.current_foster_id = v_user_id
	) THEN
		RAISE EXCEPTION 'Animal is not assigned to the current foster.';
	END IF;

	p_photos := COALESCE(p_photos, '[]'::jsonb);

	SELECT COALESCE(a.photos, '[]'::jsonb)
	INTO v_old_photos
	FROM public.animals a
	WHERE a.id = p_animal_id
		AND a.organization_id = v_org_id;

	-- 1) Old non-owned photos (uploaded_by NULL or != foster) cannot be removed,
	--    and cannot have their uploaded_by changed.
	IF EXISTS (
		SELECT 1
		FROM jsonb_array_elements(v_old_photos) old_photo
		WHERE (old_photo->>'uploaded_by' IS NULL OR old_photo->>'uploaded_by' <> v_user_id::text)
			AND NOT EXISTS (
				SELECT 1
				FROM jsonb_array_elements(p_photos) new_photo
				WHERE new_photo->>'url' = old_photo->>'url'
					AND COALESCE(new_photo->>'uploaded_by', '') = COALESCE(old_photo->>'uploaded_by', '')
			)
	) THEN
		RAISE EXCEPTION 'You cannot remove or re-own photos that you do not own.';
	END IF;

	-- 2) New non-owned photos must already exist in old photos (same url + same uploaded_by).
	IF EXISTS (
		SELECT 1
		FROM jsonb_array_elements(p_photos) new_photo
		WHERE (new_photo->>'uploaded_by' IS NULL OR new_photo->>'uploaded_by' <> v_user_id::text)
			AND NOT EXISTS (
				SELECT 1
				FROM jsonb_array_elements(v_old_photos) old_photo
				WHERE old_photo->>'url' = new_photo->>'url'
					AND COALESCE(old_photo->>'uploaded_by', '') = COALESCE(new_photo->>'uploaded_by', '')
			)
	) THEN
		RAISE EXCEPTION 'You cannot add photos that you do not own.';
	END IF;

	-- 3) Any newly added photo must be owned by the current foster.
	IF EXISTS (
		SELECT 1
		FROM jsonb_array_elements(p_photos) new_photo
		WHERE NOT EXISTS (
			SELECT 1
			FROM jsonb_array_elements(v_old_photos) old_photo
			WHERE old_photo->>'url' = new_photo->>'url'
		)
		AND COALESCE(new_photo->>'uploaded_by', '') <> v_user_id::text
	) THEN
		RAISE EXCEPTION 'New photos must be marked as uploaded_by the current foster.';
	END IF;

	-- 4) All photos must belong to this animal's storage folder.
	IF EXISTS (
		SELECT 1
		FROM jsonb_array_elements(p_photos) photo
		WHERE photo->>'url' IS NULL
			OR split_part(photo->>'url', '/photos/', 2) NOT LIKE (v_org_id::text || '/animals/' || p_animal_id::text || '/%')
	) THEN
		RAISE EXCEPTION 'One or more provided photos do not belong to this animal.';
	END IF;

	-- Apply update (only bio + photos are changed by this function)
	UPDATE public.animals
	SET
		bio = CASE
			WHEN p_bio IS NULL OR btrim(p_bio) = '' THEN NULL
			ELSE btrim(p_bio)
		END,
		photos = p_photos
	WHERE id = p_animal_id
		AND organization_id = v_org_id
	RETURNING * INTO v_result;

	RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.update_animal_adoption_materials(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_animal_adoption_materials(uuid, text, jsonb) TO authenticated;

