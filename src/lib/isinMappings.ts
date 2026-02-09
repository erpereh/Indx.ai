/**
 * ISIN to US Ticker Mapping Dictionary
 * 
 * Maps European/International ISINs to their US-listed equivalents
 * Used as fallback when European symbols have incomplete data in Yahoo Finance
 * 
 * Why? Yahoo Finance US API has better data coverage for US-listed ETFs
 * 
 * Usage:
 * - If ISIN "IE00B4L5Y983" (VWCE in Frankfurt) has no holdings data
 * - Try US equivalent "VT" (Vanguard Total World) which has complete data
 */

export const ISIN_TO_US_TICKER: Record<string, string> = {
    // ========================================
    // WORLD/GLOBAL EQUITY FUNDS
    // ========================================
    
    // Vanguard Total World Stock ETF
    'IE00B3RBWM25': 'VT',      // VT (exact same fund, US listing)
    'IE00BK5BQT80': 'VT',      // VWRL (Vanguard FTSE All-World) → VT equivalent
    'IE00B4L5Y983': 'VT',      // VWCE (Vanguard FTSE All-World EUR) → VT equivalent
    
    // iShares MSCI World ETFs
    'IE000ZYRH0Q7': 'URTH',    // iShares MSCI World → URTH (US equivalent)
    'IE00B0M62Q58': 'URTH',    // iShares MSCI World (various listings) → URTH
    
    // MSCI ACWI (All Country World Index)
    'IE00B6R52259': 'ACWI',    // iShares MSCI ACWI → ACWI (US)
    'IE00B44Z5B48': 'ACWI',    // Alternative ACWI listing
    
    // ========================================
    // DEVELOPED MARKETS (EX-US)
    // ========================================
    
    // Vanguard Developed Markets (ex-US)
    'IE00B3X1NT05': 'VEA',     // Vanguard FTSE Developed Markets → VEA
    'IE0002XZSHO1': 'VEA',     // Alternative Vanguard Dev Markets
    
    // iShares MSCI EAFE (Europe, Australasia, Far East)
    'IE00B4L5YC18': 'IEFA',    // iShares Core MSCI EAFE → IEFA
    'IE00B1FZS350': 'EFA',     // iShares MSCI EAFE → EFA (original)
    
    // ========================================
    // EMERGING MARKETS
    // ========================================
    
    // Vanguard Emerging Markets
    'IE00B3VVMM84': 'VWO',     // Vanguard FTSE Emerging → VWO (exact same)
    'IE00BKV0VG73': 'VWO',     // Alternative Vanguard EM listing
    
    // iShares Emerging Markets
    'IE000QAZP7L2': 'IEMG',    // iShares Core MSCI EM → IEMG
    'IE00B4L5YX21': 'EEM',     // iShares MSCI EM → EEM
    
    // ========================================
    // SMALL CAP
    // ========================================
    
    // Global Small Cap
    'IE00B42WY960': 'VSS',     // Vanguard Global Small Cap → VSS
    'IE00B42W3S00': 'VSS',     // Vanguard Global Small Cap EUR Acc → VSS (same fund, different class)
    'IE00BJ38QD84': 'SCHA',    // iShares Small Cap → SCHA
    
    // ========================================
    // S&P 500
    // ========================================
    
    // S&P 500 Trackers
    'IE00B5BMR087': 'SPY',     // iShares Core S&P 500 → SPY
    'IE0031442068': 'SPY',     // Various S&P 500 listings → SPY
    'IE0032620787': 'SPY',     // S&P 500 European listing → SPY
    'IE00B3XXRP09': 'VUAA',    // Vanguard S&P 500 EUR → VOO (US)
    'IE00B3YCGJ38': 'VOO',     // Alternative
    
    // ========================================
    // SECTOR-SPECIFIC
    // ========================================
    
    // Technology
    'IE00B3WJKG14': 'VGT',     // Vanguard IT → VGT
    'IE00B3VWLG82': 'XLK',     // Tech Select Sector → XLK
    
    // Healthcare
    'IE00B4KBBD01': 'VHT',     // Vanguard Healthcare → VHT
    
    // Financials
    'IE00B4JNQZ49': 'VFH',     // Vanguard Financials → VFH
    
    // ========================================
    // BOND FUNDS
    // ========================================
    
    // Global Aggregate Bonds
    'IE00B3VTMJ91': 'AGG',     // iShares Global Aggregate → AGG
    'IE00B1FZS244': 'BND',     // Vanguard Total Bond → BND
    
    // US Treasury Bonds
    'IE00B3VWN179': 'IEF',     // iShares 7-10Y Treasury → IEF
    'IE00B3YLTY23': 'SHY',     // iShares 1-3Y Treasury → SHY
    
    // ========================================
    // COMMODITY / ALTERNATIVE
    // ========================================
    
    // Gold
    'IE00B4ND3602': 'GLD',     // iShares Gold Trust → GLD
    'IE00B579F325': 'IAU',     // Alternative Gold ETF → IAU
    
    // Real Estate (REITs)
    'IE00B1FZS467': 'VNQ',     // Vanguard Real Estate → VNQ
};

/**
 * Get US ticker equivalent for an ISIN
 * Returns undefined if no mapping exists
 */
export function getUSTicker(isin: string): string | undefined {
    return ISIN_TO_US_TICKER[isin];
}

/**
 * Check if an ISIN has a US equivalent
 */
export function hasUSEquivalent(isin: string): boolean {
    return isin in ISIN_TO_US_TICKER;
}

/**
 * Get all supported ISINs
 */
export function getSupportedISINs(): string[] {
    return Object.keys(ISIN_TO_US_TICKER);
}
