'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Investment, PortfolioSummary, HistoryEntry } from '@/lib/types';
import { calculatePortfolioSummary, reconstructPortfolioHistory } from '@/lib/calculations';
import { fetchPriceByISIN, fetchFundHistory } from '@/lib/priceService';
import { loadInvestments, saveInvestments } from '@/lib/storage';
import { invalidateCacheForISIN, invalidateFullCacheForISIN } from '@/lib/yahooCache';
import { cleanDuplicateName } from '@/lib/nameUtils';
import { useAuth } from '@/context/AuthContext';
import {
    fetchUserInvestments,
    upsertInvestment,
    deleteSupabaseInvestment,
    bulkInsertInvestments,
} from '@/lib/supabaseStorage';

interface InvestmentContextType {
    investments: Investment[];
    history: HistoryEntry[];
    portfolioSummary: PortfolioSummary;
    loading: boolean;
    addInvestment: (investment: Omit<Investment, 'id'>) => Promise<void>;
    editInvestment: (id: string, updatedInvestment: Partial<Investment>) => Promise<void>;
    deleteInvestment: (id: string) => Promise<void>;
    refreshPrices: () => Promise<void>;
}

const InvestmentContext = createContext<InvestmentContextType | undefined>(undefined);

export function InvestmentProvider({ children }: { children: React.ReactNode }) {
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const initializedForUser = useRef<string | null>(null);

    const updateHistory = useCallback((currentInvestments: Investment[]) => {
        const fullHistory = reconstructPortfolioHistory(currentInvestments);
        setHistory(fullHistory);
        return fullHistory;
    }, []);

    const refreshPricesInternal = useCallback(async (currentInv: Investment[]) => {
        const updated = await Promise.all(currentInv.map(async (inv) => {
            try {
                // Fetch Price
                const priceData = await fetchPriceByISIN(inv.isin);
                // Fetch History (for graph)
                let historicalData = inv.historicalData;
                if (!historicalData || historicalData.length === 0) {
                    historicalData = await fetchFundHistory(inv.isin);
                }
                
                return {
                    ...inv,
                    name: cleanDuplicateName(priceData.name || inv.name),
                    currentPrice: priceData.price,
                    dailyChangePercent: priceData.changePercent,
                    symbol: priceData.symbol,
                    historicalData,
                    priceError: false,
                    lastUpdated: new Date()
                };
            } catch (err) {
                return { ...inv, priceError: true };
            }
        }));

        setInvestments(updated);
        saveInvestments(updated); // Keep localStorage as cache
        updateHistory(updated);
    }, [updateHistory]);

    // ============================================
    // Initialize - Load from Supabase (or migrate from localStorage)
    // ============================================
    useEffect(() => {
        // If no user, reset state and stop loading
        if (!user) {
            if (initializedForUser.current !== null) {
                // User just logged out
                setInvestments([]);
                setHistory([]);
                initializedForUser.current = null;
            }
            setLoading(false);
            return;
        }

        // If already initialized for this user, skip
        if (initializedForUser.current === user.id) return;

        async function init() {
            setLoading(true);

            try {
                // 1. Try to load from Supabase
                const supabaseInvestments = await fetchUserInvestments(user!.id);

                if (supabaseInvestments.length > 0) {
                    // Supabase has data - use it as the source of truth
                    const cleaned = supabaseInvestments.map(inv => ({
                        ...inv,
                        name: cleanDuplicateName(inv.name),
                    }));
                    setInvestments(cleaned);
                    saveInvestments(cleaned); // Cache locally
                    await refreshPricesInternal(cleaned);
                } else {
                    // Supabase is empty - check localStorage for migration
                    const localInvestments = loadInvestments();

                    if (localInvestments.length > 0) {
                        // Migrate localStorage data to Supabase
                        console.info('Migrating localStorage investments to Supabase...');
                        try {
                            const migratedInvestments = await bulkInsertInvestments(user!.id, localInvestments);
                            const cleaned = migratedInvestments.map(inv => ({
                                ...inv,
                                name: cleanDuplicateName(inv.name),
                            }));
                            setInvestments(cleaned);
                            saveInvestments(cleaned);
                            await refreshPricesInternal(cleaned);
                            console.info(`Migrated ${migratedInvestments.length} investments to Supabase.`);
                        } catch (migrationError: unknown) {
                            const errMsg = migrationError instanceof Error ? migrationError.message : String(migrationError);
                            console.error('Migration failed, using localStorage as fallback:', errMsg);
                            // Fallback: use localStorage data without Supabase
                            const cleaned = localInvestments.map(inv => ({
                                ...inv,
                                name: cleanDuplicateName(inv.name),
                            }));
                            setInvestments(cleaned);
                            await refreshPricesInternal(cleaned);
                        }
                    }
                    // If both are empty, nothing to load - that's fine
                }
            } catch (error) {
                console.error('Failed to load from Supabase, falling back to localStorage:', error);
                // Graceful degradation: use localStorage
                const localInvestments = loadInvestments();
                const cleaned = localInvestments.map(inv => ({
                    ...inv,
                    name: cleanDuplicateName(inv.name),
                }));
                if (cleaned.length > 0) {
                    setInvestments(cleaned);
                    if (JSON.stringify(localInvestments) !== JSON.stringify(cleaned)) {
                        saveInvestments(cleaned);
                    }
                    await refreshPricesInternal(cleaned);
                }
            }

            initializedForUser.current = user!.id;
            setLoading(false);
        }

        init();
    }, [user, refreshPricesInternal]);

    // ============================================
    // Public API
    // ============================================

    const refreshPrices = useCallback(async () => {
        if (investments.length > 0) {
            await refreshPricesInternal(investments);
        }
    }, [investments, refreshPricesInternal]);

    const addInvestment = useCallback(async (invData: Omit<Investment, 'id'>) => {
        const newInv: Investment = {
            id: crypto.randomUUID(),
            isin: invData.isin,
            name: cleanDuplicateName(invData.name || invData.isin),
            shares: Number(invData.shares),
            initialInvestment: Number(invData.initialInvestment),
            purchaseDate: invData.purchaseDate,
            lastUpdated: new Date(),
            currentPrice: 0,
        };

        // Optimistic update: add to state immediately
        const newList = [...investments, newInv];
        setInvestments(newList);
        saveInvestments(newList);

        // Persist to Supabase (async, non-blocking for UX)
        if (user) {
            try {
                await upsertInvestment(user.id, newInv);
            } catch (error) {
                console.error('Failed to save investment to Supabase:', error);
                // Investment is still in localStorage + state, will sync later
            }
        }

        // Fetch live data for new item
        await refreshPricesInternal(newList);
    }, [investments, user, refreshPricesInternal]);

    const editInvestment = useCallback(async (id: string, fields: Partial<Investment>) => {
        const investment = investments.find(inv => inv.id === id);

        const updatedList = investments.map(inv =>
            inv.id === id ? { ...inv, ...fields } : inv
        );
        setInvestments(updatedList);
        saveInvestments(updatedList);

        // Persist to Supabase
        if (user) {
            const updatedInvestment = updatedList.find(inv => inv.id === id);
            if (updatedInvestment) {
                try {
                    await upsertInvestment(user.id, updatedInvestment);
                } catch (error) {
                    console.error('Failed to update investment in Supabase:', error);
                }
            }
        }

        if (fields.isin) {
            // If ISIN changed, invalidate cache for old and new ISIN
            if (investment?.isin) {
                invalidateCacheForISIN(investment.isin);
                invalidateFullCacheForISIN(investment.isin);
            }
            if (fields.isin) {
                invalidateCacheForISIN(fields.isin);
                invalidateFullCacheForISIN(fields.isin);
            }
            // Full refresh needed
            await refreshPricesInternal(updatedList);
        } else if (fields.shares !== undefined || fields.purchaseDate !== undefined) {
            // If shares or purchaseDate changed, invalidate cache for this ISIN
            if (investment?.isin) {
                invalidateCacheForISIN(investment.isin);
                invalidateFullCacheForISIN(investment.isin);
            }
            await refreshPricesInternal(updatedList);
        } else {
            updateHistory(updatedList);
        }
    }, [investments, user, updateHistory, refreshPricesInternal]);

    const deleteInvestment = useCallback(async (id: string) => {
        const investment = investments.find(inv => inv.id === id);

        // Invalidate caches
        if (investment?.isin) {
            invalidateCacheForISIN(investment.isin);
            invalidateFullCacheForISIN(investment.isin);
        }

        const updatedList = investments.filter(inv => inv.id !== id);
        setInvestments(updatedList);
        saveInvestments(updatedList);
        updateHistory(updatedList);

        // Delete from Supabase
        if (user) {
            try {
                await deleteSupabaseInvestment(id);
            } catch (error) {
                console.error('Failed to delete investment from Supabase:', error);
            }
        }
    }, [investments, user, updateHistory]);

    const portfolioSummary = calculatePortfolioSummary(investments, history);

    const value: InvestmentContextType = {
        investments,
        history,
        portfolioSummary,
        loading,
        addInvestment,
        editInvestment,
        deleteInvestment,
        refreshPrices,
    };

    return (
        <InvestmentContext.Provider value={value}>
            {children}
        </InvestmentContext.Provider>
    );
}

export function useInvestments() {
    const context = useContext(InvestmentContext);
    if (context === undefined) {
        throw new Error('useInvestments must be used within InvestmentProvider');
    }
    return context;
}
