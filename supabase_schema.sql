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
    target_weight NUMERIC DEFAULT NULL,
    asset_class TEXT DEFAULT NULL,
    region TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON COLUMN investments.target_weight IS 'Target allocation percentage (0-100)';
COMMENT ON COLUMN investments.asset_class IS 'Detected asset class (Equity, Fixed Income, etc.)';
COMMENT ON COLUMN investments.region IS 'Detected region (Global, North America, etc.)';

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

-- ============================================
-- Step 7: Create transactions table
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    investment_id UUID REFERENCES investments(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL', 'DIVIDEND', 'DEPOSIT', 'WITHDRAWAL')),
    date DATE NOT NULL,
    shares NUMERIC NOT NULL DEFAULT 0,
    price NUMERIC NOT NULL DEFAULT 0,
    amount NUMERIC NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'EUR',
    asset_name TEXT, 
    isin TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 8: Transactions RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
    ON transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
    ON transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
    ON transactions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
    ON transactions FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_investment_id ON transactions(investment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

