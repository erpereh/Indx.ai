import { Investment, HistoryEntry } from './types';

const STORAGE_KEY = 'indx_ai_investments';
const HISTORY_KEY = 'indx_ai_history';

/**
 * Load investments from localStorage
 */
export function loadInvestments(): Investment[] {
    if (typeof window === 'undefined') return [];

    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];

        const investments = JSON.parse(data);
        return investments.map((inv: any) => ({
            ...inv,
            lastUpdated: inv.lastUpdated ? new Date(inv.lastUpdated) : undefined,
            // Ensure purchaseDate exists (migration for old data)
            purchaseDate: inv.purchaseDate || new Date().toISOString().split('T')[0],
        }));
    } catch (error) {
        console.error('Error loading investments from storage:', error);
        return [];
    }
}

/**
 * Save investments to localStorage
 */
export function saveInvestments(investments: Investment[]): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(investments));
    } catch (error) {
        console.error('Error saving investments to storage:', error);
    }
}

/**
 * Load portfolio history from localStorage
 */
export function loadHistory(): HistoryEntry[] {
    if (typeof window === 'undefined') return [];

    try {
        const data = localStorage.getItem(HISTORY_KEY);
        if (!data) return [];
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading history:', error);
        return [];
    }
}

/**
 * Save portfolio history to localStorage
 */
export function saveHistory(history: HistoryEntry[]): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        console.error('Error saving history:', error);
    }
}
