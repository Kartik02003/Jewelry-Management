-- Add payment_type to client_payments table
ALTER TABLE client_payments ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20) DEFAULT 'credit';

-- Add index on payment_type
CREATE INDEX IF NOT EXISTS idx_client_payments_type ON client_payments(payment_type);
