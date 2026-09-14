-- Add carat, cost_per_gram, and received_date to craftsman_items_received table
ALTER TABLE craftsman_items_received ADD COLUMN IF NOT EXISTS carat TEXT DEFAULT '22';
ALTER TABLE craftsman_items_received ADD COLUMN IF NOT EXISTS cost_per_gram NUMERIC DEFAULT 0;
ALTER TABLE craftsman_items_received ADD COLUMN IF NOT EXISTS received_date DATE DEFAULT CURRENT_DATE;
