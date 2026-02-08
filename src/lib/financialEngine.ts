/**
 * Financial Calculation Engine
 * Dedicated logic for processing DB-sourced financial data.
 */

export interface PerformanceMetrics {
    '1M': number | null;
    '3M': number | null;
    '6M': number | null;
    '1Y': number | null;
    'YTD': number | null;
    'Total': number | null;
}

/**
 * Calculates return metrics based on historical price data.
 * Formula: ((Current_Price / Past_Price) - 1) * 100
 * Returns null if data for a specific period is missing.
 */
export function getPerformanceMetrics(history: { date: string; price: number }[]): PerformanceMetrics {
    if (!history || history.length < 2) {
        return {
            '1M': null,
            '3M': null,
            '6M': null,
            '1Y': null,
            'YTD': null,
            'Total': null
        };
    }

    // Ensure history is sorted by date (ascending)
    const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const currentEntry = sortedHistory[sortedHistory.length - 1];
    const currentPrice = Number(currentEntry.price);
    const currentDate = new Date(currentEntry.date);

    // Helper to find price N days ago (or closest valid date BEFORE target)
    const getPriceDaysAgo = (days: number): number | null => {
        const targetDate = new Date(currentDate);
        targetDate.setDate(targetDate.getDate() - days);
        const targetTime = targetDate.getTime();

        // Search backwards from the end
        for (let i = sortedHistory.length - 1; i >= 0; i--) {
            const entryDate = new Date(sortedHistory[i].date);
            // We want the price on the exact date or the most recent close BEFORE that date
            if (entryDate.getTime() <= targetTime) {
                // However, if the gap is too large (e.g., more than 10 days missing), we might consider it "missing data"
                // For now, strict adherence to finding a past reference point.
                return Number(sortedHistory[i].price);
            }
        }
        return null;
    };

    // Helper for YTD (Jan 1st of current year)
    const getPriceYTD = (): number | null => {
        const currentYear = currentDate.getFullYear();
        const startOfYear = new Date(currentYear, 0, 1).getTime();

        // Find closest point to Jan 1st (could be Dec 31st of prev year ideally, or first trading day of year)
        // Usually YTD is from Dec 31st prev year close.
        const prevYearClose = new Date(currentYear - 1, 11, 31).getTime();

        for (let i = sortedHistory.length - 1; i >= 0; i--) {
             const entryTime = new Date(sortedHistory[i].date).getTime();
             if (entryTime <= prevYearClose) { // Found a price from end of last year
                 return Number(sortedHistory[i].price);
             }
        }
        // Fallback: If no data from last year, maybe use first available data of this year? 
        // Standard definition is usually vs end of last year. If start date is this year, YTD is from inception?
        // Let's stick to null if strict YTD reference is missing, or first of year.
        // Prompt says "Si faltan datos para un periodo, devolver null".
        return null; 
    };

    const calcReturn = (pastPrice: number | null): number | null => {
        if (pastPrice === null || pastPrice === 0) return null;
        return ((currentPrice / pastPrice) - 1) * 100;
    };

    const firstPrice = Number(sortedHistory[0].price);

    return {
        '1M': calcReturn(getPriceDaysAgo(30)),
        '3M': calcReturn(getPriceDaysAgo(90)),
        '6M': calcReturn(getPriceDaysAgo(180)),
        '1Y': calcReturn(getPriceDaysAgo(365)),
        'YTD': calcReturn(getPriceYTD()),
        'Total': calcReturn(firstPrice)
    };
}
