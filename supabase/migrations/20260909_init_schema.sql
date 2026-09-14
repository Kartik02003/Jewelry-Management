-- Jewelry Client & Craftsman Management System - Schema Migration
-- Migration: 20260909_init_schema.sql

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Clients Table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Craftsmen Table
CREATE TABLE IF NOT EXISTS craftsmen (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Jewelry Orders Table
CREATE TABLE IF NOT EXISTS jewelry_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Jewelry Images Table
CREATE TABLE IF NOT EXISTS jewelry_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jewelry_id UUID NOT NULL REFERENCES jewelry_orders(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Jewelry Materials Table (stores material name directly without extra table)
CREATE TABLE IF NOT EXISTS jewelry_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jewelry_id UUID NOT NULL REFERENCES jewelry_orders(id) ON DELETE CASCADE,
    material_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL DEFAULT 'g',
    unit_cost NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Client Payments Table
CREATE TABLE IF NOT EXISTS client_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jewelry_id UUID NOT NULL REFERENCES jewelry_orders(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    payment_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Craftsman Transactions Table
CREATE TABLE IF NOT EXISTS craftsman_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    craftsman_id UUID NOT NULL REFERENCES craftsmen(id) ON DELETE CASCADE,
    jewelry_id UUID REFERENCES jewelry_orders(id) ON DELETE SET NULL,
    transaction_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Craftsman Materials Given Table
CREATE TABLE IF NOT EXISTS craftsman_materials_given (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES craftsman_transactions(id) ON DELETE CASCADE,
    material_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL DEFAULT 'g',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Craftsman Items Received Table
CREATE TABLE IF NOT EXISTS craftsman_items_received (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES craftsman_transactions(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    gross_quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL DEFAULT 'g',
    purity_percentage NUMERIC NOT NULL DEFAULT 100,
    pure_quantity NUMERIC NOT NULL,
    making_cost NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Craftsman Payments Table
CREATE TABLE IF NOT EXISTS craftsman_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    craftsman_id UUID NOT NULL REFERENCES craftsmen(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES craftsman_transactions(id) ON DELETE CASCADE,
    item_received_id UUID NOT NULL REFERENCES craftsman_items_received(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    payment_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_craftsmen_name ON craftsmen(name);
CREATE INDEX IF NOT EXISTS idx_craftsmen_phone ON craftsmen(phone);
CREATE INDEX IF NOT EXISTS idx_jewelry_orders_client_id ON jewelry_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_jewelry_orders_name ON jewelry_orders(name);
CREATE INDEX IF NOT EXISTS idx_jewelry_materials_jewelry ON jewelry_materials(jewelry_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_jewelry ON client_payments(jewelry_id);
CREATE INDEX IF NOT EXISTS idx_craftsman_transactions_craftsman ON craftsman_transactions(craftsman_id);
CREATE INDEX IF NOT EXISTS idx_craftsman_transactions_jewelry ON craftsman_transactions(jewelry_id);
CREATE INDEX IF NOT EXISTS idx_craftsman_materials_given_transaction ON craftsman_materials_given(transaction_id);
CREATE INDEX IF NOT EXISTS idx_craftsman_items_received_transaction ON craftsman_items_received(transaction_id);
CREATE INDEX IF NOT EXISTS idx_craftsman_payments_transaction ON craftsman_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_craftsman_payments_item ON craftsman_payments(item_received_id);

-- Storage Bucket Setup for Supabase
INSERT INTO storage.buckets (id, name, public) 
VALUES ('jewelry-images', 'jewelry-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public Storage Access Policies
CREATE POLICY "Public Read Access on jewelry-images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'jewelry-images');

CREATE POLICY "Public Insert Access on jewelry-images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'jewelry-images');

CREATE POLICY "Public Update Access on jewelry-images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'jewelry-images');

CREATE POLICY "Public Delete Access on jewelry-images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'jewelry-images');

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE craftsmen ENABLE ROW LEVEL SECURITY;
ALTER TABLE jewelry_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE jewelry_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE jewelry_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE craftsman_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE craftsman_materials_given ENABLE ROW LEVEL SECURITY;
ALTER TABLE craftsman_items_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE craftsman_payments ENABLE ROW LEVEL SECURITY;

-- Allow open access policies for single-user version (can be replaced with auth.uid() later)
CREATE POLICY "Public access to clients" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to craftsmen" ON craftsmen FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to jewelry_orders" ON jewelry_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to jewelry_images" ON jewelry_images FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to jewelry_materials" ON jewelry_materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to client_payments" ON client_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to craftsman_transactions" ON craftsman_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to craftsman_materials_given" ON craftsman_materials_given FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to craftsman_items_received" ON craftsman_items_received FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to craftsman_payments" ON craftsman_payments FOR ALL USING (true) WITH CHECK (true);
