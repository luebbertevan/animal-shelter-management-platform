-- Migration: Add trigger to automatically update updated_at for animals table
-- This trigger will automatically set updated_at to NOW() whenever an animal record is updated

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for animals table
CREATE TRIGGER update_animals_updated_at
    BEFORE UPDATE ON public.animals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

