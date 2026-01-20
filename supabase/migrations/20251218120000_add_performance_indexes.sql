-- Performance indexes for animals, groups, and profiles tables
-- These indexes optimize filtering, searching, and sorting operations

-- Enable pg_trgm extension for trigram-based text search (for ILIKE performance)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- ANIMALS TABLE INDEXES
-- ============================================

-- Primary filter: organization_id (should already exist, but ensure it does)
CREATE INDEX IF NOT EXISTS idx_animals_organization_id ON animals(organization_id);

-- Name search index using trigram (for ILIKE queries)
CREATE INDEX IF NOT EXISTS idx_animals_name_trgm ON animals USING gin(name gin_trgm_ops);

-- Common filter combinations
CREATE INDEX IF NOT EXISTS idx_animals_org_status ON animals(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_animals_org_foster_visibility ON animals(organization_id, foster_visibility);
CREATE INDEX IF NOT EXISTS idx_animals_org_priority ON animals(organization_id, priority);
CREATE INDEX IF NOT EXISTS idx_animals_org_created_at ON animals(organization_id, created_at DESC);

-- Composite index for common filter combinations (status + visibility)
CREATE INDEX IF NOT EXISTS idx_animals_org_status_visibility ON animals(organization_id, status, foster_visibility);

-- Filter for "in group" queries
CREATE INDEX IF NOT EXISTS idx_animals_org_group_id ON animals(organization_id, group_id) WHERE group_id IS NOT NULL;

-- Filter for sex/life_stage
CREATE INDEX IF NOT EXISTS idx_animals_org_sex ON animals(organization_id, sex_spay_neuter_status);
CREATE INDEX IF NOT EXISTS idx_animals_org_life_stage ON animals(organization_id, life_stage);

-- ============================================
-- ANIMAL_GROUPS TABLE INDEXES
-- ============================================

-- Primary filter: organization_id
CREATE INDEX IF NOT EXISTS idx_animal_groups_organization_id ON animal_groups(organization_id);

-- Priority filter
CREATE INDEX IF NOT EXISTS idx_animal_groups_org_priority ON animal_groups(organization_id, priority);

-- Created_at for sorting
CREATE INDEX IF NOT EXISTS idx_animal_groups_org_created_at ON animal_groups(organization_id, created_at DESC);

-- Name search index using trigram (for ILIKE queries)
CREATE INDEX IF NOT EXISTS idx_animal_groups_name_trgm ON animal_groups USING gin(name gin_trgm_ops);

-- ============================================
-- PROFILES TABLE INDEXES (for fosters)
-- ============================================

-- Primary filter: organization_id
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);

-- Role filter (for foster queries)
CREATE INDEX IF NOT EXISTS idx_profiles_org_role ON profiles(organization_id, role);

-- Full name search index using trigram (for ILIKE queries)
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm ON profiles USING gin(full_name gin_trgm_ops);

-- ============================================
-- COMMENTS
-- ============================================
-- These indexes will significantly improve query performance for:
-- 1. Filtering by organization (always the first filter)
-- 2. Name searches using ILIKE (trigram indexes)
-- 3. Common filter combinations (status, visibility, priority)
-- 4. Sorting by created_at
-- 
-- The trigram indexes (pg_trgm) enable fast partial text matching
-- even with leading wildcards in ILIKE queries like '%search%'
