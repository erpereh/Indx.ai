'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Investment, PortfolioSummary, HistoryEntry } from '@/lib/types';
import { calculatePortfolioSummary, reconstructPortfolioHistory } from '@/lib/calculations';
import { fetchPriceByISIN, fetchFundHistory } from '@/lib/priceService';
import { loadInvestments, saveInvestments } from '@/lib/storage';

interface InvestmentContextType {
    investments: Investment[];
    history: HistoryEntry[];
    portfolioSummary: PortfolioSummary;
    loading: boolean;
    addInvestment: (investment: Omit<Investment, 'id'>) => Promise<void>;
    editInvestment: (id: string, updatedInvestment: Partial<Investment>) => Promise<void>;
    deleteInvestment: (id: string) => Promise<void>;
    refreshPrices: () => Promise<void>;
    user: any; // Keeping user prop for compatibility, though it will be null
}

const InvestmentContext = createContext<InvestmentContextType | undefined>(undefined);

export function InvestmentProvider({ children }: { children: React.ReactNode }) {
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Mock user for "Offline" mode
    const user = null;

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
                    name: priceData.name || inv.name, // Update name if available
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
        saveInvestments(updated);
        updateHistory(updated);
    }, [updateHistory]);

    // Initialize - Load from LocalStorage
    useEffect(() => {
        async function init() {
            setLoading(true);
            const localInvestments = loadInvestments();
            
            if (localInvestments.length > 0) {
                setInvestments(localInvestments);
                await refreshPricesInternal(localInvestments);
            }
            
            setLoading(false);
        }

        init();
    }, [refreshPricesInternal]);

    const refreshPrices = useCallback(async () => {
        if (investments.length > 0) {
            await refreshPricesInternal(investments);
        }
    }, [investments, refreshPricesInternal]);

    const addInvestment = useCallback(async (invData: Omit<Investment, 'id'>) => {
        const newInv: Investment = {
            id: Math.random().toString(36).substring(7),
            isin: invData.isin,
            name: invData.name || invData.isin,
            shares: Number(invData.shares),
            initialInvestment: Number(invData.initialInvestment),
            purchaseDate: invData.purchaseDate,
            lastUpdated: new Date(),
            currentPrice: 0 // Will fetch
        };

        const newList = [...investments, newInv];
        setInvestments(newList);
        saveInvestments(newList);
        
        // Fetch Data for new item
        await refreshPricesInternal(newList);

    }, [investments, refreshPricesInternal]);

    const editInvestment = useCallback(async (id: string, fields: Partial<Investment>) => {
        const updatedList = investments.map(inv => 
            inv.id === id ? { ...inv, ...fields } : inv
        );
        setInvestments(updatedList);
        saveInvestments(updatedList);
        
        if (fields.isin) {
             // If ISIN changed, full refresh needed
             await refreshPricesInternal(updatedList);
        } else {
             updateHistory(updatedList);
        }

    }, [investments, updateHistory, refreshPricesInternal]);

    const deleteInvestment = useCallback(async (id: string) => {
        const updatedList = investments.filter(inv => inv.id !== id);
        setInvestments(updatedList);
        saveInvestments(updatedList);
        updateHistory(updatedList);
    }, [investments, updateHistory]);

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
        user
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
