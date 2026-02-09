import { createClient } from '@/lib/supabase/client';
import type { Investment } from '@/lib/types';

// ============================================
// Supabase <-> TypeScript field mapping
// ============================================
// DB: id, user_id, isin, name, shares, total_investment, purchase_date, created_at, updated_at
// TS: id, name, isin, shares, initialInvestment, purchaseDate, + runtime fields (currentPrice, etc.)

interface SupabaseInvestmentRow {
    id: string;
    user_id: string;
    isin: string;
    name: string;
    shares: number;
    total_investment: number;
    purchase_date: string;
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
