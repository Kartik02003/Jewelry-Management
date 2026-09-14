-- Create client_gold_received table
CREATE TABLE IF NOT EXISTS client_gold_received (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL,
    received_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster queries by client
CREATE INDEX IF NOT EXISTS idx_client_gold_received_client ON client_gold_received(client_id);

-- Enable RLS
ALTER TABLE client_gold_received ENABLE ROW LEVEL SECURITY;

-- Allow public access
CREATE POLICY "Public access to client_gold_received" ON client_gold_received FOR ALL USING (true) WITH CHECK (true);
