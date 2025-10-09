-- Add unit column to ingredients table
ALTER TABLE public.ingredients 
ADD COLUMN unit text;

-- Update existing data to parse and separate quantity and unit from name
-- This will require manual updates or data cleaning as we can't reliably parse all formats