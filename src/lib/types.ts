export interface Investment {
    id: string;
    name: string;
    isin: string;
    shares: number;
    initialInvestment: number;
    purchaseDate: string; // ISO Date string YYYY-MM-DD
    currentPrice?: number;
    dailyChangePercent?: number;
    symbol?: string;
    priceError?: boolean;
    lastUpdated?: Date;
    historicalData?: { date: string; value: number }[];
    targetWeight?: number; // Target weight in percentage (0-100)
    assetClass?: 'Equity' | 'Fixed Income' | 'Real Estate' | 'Commodity' | 'Cash' | 'Crypto';
    region?: 'Global' | 'North America' | 'Europe' | 'Emerging Markets' | 'Asia Pacific' | 'Japan';
}

export interface Transaction {
    id: string;
    investmentId?: string;
    type: 'BUY' | 'SELL' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAWAL';
    date: string;
    shares: number;
    price: number;
    amount: number;
    currency: string;
    assetName?: string;
    isin?: string;
}

export interface HistoryEntry {
    date: string; // ISO Date string YYYY-MM-DD
    totalValue: number;
    totalInvested: number;
    totalGain: number; // For performance tracking
}

export interface PortfolioSummary {
    totalValue: number;
    totalInvested: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
    dayChange?: number; // Total value change today in currency
    dayChangePercent?: number; // Total value change today in %
    xirr?: number; // Annualized internal rate of return (%)
}

export interface ChartDataPoint {
    date: string;
    value: number;
}

// Extended fund details - Focus on raw data and internal calculations
export interface FundDetails {
    isin: string;
    name?: string;
    provider?: string;
    currency?: string;
    launchDate?: string;
    history: ChartDataPoint[];
    composition?: {
        holdings?: { name: string; weight: number; symbol?: string }[] | null;
        sectors?: { name: string; weight: number }[] | null;
        regions?: { name: string; weight: number }[] | null;
        allocation?: { name: string; weight: number }[] | null;
    };

    // Optional metrics (calculated internally)
    metrics?: {
        performance: Record<string, number>; // 1M, 3M, 6M, 1Y, YTD, Total
        cumulativeReturn: number;
        annualizedReturn: number;
        volatility: number;
        maxDrawdown: number;
    };

    lastUpdate?: string;
}
