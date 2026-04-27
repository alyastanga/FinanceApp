-- Phase 10.4: E2EE Schema Migration
-- Run this script in the Supabase SQL Editor to enforce zero-knowledge storage.

-- 1. Add payload columns to all syncable tables
ALTER TABLE incomes 
  ADD COLUMN IF NOT EXISTS payload_blob TEXT,
  ADD COLUMN IF NOT EXISTS payload_iv TEXT,
  ADD COLUMN IF NOT EXISTS device_id UUID;

ALTER TABLE expenses 
  ADD COLUMN IF NOT EXISTS payload_blob TEXT,
  ADD COLUMN IF NOT EXISTS payload_iv TEXT,
  ADD COLUMN IF NOT EXISTS device_id UUID;

ALTER TABLE goals 
  ADD COLUMN IF NOT EXISTS payload_blob TEXT,
  ADD COLUMN IF NOT EXISTS payload_iv TEXT,
  ADD COLUMN IF NOT EXISTS device_id UUID;

ALTER TABLE budgets 
  ADD COLUMN IF NOT EXISTS payload_blob TEXT,
  ADD COLUMN IF NOT EXISTS payload_iv TEXT,
  ADD COLUMN IF NOT EXISTS device_id UUID;

ALTER TABLE portfolio 
  ADD COLUMN IF NOT EXISTS payload_blob TEXT,
  ADD COLUMN IF NOT EXISTS payload_iv TEXT,
  ADD COLUMN IF NOT EXISTS device_id UUID;


-- 2. Drop plaintext columns to guarantee zero-knowledge in the cloud
-- WARNING: This will delete existing plaintext data. 
-- In a production environment, you would run a data migration script first.

ALTER TABLE incomes 
  DROP COLUMN IF EXISTS amount,
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS currency;

ALTER TABLE expenses 
  DROP COLUMN IF EXISTS amount,
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS currency;

ALTER TABLE goals 
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS target_amount,
  DROP COLUMN IF EXISTS current_amount,
  DROP COLUMN IF EXISTS target_completion_date,
  DROP COLUMN IF EXISTS sync_to_calendar,
  DROP COLUMN IF EXISTS currency;

ALTER TABLE budgets 
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS amount_limit,
  DROP COLUMN IF EXISTS currency;

ALTER TABLE portfolio 
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS asset_type,
  DROP COLUMN IF EXISTS symbol,
  DROP COLUMN IF EXISTS quantity,
  DROP COLUMN IF EXISTS invested_amount,
  DROP COLUMN IF EXISTS value,
  DROP COLUMN IF EXISTS change_24h,
  DROP COLUMN IF EXISTS currency;
