-- Add foster-specific fields to profiles table
-- These fields are only relevant for fosters (role='foster'), not coordinators

ALTER TABLE public.profiles
ADD COLUMN phone_number TEXT,
ADD COLUMN full_address TEXT,
ADD COLUMN home_inspection TEXT;

