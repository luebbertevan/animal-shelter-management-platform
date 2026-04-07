-- Prevent Storage bucket enumeration via SELECT/listing
--
-- Supabase warns when a SELECT policy exists on storage.objects for a public bucket,
-- because it can allow clients to list all files. This app does not rely on listing
-- the `photos` bucket from the client; photo paths are referenced from DB rows.
--
-- Keeping the bucket public maintains the current UX (direct <img src> URLs), while
-- removing the SELECT policy prevents file enumeration.

DROP POLICY IF EXISTS "Users can view photos from accessible conversations" ON storage.objects;

