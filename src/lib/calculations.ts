import { Investment, PortfolioSummary, HistoryEntry } from './types';

/**
 * Calculate the current value of an investment
 */
export function calculateCurrentValue(investment: Investment): number {
    if (!investment.currentPrice) return 0;
    return investment.shares * investment.currentPrice;
}

/**
 * Calculate gain/loss for an investment
 */
export function calculateGainLoss(investment: Investment): {
    amount: number;
    percentage: number;
} {
    const currentValue = calculateCurrentValue(investment);
    const amount = currentValue - investment.initialInvestment;
    const percentage = investment.initialInvestment > 0
        ? (amount / investment.initialInvestment) * 100
        : 0;

    const normalizeZero = (n: number) => (n === 0 ? 0 : n);

    return {
        amount: normalizeZero(Math.round(amount * 100) / 100),
        percentage: normalizeZero(Math.round(percentage * 100) / 100),
    };
}

/**
 * Calculate portfolio summary from all investments
 */
export function calculatePortfolioSummary(
    investments: Investment[],
    history: HistoryEntry[] = []
): PortfolioSummary {
    const totalInvested = investments.reduce(
        (sum, inv) => sum + inv.initialInvestment,
        0
    );

    const totalValue = investments.reduce(
        (sum, inv) => sum + calculateCurrentValue(inv),
        0
    );

    const totalGainLoss = totalValue - totalInvested;
    const totalGainLossPercent = totalInvested > 0
        ? (totalGainLoss / totalInvested) * 100
        : 0;

    // Calculate daily changes using history
    // Find yesterday's entry
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // In a real app we'd look for exactly yesterday, but here we look for the last entry that isn't today
    const previousEntries = history.filter(h => h.date !== today);
    const lastEntry = previousEntries.length > 0 ? previousEntries[previousEntries.length - 1] : null;

    let dayChange = 0;
    let dayChangePercent = 0;

    if (lastEntry) {
        dayChange = totalValue - lastEntry.totalValue;
        dayChangePercent = lastEntry.totalValue > 0
            ? (dayChange / lastEntry.totalValue) * 100
            : 0;
    } else {
        // Fallback: use today's individual stock changes if available
        let weightedChangeSum = 0;
        let totalCurrentVal = 0; // Only for stocks with change data

        investments.forEach(inv => {
            if (inv.dailyChangePercent !== undefined && inv.currentPrice) {
                const val = calculateCurrentValue(inv);
                const changeAmount = val - (val / (1 + inv.dailyChangePercent / 100));
                weightedChangeSum += changeAmount;
                totalCurrentVal += val;
            }
        });

        dayChange = weightedChangeSum;
        // Approximation for total portfolio change
        dayChangePercent = totalValue > 0 ? (dayChange / totalValue) * 100 : 0;
    }

    const normalizeZero = (n: number) => (n === 0 ? 0 : n);

    // Calculate XIRR
    const xirr = calculatePortfolioXIRR(investments);

    return {
        totalValue: normalizeZero(Math.round(totalValue * 100) / 100),
        totalInvested: normalizeZero(Math.round(totalInvested * 100) / 100),
        totalGainLoss: normalizeZero(Math.round(totalGainLoss * 100) / 100),
        totalGainLossPercent: normalizeZero(Math.round(totalGainLossPercent * 100) / 100),
        dayChange: normalizeZero(Math.round(dayChange * 100) / 100),
        dayChangePercent: normalizeZero(Math.round(dayChangePercent * 100) / 100),
        xirr: xirr !== undefined ? normalizeZero(Math.round(xirr * 100) / 100) : undefined,
    };
}

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
    }).format(value);
}

/**
 * Format percentage value
 */
export function formatPercentage(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}

/**
 * Reconstructs the full portfolio history by aggregating individual investment histories.
 * Handles interpolation for missing dates and respects purchase dates.
 */
