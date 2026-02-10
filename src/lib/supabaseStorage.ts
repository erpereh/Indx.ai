import { createClient } from '@/lib/supabase/client';
import type { Investment } from '@/lib/types';

// ============================================
// Supabase <-> TypeScript field mapping
// ============================================
// DB: id, user_id, isin, name, shares, total_investment, purchase_date, target_weight, asset_class, region, created_at, updated_at
// TS: id, name, isin, shares, initialInvestment, purchaseDate, targetWeight, assetClass, region

interface SupabaseInvestmentRow {
    id: string;
    user_id: string;
    isin: string;
    name: string;
    shares: number;
    total_investment: number;
    purchase_date: string;
    target_weight: number | null;
    asset_class: string | null;
    region: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Convert a Supabase DB row to the TypeScript Investment interface.
 * Only maps persisted fields; runtime fields (currentPrice, symbol, etc.) are left undefined.
 */
function rowToInvestment(row: SupabaseInvestmentRow): Investment {
    return {
        id: row.id,
        name: row.name,
        isin: row.isin,
        shares: Number(row.shares),
        initialInvestment: Number(row.total_investment),
        purchaseDate: row.purchase_date,
        targetWeight: row.target_weight != null ? Number(row.target_weight) : undefined,
        assetClass: (row.asset_class as any) || undefined,
        region: (row.region as any) || undefined,
    };
}

/**
 * Convert a TypeScript Investment to Supabase insert/update payload.
 */
function investmentToRow(userId: string, inv: Investment): Omit<SupabaseInvestmentRow, 'created_at' | 'updated_at'> {
    return {
        id: inv.id,
        user_id: userId,
        isin: inv.isin.trim().toUpperCase(),
        name: inv.name,
        shares: inv.shares,
        total_investment: inv.initialInvestment,
        purchase_date: inv.purchaseDate,
        target_weight: inv.targetWeight ?? null,
        asset_class: inv.assetClass || null,
        region: inv.region || null,
    };
}

// ============================================
// CRUD Operations
// ============================================

/**
 * Fetch all investments for a given user from Supabase.
 */
export async function fetchUserInvestments(userId: string): Promise<Investment[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', userId)
        .order('purchase_date', { ascending: true });

    if (error) {
        console.error('Error fetching investments from Supabase:', error.message, error.code, error.details, error.hint);
        throw error;
    }

    return (data || []).map((row: SupabaseInvestmentRow) => rowToInvestment(row));
}

/**
 * Upsert (insert or update) a single investment.
 * Uses the investment ID as the conflict target.
 */
export async function upsertInvestment(userId: string, inv: Investment): Promise<Investment> {
    const supabase = createClient();
    const row = investmentToRow(userId, inv);

    const { data, error } = await supabase
        .from('investments')
        .upsert(row, { onConflict: 'id' })
        .select()
        .single();

    if (error) {
        console.error('Error upserting investment to Supabase:', error.message, error.code, error.details, error.hint);
        throw error;
    }

    return rowToInvestment(data as SupabaseInvestmentRow);
}

/**
 * Delete a single investment by its ID.
 */
export async function deleteSupabaseInvestment(investmentId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', investmentId);

    if (error) {
        console.error('Error deleting investment from Supabase:', error.message, error.code, error.details, error.hint);
        throw error;
    }
}

/**
 * Bulk insert investments (used for localStorage -> Supabase migration on first login).
 * Omits IDs so Supabase generates proper UUIDs via gen_random_uuid().
 */
export async function bulkInsertInvestments(userId: string, investments: Investment[]): Promise<Investment[]> {
    if (investments.length === 0) return [];

    const supabase = createClient();

    const rows = investments.map((inv) => ({
        user_id: userId,
        isin: (inv.isin || '').trim().toUpperCase(),
        name: inv.name || '',
        shares: Number(inv.shares) || 0,
        total_investment: Number(inv.initialInvestment) || 0,
        purchase_date: inv.purchaseDate,
    }));

    // Filter out rows with missing required fields
    const validRows = rows.filter(row => row.isin && row.purchase_date);

    if (validRows.length === 0) {
        console.warn('No valid investments to migrate to Supabase');
        return [];
    }

    const { data, error } = await supabase
        .from('investments')
        .insert(validRows)
        .select();

    if (error) {
        console.error('Error bulk inserting investments to Supabase:', error.message, error.code, error.details, error.hint);
        throw error;
    }

    return (data || []).map((row: SupabaseInvestmentRow) => rowToInvestment(row));
}

// ============================================
// Transactions Support
// ============================================

interface SupabaseTransactionRow {
    id: string;
    user_id: string;
    investment_id: string | null;
    type: string;
    date: string;
    shares: number;
    price: number;
    amount: number;
    currency: string;
    asset_name: string | null;
    isin: string | null;
    created_at: string;
}

import type { Transaction } from '@/lib/types';

function rowToTransaction(row: SupabaseTransactionRow): Transaction {
    return {
        id: row.id,
        investmentId: row.investment_id || undefined,
        type: row.type as any,
        date: row.date,
        shares: Number(row.shares),
        price: Number(row.price),
        amount: Number(row.amount),
        currency: row.currency,
        assetName: row.asset_name || undefined,
        isin: row.isin || undefined,
    };
}

export async function fetchUserTransactions(userId: string): Promise<Transaction[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

    if (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }

    return (data || []).map((row: SupabaseTransactionRow) => rowToTransaction(row));
}

export async function addTransaction(userId: string, txn: Omit<Transaction, 'id'>): Promise<Transaction | null> {
    const supabase = createClient();

    // Convert undefined to null for Supabase
    const row = {
        user_id: userId,
        investment_id: txn.investmentId || null,
        type: txn.type,
        date: txn.date,
        shares: txn.shares,
        price: txn.price,
        amount: txn.amount,
        currency: txn.currency || 'EUR',
        asset_name: txn.assetName || null,
        isin: txn.isin ? txn.isin.trim().toUpperCase() : null,
    };

    const { data, error } = await supabase
        .from('transactions')
        .insert(row)
        .select()
        .single();

    if (error) {
        console.error('Error adding transaction:', error);
        return null;
    }

    return rowToTransaction(data as SupabaseTransactionRow);
}

export async function deleteSupabaseTransaction(transactionId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

    if (error) {
        console.error('Error deleting transaction from Supabase:', error);
        throw error;
    }
}
