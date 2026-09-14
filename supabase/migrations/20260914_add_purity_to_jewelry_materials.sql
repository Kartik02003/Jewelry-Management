-- Add purity_percentage and pure_quantity columns to jewelry_materials table
ALTER TABLE jewelry_materials ADD COLUMN IF NOT EXISTS purity_percentage NUMERIC DEFAULT 0;
ALTER TABLE jewelry_materials ADD COLUMN IF NOT EXISTS pure_quantity NUMERIC DEFAULT 0;