export function reconstructPortfolioHistory(investments: Investment[]): HistoryEntry[] {
    if (investments.length === 0) return [];

    // 1. Determine the global start date (earliest purchase date)
    const startDates = investments.map(inv => new Date(inv.purchaseDate).getTime());
    const minDateTs = Math.min(...startDates);
    const startDate = new Date(minDateTs);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If start date is in the future (invalid), return empty or just today
    if (startDate > today) return [];

    const history: HistoryEntry[] = [];
    const currentDate = new Date(startDate);

    // Helper to find closest price for an investment at a given date
    const getPriceAtDate = (inv: Investment, dateStr: string): number => {
        if (!inv.historicalData || inv.historicalData.length === 0) {
            // Fallback: use current price if no history available
            // Ideally should try to find something reasonable, but current price is a safe fallback for "now"
            // For past dates, this might distort, but we have no choice if data is missing.
            return inv.currentPrice || 0;
        }

        // Find exact match
        const exact = inv.historicalData.find(h => areDatesSame(h.date, dateStr));
        if (exact) return exact.value;

        // Find closest previous date (Interpolation/Hold previous)
        // Assumes historicalData is somewhat sorted, but we can filter
        const targetTs = new Date(dateStr).getTime();

        // Filter for points before or on target date
        const validPoints = inv.historicalData
            .filter(h => new Date(h.date).getTime() <= targetTs)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Descending

        if (validPoints.length > 0) return validPoints[0].value;

        // If date is before all history, use the earliest history point? 
        // Or assume purchase price? 
        // For simplicity and preventing huge jumps, use the earliest available data point
        // But strictly, we shouldn't have bought it yet if date < purchase, so this case is handled by ownership check
        // However, if we bought it, but history only starts later, use earliest history.
        return inv.historicalData[inv.historicalData.length - 1].value; // Assumes chronological or we re-sort?
        // Let's safe sort historicalData once in context or here.
    };

    const normalizeZero = (n: number) => (n === 0 ? 0 : n);

    // Iterate day by day from start to today
    // Optimization: For very long spans, we might want to skip, but requirement says "Detect automatically... avoid saturation".
    // We generate full daily history here, and UI component aggregates.

    while (currentDate <= today) {
        const dateStr = currentDate.toISOString().split('T')[0];
        let totalValue = 0;
        let totalInvested = 0;

        investments.forEach(inv => {
            // Check ownership
            if (new Date(inv.purchaseDate) <= currentDate) {
                const price = getPriceAtDate(inv, dateStr);
                totalValue += inv.shares * price;
                totalInvested += inv.initialInvestment; // Simplifying: invested amount is full amount once purchased
            }
        });

        const totalGain = totalValue - totalInvested;

        history.push({
            date: dateStr,
            totalValue: normalizeZero(Math.round(totalValue * 100) / 100),
            totalInvested: normalizeZero(Math.round(totalInvested * 100) / 100),
            totalGain: normalizeZero(Math.round(totalGain * 100) / 100)
        });

        currentDate.setDate(currentDate.getDate() + 1);
    }

    return history;
}

/**
 * Calculate financial metrics for a fund based on its historical NAV.
 */
