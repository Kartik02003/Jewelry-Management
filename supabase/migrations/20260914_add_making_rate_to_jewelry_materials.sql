-- Add making_rate column to jewelry_materials for storing making charges per unit
ALTER TABLE jewelry_materials ADD COLUMN IF NOT EXISTS making_rate NUMERIC DEFAULT 0;
