-- Add client_id column to client_payments table and allow jewelry_id to be nullable
ALTER TABLE client_payments ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE client_payments ALTER COLUMN jewelry_id DROP NOT NULL;

-- Backfill client_id from jewelry_orders where client_id is null
UPDATE client_payments cp
SET client_id = jo.client_id
FROM jewelry_orders jo
WHERE cp.jewelry_id = jo.id AND cp.client_id IS NULL;

-- Add index on client_id
CREATE INDEX IF NOT EXISTS idx_client_payments_client ON client_payments(client_id);
