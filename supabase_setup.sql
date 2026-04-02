-- 1. Create Tables
CREATE TABLE IF NOT EXISTS public.incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies (Users can only see their own data)
CREATE POLICY "Users can see their own income" ON public.incomes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can see their own expenses" ON public.expenses
  FOR ALL USING (auth.uid() = user_id);

-- 4. Enable Realtime (optional but recommended)
ALTER PUBLICATION supabase_realtime ADD TABLE public.incomes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
