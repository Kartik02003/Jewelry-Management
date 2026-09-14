-- Migration: Make item_received_id nullable in craftsman_payments table
-- This allows payments to be recorded at the craftsman/transaction level rather than per item

ALTER TABLE craftsman_payments ALTER COLUMN item_received_id DROP NOT NULL;
