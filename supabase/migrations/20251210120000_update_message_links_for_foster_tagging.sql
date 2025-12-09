-- Update message_animal_links to message_links and add foster tagging support
-- Milestone 5.10a: Update Database Schema for Foster Tagging

-- ============================================
-- STEP 1: Rename table
-- ============================================

ALTER TABLE public.message_animal_links RENAME TO message_links;

-- ============================================
-- STEP 2: Add foster_profile_id column
-- ============================================

ALTER TABLE public.message_links
  ADD COLUMN foster_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ============================================
-- STEP 3: Drop old constraint and create new one
-- ============================================

ALTER TABLE public.message_links
  DROP CONSTRAINT exactly_one_link;

ALTER TABLE public.message_links
  ADD CONSTRAINT exactly_one_link CHECK (
    (animal_id IS NOT NULL AND group_id IS NULL AND foster_profile_id IS NULL) OR
    (animal_id IS NULL AND group_id IS NOT NULL AND foster_profile_id IS NULL) OR
    (animal_id IS NULL AND group_id IS NULL AND foster_profile_id IS NOT NULL)
  );

-- ============================================
-- STEP 4: Rename existing indexes
-- ============================================

ALTER INDEX idx_message_animal_links_message_id RENAME TO idx_message_links_message_id;
ALTER INDEX idx_message_animal_links_animal_id RENAME TO idx_message_links_animal_id;
ALTER INDEX idx_message_animal_links_group_id RENAME TO idx_message_links_group_id;

-- ============================================
-- STEP 5: Add new index for foster_profile_id
-- ============================================

CREATE INDEX idx_message_links_foster_profile_id ON public.message_links(foster_profile_id);

-- ============================================
-- STEP 6: Drop old RLS policies (they reference old table name)
-- ============================================

DROP POLICY IF EXISTS "Users can view message animal links" ON public.message_links;
DROP POLICY IF EXISTS "Users can create message animal links" ON public.message_links;

-- ============================================
-- STEP 7: Create new RLS policies
-- ============================================

-- Users can view links for messages they can access
CREATE POLICY "Users can view message links"
  ON public.message_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_links.message_id
    )
  );

-- Users can create links for messages they sent
-- For foster links, ensure the foster is in the user's organization AND user is a coordinator
CREATE POLICY "Users can create message links"
  ON public.message_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_links.message_id
      AND m.sender_id = auth.uid()
    )
    AND (
      -- If linking to a foster, ensure user is coordinator AND foster is in user's organization
      message_links.foster_profile_id IS NULL OR
      (
        public.is_coordinator() AND
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = message_links.foster_profile_id
          AND p.organization_id = public.get_user_organization_id()
        )
      )
    )
  );

