-- ==========================================
-- DEFINITIVE SUPABASE SYNC FIX
-- ==========================================
-- Instructions: 
-- 1. Go to your Supabase Dashboard -> SQL Editor
-- 2. Paste this ENTIRE script
-- 3. Click "Run"
-- ==========================================

-- Add WatermelonDB sync metadata columns to all tables
DO $$
BEGIN
    -- Incomes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='incomes' AND column_name='_status') THEN
        ALTER TABLE incomes ADD COLUMN _status text DEFAULT 'created';
        ALTER TABLE incomes ADD COLUMN _changed text;
    END IF;

    -- Expenses
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='_status') THEN
        ALTER TABLE expenses ADD COLUMN _status text DEFAULT 'created';
        ALTER TABLE expenses ADD COLUMN _changed text;
    END IF;

    -- Budgets
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='budgets' AND column_name='_status') THEN
        ALTER TABLE budgets ADD COLUMN _status text DEFAULT 'created';
        ALTER TABLE budgets ADD COLUMN _changed text;
    END IF;

    -- Goals
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='goals' AND column_name='_status') THEN
        ALTER TABLE goals ADD COLUMN _status text DEFAULT 'created';
        ALTER TABLE goals ADD COLUMN _changed text;
    END IF;
END $$;

-- Verify columns
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE column_name IN ('_status', '_changed')
ORDER BY table_name;
