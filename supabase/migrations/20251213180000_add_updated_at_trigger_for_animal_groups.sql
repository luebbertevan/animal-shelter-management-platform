-- Migration: Add trigger to automatically update updated_at for animal_groups table
-- This trigger will automatically set updated_at to NOW() whenever a group record is updated

-- Create trigger for animal_groups table (function already exists from animals migration)
CREATE TRIGGER update_animal_groups_updated_at
    BEFORE UPDATE ON public.animal_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

