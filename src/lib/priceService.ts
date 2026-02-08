import { Investment } from './types';

/**
 * Fetch current price and details for a fund by ISIN from Yahoo Finance via our API route
 */
export async function fetchPriceByISIN(isin: string): Promise<{
    price: number;
    changePercent?: number;
    symbol?: string;
    name?: string;
}> {
    try {
        const response = await fetch(`/api/price?isin=${encodeURIComponent(isin)}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Failed to fetch price for ISIN: ${isin}`);
        }

        const data = await response.json();

        if (!data.price || isNaN(data.price)) {
            throw new Error('Invalid price format');
        }

        return {
            price: data.price,
            changePercent: data.changePercent,
            symbol: data.symbol,
            name: data.name,
        };
    } catch (error) {
        console.error(`Error fetching price for ISIN ${isin}:`, error);
        throw error;
    }
}

/**
 * Fetch prices for multiple ISINs concurrently
 */
export async function fetchPricesForInvestments(
    investments: Investment[]
): Promise<void> { // We handle state updates in the context, but this helps batch if needed
    // This function is kept for compatibility but the Context iterates individually usually.
    // Implementation moved to Context to handle state updates properly.
}

/**
 * Fetch detailed history for a fund by ISIN
 */
export async function fetchFundHistory(isin: string): Promise<{ date: string; value: number }[]> {
    try {
        const response = await fetch(`/api/fund-details?isin=${encodeURIComponent(isin)}`);

        if (!response.ok) {
            // Silently fail or return empty on error to avoid breaking the app loop
            console.warn(`Failed to fetch history for ISIN ${isin}`);
            return [];
        }

        const data = await response.json();
        return data.history || [];
    } catch (error) {
        console.error(`Error fetching history for ISIN ${isin}:`, error);
        return [];
    }
}
