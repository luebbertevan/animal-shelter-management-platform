-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
-- Stores both Foster and Coordinator profiles (role determines which fields are used)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('coordinator', 'foster')),
  full_name TEXT,
  
  -- Foster-specific fields (nullable, only populated for fosters)
  experience_level TEXT, -- e.g., "experienced", "new", "bottle feeder"
  household_details TEXT, -- Other pets, kids, allergies, etc. (might become tags later)
  preferred_animal_profiles TEXT, -- What types of animals they prefer (might become tags later)
  availability BOOLEAN, -- Simple toggle: available or not (might become calendar with dates later)
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Animals table
-- Matches Animal interface from types/index.ts
CREATE TABLE public.animals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Basic Info (name is optional - can be unnamed)
  name TEXT, -- Optional - can be unnamed
  species TEXT NOT NULL, -- Usually "cat" but keeping flexible
  primary_breed TEXT, -- Dropdown with custom input (might become tags later)
  physical_characteristics TEXT,
  sex TEXT CHECK (sex IN ('male', 'female')),
  spay_neuter_status TEXT CHECK (spay_neuter_status IN ('fixed', 'not_fixed')),
  life_stage TEXT CHECK (life_stage IN ('kitten', 'adult', 'senior')),
  
  -- Dates & Age (all stored as TIMESTAMPTZ, can be null)
  intake_date TIMESTAMPTZ, -- When animal came in/coming in (combines incoming/intake)
  date_of_birth TIMESTAMPTZ, -- Rarely available
  age_estimate INTEGER, -- Estimated age when DOB unknown
  date_available_for_adoption TIMESTAMPTZ,
  
  -- Source & Placement
  source TEXT, -- Rescue name/source (renamed from 'from' - SQL reserved word)
  intake_type TEXT, -- Primarily "surrender" or "transfer", but allow custom
  status TEXT NOT NULL CHECK (status IN (
    'needs_foster',
    'in_foster',
    'adopted',
    'medical_hold',
    'in_shelter',
    'transferring'
  )),
  current_foster_id UUID REFERENCES public.profiles(id), -- ID of current foster
  
  -- Medical (structured as text for now, can be split later)
  medical_needs TEXT, -- Medical history, conditions, medications, special care
  vaccines TEXT, -- Could be array later, string for now
  felv_fiv_test TEXT CHECK (felv_fiv_test IN ('negative', 'positive', 'pending', 'not_tested')),
  felv_fiv_test_date TIMESTAMPTZ, -- When test was done or needed
  
  -- Behavioral (structured as text for now, can be split later)
  behavioral_needs TEXT, -- Behavioral notes, training needs, etc.
  socialization_level INTEGER CHECK (socialization_level IN (0, 1, 2, 3, 4, 5)), -- 0-5 scale, null if unknown
  
  -- Tags for filtering (stored as TEXT[] array for MVP, could migrate to junction table later)
  tags TEXT[], -- e.g., "fine_with_dogs", "bottle_fed", "kid_friendly"
  
  -- Relationships
  group_id UUID REFERENCES public.animal_groups(id), -- If part of a group
  parent_id UUID REFERENCES public.animals(id), -- If has a parent (mom)
  sibling_ids UUID[], -- Related animals (stored as array for MVP, could migrate to junction table later)
  -- Note: sibling_ids is a self-reference array - can't enforce referential integrity, but fine for MVP
  
  -- Petstablished Sync
  added_to_petstablished BOOLEAN DEFAULT FALSE,
  petstablished_sync_needed BOOLEAN DEFAULT FALSE, -- Info needs updating
  petstablished_last_synced TIMESTAMPTZ,
  
  -- Notes & Metadata
  additional_notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Animal Groups table
-- Matches AnimalGroup interface from types/index.ts
-- Note: group_photos field exists in TypeScript types but not in schema yet (intentional for MVP)
-- Will add group_photos JSONB column later when we implement photo uploads
CREATE TABLE public.animal_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT, -- e.g., "Litter of 4 kittens"
  description TEXT,
  animal_ids UUID[] NOT NULL, -- Animals in this group (stored as array for MVP, could migrate to junction table later)
  current_foster_id UUID REFERENCES public.profiles(id), -- ID of current foster (if entire group is with one foster)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photos stored as JSONB array in animals table (for MVP)
-- Structure: [{"url": "...", "uploaded_at": "...", "uploaded_by": "..."}, ...]
-- Note: We'll add photos column later when we implement photo uploads
-- For now, animals table is ready for it: we can ALTER TABLE later to add photos JSONB DEFAULT '[]'::jsonb

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animal_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies (basic - we'll refine in later milestones)

-- Profiles Policies
-- Anyone can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Coordinators can view all profiles
CREATE POLICY "Coordinators can view all profiles"
  ON public.profiles FOR SELECT
  USING ( -- This condition must be TRUE for the user to see any row in this table.
    EXISTS ( -- checks whether the inner query returns at least 1 row.
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'coordinator'
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Animals Policies
-- Everyone can view animals
CREATE POLICY "Anyone can view animals"
  ON public.animals FOR SELECT
  USING (true);

-- Coordinators can create animals
CREATE POLICY "Coordinators can create animals"
  ON public.animals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'coordinator'
    )
  );

-- Coordinators can update animals
CREATE POLICY "Coordinators can update animals"
  ON public.animals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'coordinator'
    )
  );

-- Note: Fosters cannot update animals for now. This will be changed later to allow updates
-- only for specific fields (e.g., weight, condition updates, photos) but not core animal data.

-- Animal Groups Policies
-- Everyone can view animal groups
CREATE POLICY "Anyone can view animal groups"
  ON public.animal_groups FOR SELECT
  USING (true);

-- Coordinators can create animal groups
CREATE POLICY "Coordinators can create animal groups"
  ON public.animal_groups FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'coordinator'
    )
  );

-- Coordinators can update animal groups
CREATE POLICY "Coordinators can update animal groups"
  ON public.animal_groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'coordinator'
    )
  );