export function calculateFundMetrics(history: { date: string; value: number }[]) {
    if (history.length < 2) return null;

    const latest = history[history.length - 1];
    const first = history[0];
    const latestDate = new Date(latest.date);

    // Helper to find value at a specific date or strictly before it
    const getValueAtDate = (daysAgo: number | null, ytd: boolean = false) => {
        let targetDate = new Date(latestDate);

        if (ytd) {
            targetDate = new Date(targetDate.getFullYear(), 0, 1); // Jan 1st of current year
        } else if (daysAgo !== null) {
            targetDate.setDate(targetDate.getDate() - daysAgo);
        }

        const targetTs = targetDate.getTime();

        // Find the closest point ON or BEFORE the target date
        // History is sorted ascending by default, so we reverse to find the latest point <= target
        const point = [...history]
            .reverse()
            .find(h => new Date(h.date).getTime() <= targetTs);

        return point ? point.value : null;
    };

    const calcReturn = (current: number, past: number | null) => {
        if (past === null || past === 0) return 0;
        return ((current - past) / past) * 100;
    };

    // Performance map
    const performance: Record<string, number> = {};
    const periods = [
        { label: '1M', days: 30 },
        { label: '3M', days: 90 },
        { label: '6M', days: 180 },
        { label: '1Y', days: 365 },
    ];

    periods.forEach(p => {
        const pastVal = getValueAtDate(p.days);
        // Only set if we actually found a past value (avoid 0% if data is missing)
        if (pastVal !== null) {
            performance[p.label] = calcReturn(latest.value, pastVal);
        }
    });

    // YTD
    const ytdVal = getValueAtDate(null, true);
    if (ytdVal !== null) {
        performance['YTD'] = calcReturn(latest.value, ytdVal);
    }

    // Total
    performance['Total'] = calcReturn(latest.value, first.value);

    // Cumulative Return
    const cumulativeReturn = performance['Total'];

    // Annualized Return (CAGR)
    const daysDiff = (new Date(latest.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24);
    const yearsDiff = daysDiff / 365.25;
    const annualizedReturn = yearsDiff > 0
        ? (Math.pow(latest.value / first.value, 1 / yearsDiff) - 1) * 100
        : cumulativeReturn;

    // Annualized Volatility
    const dailyReturns = [];
    for (let i = 1; i < history.length; i++) {
        const ret = Math.log(history[i].value / history[i - 1].value);
        dailyReturns.push(ret);
    }

    const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (dailyReturns.length - 1);
    const stdDev = Math.sqrt(variance);
    const volatility = stdDev * Math.sqrt(252) * 100; // Annualized

    // Max Drawdown
    let maxDrawdown = 0;
    let peak = history[0].value;
    history.forEach(h => {
        if (h.value > peak) peak = h.value;
        const dd = (h.value - peak) / peak;
        if (dd < maxDrawdown) maxDrawdown = dd;
    });

    return {
        performance,
        cumulativeReturn,
        annualizedReturn,
        volatility,
        maxDrawdown: Math.abs(maxDrawdown * 100)
    };
}

/**
 * Filter and aggregate fund history based on preset ranges (DIA, MES, AÑO, ALL)
 * to avoid chart saturation and provide clear trends.
 */
export function filterFundHistory(
    history: { date: string; value: number }[],
    range: 'DIA' | 'MES' | 'AÑO' | 'ALL'
) {
    if (!history || history.length === 0) return [];

    // Ensure sorted chronological
    const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latestDate = new Date(sorted[sorted.length - 1].date);

    switch (range) {
        case 'DIA':
            // Rule: Last 30 real data points
            return sorted.slice(-30);

        case 'MES': {
            // Rule: From Jan 1st of current year to Now (YTD view)
            const startOfYear = new Date(latestDate.getFullYear(), 0, 1);
            return sorted.filter(h => new Date(h.date) >= startOfYear);
        }

        case 'AÑO': {
            // Rule: Last 365 days, grouped by Month End
            const oneYearAgo = new Date(latestDate);
            oneYearAgo.setDate(oneYearAgo.getDate() - 365);

            const lastYearData = sorted.filter(h => new Date(h.date) >= oneYearAgo);

            // Group by month
            const monthly: { date: string; value: number }[] = [];
            const months: Record<string, { date: string; value: number }[]> = {};

            lastYearData.forEach(h => {
                const d = new Date(h.date);
                const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
                if (!months[key]) months[key] = [];
                months[key].push(h);
            });

            Object.values(months).forEach(group => {
                monthly.push(group[group.length - 1]);
            });

            return monthly;
        }

        case 'ALL': {
            // Rule: Full history, grouped by Month End
            const monthly: { date: string; value: number }[] = [];
            const months: Record<string, { date: string; value: number }[]> = {};

            sorted.forEach(h => {
                const d = new Date(h.date);
                const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
                if (!months[key]) months[key] = [];
                months[key].push(h);
            });

            Object.values(months).forEach(group => {
                monthly.push(group[group.length - 1]);
            });

            return monthly;
        }

        default:
            return sorted;
    }
}

/**
 * Aggregate history for chart views (legacy support)
 */
export function aggregateHistory(history: { date: string; value: number }[], interval: 'daily' | 'monthly' | 'annual') {
    if (interval === 'daily') return history;

    const aggregated: { date: string; value: number }[] = [];
    const groups: Record<string, { date: string; value: number }[]> = {};

    history.forEach(h => {
        const date = new Date(h.date);
        const key = interval === 'monthly'
            ? `${date.getFullYear()}-${date.getMonth()}`
            : `${date.getFullYear()}`;

        if (!groups[key]) groups[key] = [];
        groups[key].push(h);
    });

    Object.values(groups).forEach(group => {
        aggregated.push(group[group.length - 1]);
    });

    return aggregated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Helper for date comparison
function areDatesSame(d1: string, d2: string) {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();
}

// ============================================================================
// ADVANCED RISK METRICS (Alpha, Beta, Sharpe Ratio)
// Used when Yahoo Finance API doesn't provide these metrics
// ============================================================================

/**
 * Calculate daily logarithmic returns from price history
 * Log returns are additive and better for statistical analysis
 */
function calculateDailyLogReturns(history: { date: string; value: number }[]): number[] {
    if (history.length < 2) return [];

    const returns: number[] = [];
    for (let i = 1; i < history.length; i++) {
        const ret = Math.log(history[i].value / history[i - 1].value);
        returns.push(ret);
    }

    return returns;
}

/**
 * Calculate mean (average) of an array of numbers
 */
function calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate standard deviation of an array of numbers
 */
function calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = calculateMean(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
    return Math.sqrt(variance);
}

/**
 * Calculate covariance between two arrays
 */
function calculateCovariance(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;

    const meanX = calculateMean(x);
    const meanY = calculateMean(y);

    let sum = 0;
    for (let i = 0; i < x.length; i++) {
        sum += (x[i] - meanX) * (y[i] - meanY);
    }

    return sum / (x.length - 1);
}

/**
 * Calculate Beta (sensitivity to market/benchmark)
 * Beta = Covariance(Fund, Benchmark) / Variance(Benchmark)
 * 
 * @param fundHistory - Fund price history
 * @param benchmarkHistory - Benchmark price history (e.g., SPY)
 * @returns Beta value (1.0 = same volatility as market)
 */
export function calculateBeta(
    fundHistory: { date: string; value: number }[],
    benchmarkHistory: { date: string; value: number }[]
): number | undefined {
    if (fundHistory.length < 30 || benchmarkHistory.length < 30) {
        // Not enough data for reliable calculation
        return undefined;
    }

    // Align dates (only use dates that exist in both datasets)
    const fundMap = new Map(fundHistory.map(h => [h.date, h.value]));
    const benchmarkMap = new Map(benchmarkHistory.map(h => [h.date, h.value]));

    const commonDates = fundHistory
        .map(h => h.date)
        .filter(date => benchmarkMap.has(date))
        .sort();

    if (commonDates.length < 30) {
        return undefined; // Not enough overlapping data
    }

    // Calculate returns for common dates
    const fundReturns: number[] = [];
    const benchmarkReturns: number[] = [];

    for (let i = 1; i < commonDates.length; i++) {
        const prevDate = commonDates[i - 1];
        const currDate = commonDates[i];

        const fundPrev = fundMap.get(prevDate)!;
        const fundCurr = fundMap.get(currDate)!;
        const benchPrev = benchmarkMap.get(prevDate)!;
        const benchCurr = benchmarkMap.get(currDate)!;

        fundReturns.push(Math.log(fundCurr / fundPrev));
        benchmarkReturns.push(Math.log(benchCurr / benchPrev));
    }

    // Beta = Cov(fund, benchmark) / Var(benchmark)
    const covariance = calculateCovariance(fundReturns, benchmarkReturns);
    const benchmarkVariance = Math.pow(calculateStdDev(benchmarkReturns), 2);

    if (benchmarkVariance === 0) return undefined;

    return covariance / benchmarkVariance;
}

/**
 * Calculate Alpha (excess return vs benchmark)
 * Alpha = Fund Return - (Risk Free Rate + Beta × (Benchmark Return - Risk Free Rate))
 * 
 * @param fundHistory - Fund price history
 * @param benchmarkHistory - Benchmark price history
 * @param riskFreeRate - Annual risk-free rate (default 3%)
 * @returns Alpha value (annualized percentage)
 */
export function calculateAlpha(
    fundHistory: { date: string; value: number }[],
    benchmarkHistory: { date: string; value: number }[],
    riskFreeRate: number = 0.03 // 3% default
): number | undefined {
    if (fundHistory.length < 2 || benchmarkHistory.length < 2) {
        return undefined;
    }

    // Calculate Beta first
    const beta = calculateBeta(fundHistory, benchmarkHistory);
    if (beta === undefined) return undefined;

    // Calculate annualized returns
    const fundFirst = fundHistory[0].value;
    const fundLast = fundHistory[fundHistory.length - 1].value;
    const fundDays = (new Date(fundHistory[fundHistory.length - 1].date).getTime() -
        new Date(fundHistory[0].date).getTime()) / (1000 * 60 * 60 * 24);
    const fundYears = fundDays / 365.25;
    const fundReturn = fundYears > 0 ? (Math.pow(fundLast / fundFirst, 1 / fundYears) - 1) : 0;

    const benchFirst = benchmarkHistory[0].value;
    const benchLast = benchmarkHistory[benchmarkHistory.length - 1].value;
    const benchDays = (new Date(benchmarkHistory[benchmarkHistory.length - 1].date).getTime() -
        new Date(benchmarkHistory[0].date).getTime()) / (1000 * 60 * 60 * 24);
    const benchYears = benchDays / 365.25;
    const benchReturn = benchYears > 0 ? (Math.pow(benchLast / benchFirst, 1 / benchYears) - 1) : 0;

    // Alpha = R_fund - (R_f + β × (R_bench - R_f))
    const alpha = fundReturn - (riskFreeRate + beta * (benchReturn - riskFreeRate));

    return alpha * 100; // Return as percentage
}

/**
 * Calculate Sharpe Ratio (risk-adjusted return)
 * Sharpe = (Return - Risk Free Rate) / Standard Deviation
 * 
 * @param history - Fund price history
 * @param riskFreeRate - Annual risk-free rate (default 3%)
 * @returns Sharpe ratio (higher is better, >1.0 is good)
 */
export function calculateSharpeRatio(
    history: { date: string; value: number }[],
    riskFreeRate: number = 0.03 // 3% default
): number | undefined {
    if (history.length < 2) return undefined;

    // Calculate annualized return
    const first = history[0].value;
    const last = history[history.length - 1].value;
    const days = (new Date(history[history.length - 1].date).getTime() -
        new Date(history[0].date).getTime()) / (1000 * 60 * 60 * 24);
    const years = days / 365.25;
    const annualizedReturn = years > 0 ? (Math.pow(last / first, 1 / years) - 1) : 0;

    // Calculate annualized volatility
    const dailyReturns = calculateDailyLogReturns(history);
    const dailyStdDev = calculateStdDev(dailyReturns);
    const annualizedVolatility = dailyStdDev * Math.sqrt(252); // 252 trading days

    if (annualizedVolatility === 0) return undefined;

    // Sharpe = (Return - RiskFreeRate) / Volatility
    return (annualizedReturn - riskFreeRate) / annualizedVolatility;
}

/**
 * Calculate all advanced risk metrics at once
 * Returns calculated metrics only if API didn't provide them
 * 
 * @param fundHistory - Fund price history
 * @param benchmarkHistory - Optional benchmark for Alpha/Beta
 * @param riskFreeRate - Annual risk-free rate (default 3%)
 */
export function calculateAdvancedRiskMetrics(
    fundHistory: { date: string; value: number }[],
    benchmarkHistory?: { date: string; value: number }[],
    riskFreeRate: number = 0.03
): {
    alpha3y?: number;
    beta3y?: number;
    sharpe3y?: number;
    calculated: boolean; // Flag to indicate these are calculated, not from API
} {
    const metrics: {
        alpha3y?: number;
        beta3y?: number;
        sharpe3y?: number;
        calculated: boolean;
    } = { calculated: true };

    // Calculate Sharpe (always possible with just fund history)
    const sharpe = calculateSharpeRatio(fundHistory, riskFreeRate);
    if (sharpe !== undefined) {
        metrics.sharpe3y = sharpe;
    }

    // Calculate Beta and Alpha if benchmark provided
    if (benchmarkHistory && benchmarkHistory.length > 30) {
        const beta = calculateBeta(fundHistory, benchmarkHistory);
        if (beta !== undefined) {
            metrics.beta3y = beta;
        }

        const alpha = calculateAlpha(fundHistory, benchmarkHistory, riskFreeRate);
        if (alpha !== undefined) {
            metrics.alpha3y = alpha;
        }
    }

    return metrics;
}


// ============================================================================
// XIRR CALCULATION (Extended Internal Rate of Return)
// ============================================================================

interface CashFlow {
    date: Date;
    amount: number;
}

/**
 * Calculates XIRR using Newton-Raphson method.
 * Equation: sum(cf_i / (1 + r)^((d_i - d_0) / 365)) = 0
 * 
 * @param flows - Array of cash flows {date, amount}
 * @param guess - Initial guess for the rate (default 0.1 / 10%)
 */
export function calculateXIRR(flows: CashFlow[], guess: number = 0.1): number | undefined {
    if (flows.length < 2) return undefined;

    // Sort flows by date
    const sortedFlows = [...flows].sort((a, b) => a.date.getTime() - b.date.getTime());
    const d0 = sortedFlows[0].date;

    // Function to calculate Net Present Value
    const npv = (rate: number) => {
        return sortedFlows.reduce((sum, flow) => {
            const days = (flow.date.getTime() - d0.getTime()) / (1000 * 60 * 60 * 24);
            return sum + flow.amount / Math.pow(1 + rate, days / 365);
        }, 0);
    };

    // Derivative of NPV for Newton-Raphson
    const dNpv = (rate: number) => {
        return sortedFlows.reduce((sum, flow) => {
            const days = (flow.date.getTime() - d0.getTime()) / (1000 * 60 * 60 * 24);
            if (days === 0) return sum;
            return sum - (days / 365) * flow.amount * Math.pow(1 + rate, -(days / 365) - 1);
        }, 0);
    };

    let rate = guess;
    const maxIterations = 100;
    const precision = 0.000001;

    for (let i = 0; i < maxIterations; i++) {
        const value = npv(rate);
        const derivative = dNpv(rate);

        if (Math.abs(derivative) < precision) break;

        const nextRate = rate - value / derivative;
        if (Math.abs(nextRate - rate) < precision) return nextRate * 100; // Return as percentage

        rate = nextRate;

        // Safety break for extreme values
        if (Math.abs(rate) > 100) break;
    }

    // If Newton-Raphson fails, try a simple bisection as fallback or return 0
    return rate * 100;
}

/**
 * Helper to calculate XIRR for the entire portfolio
 */
export function calculatePortfolioXIRR(investments: Investment[]): number | undefined {
    if (investments.length === 0) return undefined;

    const flows: CashFlow[] = [];
    let totalCurrentValue = 0;

    investments.forEach(inv => {
        // 1. Initial Investment (Negative Flow)
        flows.push({
            date: new Date(inv.purchaseDate),
            amount: -inv.initialInvestment
        });

        // 2. Accumulate current value for the final positive flow
        totalCurrentValue += calculateCurrentValue(inv);
    });

    // 3. Final Flow (Positive, today's value)
    if (totalCurrentValue > 0) {
        flows.push({
            date: new Date(),
            amount: totalCurrentValue
        });
    }

    return calculateXIRR(flows);
}
