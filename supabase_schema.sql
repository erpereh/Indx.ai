-- ============================================
-- Indx.ai - Supabase Schema (Clean Start)
-- ============================================
-- Run this in Supabase SQL Editor after dropping all existing tables.

-- Step 1: Drop existing tables (clean slate)
DROP TABLE IF EXISTS fund_nav_history CASCADE;
DROP TABLE IF EXISTS investments CASCADE;
DROP TABLE IF EXISTS funds CASCADE;

-- Step 2: Create investments table
CREATE TABLE investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    isin TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    shares NUMERIC NOT NULL DEFAULT 0,
    total_investment NUMERIC NOT NULL DEFAULT 0,
    purchase_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 3: Enable Row Level Security
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies - each user can only access their own investments
CREATE POLICY "Users can view their own investments"
    ON investments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own investments"
    ON investments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investments"
    ON investments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investments"
    ON investments FOR DELETE
    USING (auth.uid() = user_id);

-- Step 5: Performance index
CREATE INDEX idx_investments_user_id ON investments(user_id);

-- Step 6: Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER investments_updated_at
    BEFORE UPDATE ON investments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
