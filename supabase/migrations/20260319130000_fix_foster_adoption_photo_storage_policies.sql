-- Fix foster adoption editor photo uploads/deletes failing (storage 500s)
-- Root cause: the storage policies for foster uploads/deletes query `public.animals`
-- directly, and those queries are subject to RLS SELECT restrictions on `public.animals`.
-- The adoption RPC (`update_animal_adoption_materials`) is SECURITY DEFINER and bypasses
-- that RLS, so bio updates can succeed while storage uploads fail.
--
-- This migration introduces SECURITY DEFINER helper functions and updates the
-- storage INSERT/DELETE policies to call them instead of querying `public.animals`
-- directly inside the policy.

-- ============================================================
-- Helper: can the current user upload to an animal folder?
-- ============================================================
CREATE OR REPLACE FUNCTION public.foster_can_upload_animal_adoption_photos(
	p_animal_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_user_id uuid := auth.uid();
	v_org_id uuid := public.get_user_organization_id();
	v_animal_id uuid;
BEGIN
	-- Extract animal id; if it's not a UUID, fail closed.
	BEGIN
		v_animal_id := p_animal_id::uuid;
	EXCEPTION
		WHEN others THEN
			RETURN false;
	END;

	-- Coordinators can upload for any animal in their org.
	IF public.is_coordinator() THEN
		RETURN EXISTS (
			SELECT 1
			FROM public.animals a
			WHERE a.id = v_animal_id
				AND a.organization_id = v_org_id
		);
	END IF;

	-- Fosters can upload only for the animal assigned to them.
	RETURN EXISTS (
		SELECT 1
		FROM public.animals a
		WHERE a.id = v_animal_id
			AND a.organization_id = v_org_id
			AND a.current_foster_id = v_user_id
	);
END;
$$;

-- ============================================================
-- Helper: can the current user delete a specific animal photo?
-- p_storage_name must be the storage object's `name`
-- (e.g. {org}/animals/{animal_id}/{filename})
-- ============================================================
CREATE OR REPLACE FUNCTION public.foster_can_delete_animal_photo(
	p_storage_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_user_id uuid := auth.uid();
	v_org_id uuid := public.get_user_organization_id();
	v_animal_id uuid;
BEGIN
	-- If not in the expected structure, fail closed.
	IF split_part(p_storage_name, '/', 2) <> 'animals' THEN
		RETURN false;
	END IF;

	IF split_part(p_storage_name, '/', 1) <> v_org_id::text THEN
		RETURN false;
	END IF;

	-- Extract animal id; if it's not a UUID, fail closed.
	BEGIN
		v_animal_id := split_part(p_storage_name, '/', 3)::uuid;
	EXCEPTION
		WHEN others THEN
			RETURN false;
	END;

	-- Coordinators can delete any animal photos in the org.
	IF public.is_coordinator() THEN
		RETURN true;
	END IF;

	-- Fosters can delete only photos they uploaded for the currently assigned animal.
	RETURN EXISTS (
		SELECT 1
		FROM public.animals a
		WHERE a.id = v_animal_id
			AND a.organization_id = v_org_id
			AND a.current_foster_id = v_user_id
			AND EXISTS (
				SELECT 1
				FROM jsonb_array_elements(COALESCE(a.photos, '[]'::jsonb)) photo
				WHERE COALESCE(photo->>'uploaded_by', '') = v_user_id::text
					AND split_part(photo->>'url', '/photos/', 2) = p_storage_name
			)
	);
END;
$$;

-- ============================================================
-- Update storage policies to use helpers (instead of direct table queries in policy)
-- ============================================================

-- DROP + recreate foster upload policy
DROP POLICY IF EXISTS "Users can upload photos to their organization (foster-restricted animals)" ON storage.objects;

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
			-- Animal uploads: coordinator unrestricted; foster restricted via helper
			split_part(name, '/', 2) = 'animals' AND
			public.foster_can_upload_animal_adoption_photos(split_part(name, '/', 3))
		)
	)
);

-- DROP + recreate foster delete policy
DROP POLICY IF EXISTS "Users can delete photos (foster-owned animal photos only)" ON storage.objects;

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
			-- Animal deletions: enforced by helper
			split_part(name, '/', 2) = 'animals' AND
			public.foster_can_delete_animal_photo(name)
		)
	)
);

