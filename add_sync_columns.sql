-- ==========================================
-- FINAL DEFINITIVE SUPABASE SYNC FIX (v5)
-- ==========================================
-- Instructions: 
-- 1. Go to your Supabase Dashboard -> SQL Editor
-- 2. Paste this ENTIRE script
-- 3. Click "Run"
-- ==========================================

DO $$
BEGIN
    -- Core Sync Columns (_status, _changed)
    -------------------------------------------
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

    -- Feature Specific Columns (sync_to_calendar)
    -------------------------------------------
    -- Goals (sync_to_calendar)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='goals' AND column_name='sync_to_calendar') THEN
        ALTER TABLE goals ADD COLUMN sync_to_calendar boolean DEFAULT false;
    END IF;

    -- Budgets (sync_to_calendar)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='budgets' AND column_name='sync_to_calendar') THEN
        ALTER TABLE budgets ADD COLUMN sync_to_calendar boolean DEFAULT false;
    END IF;

    -- Portfolio (New Schema v8)
    -------------------------------------------
    -- Check if table exists, if not create basic version
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename  = 'portfolio') THEN
        CREATE TABLE portfolio (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            name text,
            asset_type text,
            symbol text,
            quantity numeric DEFAULT 0,
            invested_amount numeric DEFAULT 0,
            value numeric DEFAULT 0,
            change_24h numeric DEFAULT 0,
            user_id uuid,
            _status text DEFAULT 'created',
            _changed text,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
        );
    ELSE
        -- Add missing columns to existing table
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portfolio' AND column_name='symbol') THEN
            ALTER TABLE portfolio ADD COLUMN symbol text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portfolio' AND column_name='quantity') THEN
            ALTER TABLE portfolio ADD COLUMN quantity numeric DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portfolio' AND column_name='invested_amount') THEN
            ALTER TABLE portfolio ADD COLUMN invested_amount numeric DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portfolio' AND column_name='_status') THEN
            ALTER TABLE portfolio ADD COLUMN _status text DEFAULT 'created';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portfolio' AND column_name='_changed') THEN
            ALTER TABLE portfolio ADD COLUMN _changed text;
        END IF;
    END IF;

END $$;

-- Verify results
SELECT table_name, column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name IN ('incomes', 'expenses', 'budgets', 'goals', 'portfolio')
AND column_name IN ('_status', '_changed', 'sync_to_calendar', 'symbol', 'quantity', 'invested_amount')
ORDER BY table_name;
