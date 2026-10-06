-- Jewelry Management System - Multi-User Data Isolation Migration
-- Migration: 20261006_multi_user_data_isolation.sql
-- Enables strict Row-Level Security (RLS) and separates all client, order, craftsman, and transaction data per authenticated user.

-- ==============================================================================
-- 1. ADD USER_ID COLUMN TO ALL TABLES (Defaults to auth.uid())
-- ==============================================================================

ALTER TABLE clients 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

ALTER TABLE craftsmen 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

ALTER TABLE jewelry_orders 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

ALTER TABLE jewelry_images 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

ALTER TABLE jewelry_materials 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

ALTER TABLE client_payments 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

ALTER TABLE client_gold_received 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

ALTER TABLE craftsman_transactions 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

ALTER TABLE craftsman_materials_given 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

ALTER TABLE craftsman_items_received 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

ALTER TABLE craftsman_payments 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

-- ==============================================================================
-- 2. CREATE USER_SECURITY TABLE (For synced, per-user 4-digit PIN & security settings)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS user_security (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    pin_hash TEXT NOT NULL,
    pin_salt TEXT NOT NULL,
    auto_lock_minutes INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. ASSIGN EXISTING DATA TO CURRENT PRIMARY USER (Preserves existing data)
-- ==============================================================================

DO $$
DECLARE
    primary_user_id UUID;
BEGIN
    -- Finds the first/existing authenticated user in Supabase
    SELECT id INTO primary_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;

    IF primary_user_id IS NOT NULL THEN
        UPDATE clients SET user_id = primary_user_id WHERE user_id IS NULL;
        UPDATE craftsmen SET user_id = primary_user_id WHERE user_id IS NULL;
        UPDATE jewelry_orders SET user_id = primary_user_id WHERE user_id IS NULL;
        UPDATE jewelry_images SET user_id = primary_user_id WHERE user_id IS NULL;
        UPDATE jewelry_materials SET user_id = primary_user_id WHERE user_id IS NULL;
        UPDATE client_payments SET user_id = primary_user_id WHERE user_id IS NULL;
        UPDATE client_gold_received SET user_id = primary_user_id WHERE user_id IS NULL;
        UPDATE craftsman_transactions SET user_id = primary_user_id WHERE user_id IS NULL;
        UPDATE craftsman_materials_given SET user_id = primary_user_id WHERE user_id IS NULL;
        UPDATE craftsman_items_received SET user_id = primary_user_id WHERE user_id IS NULL;
        UPDATE craftsman_payments SET user_id = primary_user_id WHERE user_id IS NULL;
    END IF;
END $$;

-- ==============================================================================
-- 4. CREATE INDEXES ON USER_ID FOR HIGH-PERFORMANCE FILTERING
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_craftsmen_user_id ON craftsmen(user_id);
CREATE INDEX IF NOT EXISTS idx_jewelry_orders_user_id ON jewelry_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_jewelry_images_user_id ON jewelry_images(user_id);
CREATE INDEX IF NOT EXISTS idx_jewelry_materials_user_id ON jewelry_materials(user_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_user_id ON client_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_client_gold_received_user_id ON client_gold_received(user_id);
CREATE INDEX IF NOT EXISTS idx_craftsman_transactions_user_id ON craftsman_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_craftsman_materials_given_user_id ON craftsman_materials_given(user_id);
CREATE INDEX IF NOT EXISTS idx_craftsman_items_received_user_id ON craftsman_items_received(user_id);
CREATE INDEX IF NOT EXISTS idx_craftsman_payments_user_id ON craftsman_payments(user_id);

-- ==============================================================================
-- 5. DROP OLD UNRESTRICTED PUBLIC POLICIES
-- ==============================================================================

DROP POLICY IF EXISTS "Public access to clients" ON clients;
DROP POLICY IF EXISTS "Public access to craftsmen" ON craftsmen;
DROP POLICY IF EXISTS "Public access to jewelry_orders" ON jewelry_orders;
DROP POLICY IF EXISTS "Public access to jewelry_images" ON jewelry_images;
DROP POLICY IF EXISTS "Public access to jewelry_materials" ON jewelry_materials;
DROP POLICY IF EXISTS "Public access to client_payments" ON client_payments;
DROP POLICY IF EXISTS "Public access to client_gold_received" ON client_gold_received;
DROP POLICY IF EXISTS "Public access to craftsman_transactions" ON craftsman_transactions;
DROP POLICY IF EXISTS "Public access to craftsman_materials_given" ON craftsman_materials_given;
DROP POLICY IF EXISTS "Public access to craftsman_items_received" ON craftsman_items_received;
DROP POLICY IF EXISTS "Public access to craftsman_payments" ON craftsman_payments;

DROP POLICY IF EXISTS "Public Read Access on jewelry-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert Access on jewelry-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Access on jewelry-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Access on jewelry-images" ON storage.objects;

-- ==============================================================================
-- 6. ENABLE ROW-LEVEL SECURITY (RLS) ON ALL TABLES
-- ==============================================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE craftsmen ENABLE ROW LEVEL SECURITY;
ALTER TABLE jewelry_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE jewelry_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE jewelry_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_gold_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE craftsman_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE craftsman_materials_given ENABLE ROW LEVEL SECURITY;
ALTER TABLE craftsman_items_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE craftsman_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_security ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 7. CREATE STRICT USER-SCOPED POLICIES (Users can ONLY view & modify their own rows)
-- ==============================================================================

-- Clients
DROP POLICY IF EXISTS "Users can only manage their own clients" ON clients;
CREATE POLICY "Users can only manage their own clients"
ON clients FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Craftsmen
DROP POLICY IF EXISTS "Users can only manage their own craftsmen" ON craftsmen;
CREATE POLICY "Users can only manage their own craftsmen"
ON craftsmen FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Jewelry Orders
DROP POLICY IF EXISTS "Users can only manage their own jewelry orders" ON jewelry_orders;
CREATE POLICY "Users can only manage their own jewelry orders"
ON jewelry_orders FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Jewelry Images
DROP POLICY IF EXISTS "Users can only manage their own jewelry images" ON jewelry_images;
CREATE POLICY "Users can only manage their own jewelry images"
ON jewelry_images FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Jewelry Materials
DROP POLICY IF EXISTS "Users can only manage their own jewelry materials" ON jewelry_materials;
CREATE POLICY "Users can only manage their own jewelry materials"
ON jewelry_materials FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Client Payments
DROP POLICY IF EXISTS "Users can only manage their own client payments" ON client_payments;
CREATE POLICY "Users can only manage their own client payments"
ON client_payments FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Client Gold Received
DROP POLICY IF EXISTS "Users can only manage their own client gold received" ON client_gold_received;
CREATE POLICY "Users can only manage their own client gold received"
ON client_gold_received FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Craftsman Transactions
DROP POLICY IF EXISTS "Users can only manage their own craftsman transactions" ON craftsman_transactions;
CREATE POLICY "Users can only manage their own craftsman transactions"
ON craftsman_transactions FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Craftsman Materials Given
DROP POLICY IF EXISTS "Users can only manage their own craftsman materials given" ON craftsman_materials_given;
CREATE POLICY "Users can only manage their own craftsman materials given"
ON craftsman_materials_given FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Craftsman Items Received
DROP POLICY IF EXISTS "Users can only manage their own craftsman items received" ON craftsman_items_received;
CREATE POLICY "Users can only manage their own craftsman items received"
ON craftsman_items_received FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Craftsman Payments
DROP POLICY IF EXISTS "Users can only manage their own craftsman payments" ON craftsman_payments;
CREATE POLICY "Users can only manage their own craftsman payments"
ON craftsman_payments FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- User Security Credentials (4-Digit PIN & Settings)
DROP POLICY IF EXISTS "Users can only manage their own security credentials" ON user_security;
CREATE POLICY "Users can only manage their own security credentials"
ON user_security FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 8. STORAGE BUCKET POLICIES (Users can only access & upload jewelry images)
-- ==============================================================================

CREATE POLICY "Authenticated users can read jewelry images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'jewelry-images');

CREATE POLICY "Authenticated users can upload jewelry images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'jewelry-images' AND auth.uid() = owner);

CREATE POLICY "Authenticated users can update their jewelry images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'jewelry-images' AND auth.uid() = owner);

CREATE POLICY "Authenticated users can delete their jewelry images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'jewelry-images' AND auth.uid() = owner);
