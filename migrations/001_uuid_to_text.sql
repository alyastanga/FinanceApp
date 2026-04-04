-- Migration: Convert UUID columns to TEXT for WatermelonDB compatibility
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New query)
--
-- WatermelonDB generates 16-char random string IDs, not UUIDs.
-- This migration changes the column types so sync works correctly.

-- Step 1: Drop existing tables (WARNING: This deletes all data)
-- If you have data you want to keep, use ALTER TABLE instead (see Step 1b below)

-- Step 1a: Nuclear option (clean slate)
DROP TABLE IF EXISTS public.incomes CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;

-- Step 2: Recreate with TEXT ids
CREATE TABLE public.incomes (
  id TEXT PRIMARY KEY,
  amount DECIMAL(12,2) NOT NULL,
  source TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.expenses (
  id TEXT PRIMARY KEY,
  amount DECIMAL(12,2) NOT NULL,
  category TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.goals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) DEFAULT 0,
  target_completion_date TIMESTAMPTZ,
  sync_to_calendar BOOLEAN DEFAULT FALSE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.budgets (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  amount_limit DECIMAL(12,2) NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Enable RLS
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies (users can only access their own data)
CREATE POLICY "Users can manage their own incomes" ON public.incomes
  FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "Users can manage their own expenses" ON public.expenses
  FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "Users can manage their own goals" ON public.goals
  FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "Users can manage their own budgets" ON public.budgets
  FOR ALL USING (user_id = auth.uid()::text);
