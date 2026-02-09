#!/usr/bin/env node

/**
 * Yahoo Finance quoteSummary API Module Explorer
 * 
 * This script tests ALL available modules from Yahoo Finance quoteSummary API
 * to discover what data is available for mutual funds and ETFs.
 * 
 * Documentation:
 * - quoteSummary endpoint: https://query1.finance.yahoo.com/v10/finance/quoteSummary/{SYMBOL}
 * - Known modules: https://github.com/ranaroussi/yfinance/blob/main/yfinance/scrapers/quote.py
 */

// List of all known Yahoo Finance quoteSummary modules
const ALL_MODULES = [
    // Basic info modules
    'assetProfile',
    'summaryProfile', 
    'summaryDetail',
    'esgScores',
    'price',
    'quoteType',
    'calendarEvents',
    
    // Financial data modules
    'defaultKeyStatistics',
    'financialData',
    'incomeStatementHistory',
    'incomeStatementHistoryQuarterly',
    'cashflowStatementHistory',
    'cashflowStatementHistoryQuarterly',
    'balanceSheetHistory',
    'balanceSheetHistoryQuarterly',
    'earnings',
    'earningsHistory',
    'earningsTrend',
    
    // Fund-specific modules (IMPORTANT!)
    'fundProfile',
    'fundPerformance',
    'topHoldings',
    'fundOwnership',
    
    // Stock ownership modules
    'institutionOwnership',
    'majorHoldersBreakdown',
    'insiderHolders',
    'insiderTransactions',
    'netSharePurchaseActivity',
    
    // Recommendations & estimates
    'recommendationTrend',
    'upgradeDowngradeHistory',
    'indexTrend',
    'sectorTrend',
    'industryTrend',
    
    // Other modules
    'pageViews',
    'secFilings',
];

// Test symbols - mix of ETFs and mutual funds
const TEST_SYMBOLS = [
    'VWCE.DE',          // Vanguard FTSE All-World UCITS ETF (EUR)
    'IWDA.AS',          // iShares Core MSCI World UCITS ETF (EUR)
    'SPY',              // SPDR S&P 500 ETF (USD)
    '0P00012I6Q.F',     // iShares MSCI World Mutual Fund (Frankfurt)
];

/**
 * Fetch quoteSummary data for a specific symbol with specified modules
 */
async function fetchQuoteSummary(symbol, modules) {
    const modulesParam = modules.join(',');
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modulesParam}`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (!response.ok) {
            return { error: `HTTP ${response.status}`, symbol, modules };
        }
        
        const data = await response.json();
        
        if (!data.quoteSummary || !data.quoteSummary.result) {
            return { error: 'No result data', symbol, modules };
        }
        
        return data.quoteSummary.result[0];
    } catch (error) {
        return { error: error.message, symbol, modules };
    }
}

/**
 * Test a single module for a symbol and report findings
 */
async function testModule(symbol, moduleName) {
    const result = await fetchQuoteSummary(symbol, [moduleName]);
    
    if (result.error) {
        return { module: moduleName, status: 'ERROR', error: result.error };
    }
    
    const moduleData = result[moduleName];
    
    if (!moduleData) {
        return { module: moduleName, status: 'NOT_AVAILABLE' };
    }
    
    // Count available fields
    const fields = Object.keys(moduleData);
    const nonEmptyFields = fields.filter(key => {
        const value = moduleData[key];
        return value !== null && 
               value !== undefined && 
               (typeof value !== 'object' || Object.keys(value).length > 0);
    });
    
    return {
        module: moduleName,
        status: 'AVAILABLE',
        fieldCount: fields.length,
        nonEmptyFieldCount: nonEmptyFields.length,
        fields: nonEmptyFields.slice(0, 10) // Show first 10 fields
    };
}

/**
 * Main testing function
 */
async function testAllModules() {
    console.log('='.repeat(80));
    console.log('Yahoo Finance quoteSummary API - Module Explorer');
    console.log('='.repeat(80));
    console.log('');
    
    for (const symbol of TEST_SYMBOLS) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`Testing Symbol: ${symbol}`);
        console.log('='.repeat(80));
        
        const results = {
            available: [],
            unavailable: [],
            errors: []
        };
        
        for (const moduleName of ALL_MODULES) {
            const result = await testModule(symbol, moduleName);
            
            if (result.status === 'AVAILABLE') {
                results.available.push(result);
            } else if (result.status === 'NOT_AVAILABLE') {
                results.unavailable.push(result);
            } else {
                results.errors.push(result);
            }
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`\n✅ AVAILABLE MODULES (${results.available.length}):`);
        console.log('-'.repeat(80));
        results.available.forEach(r => {
            console.log(`  ${r.module.padEnd(35)} | Fields: ${r.nonEmptyFieldCount}/${r.fieldCount}`);
            if (r.module.includes('top') || r.module.includes('Holdings') || 
                r.module.includes('Performance') || r.module.includes('Profile')) {
                console.log(`    → Sample fields: ${r.fields.join(', ')}`);
            }
        });
        
        console.log(`\n❌ UNAVAILABLE MODULES (${results.unavailable.length}):`);
        console.log('-'.repeat(80));
        const unavailableNames = results.unavailable.map(r => r.module).join(', ');
        console.log(`  ${unavailableNames}`);
        
        if (results.errors.length > 0) {
            console.log(`\n⚠️  ERROR MODULES (${results.errors.length}):`);
            console.log('-'.repeat(80));
            results.errors.forEach(r => {
                console.log(`  ${r.module}: ${r.error}`);
            });
        }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('Deep Dive: Fund-Specific Modules');
    console.log('='.repeat(80));
    
    // Test fund-specific modules in detail for one symbol
    const testSymbol = '0P00012I6Q.F'; // Mutual fund
    const fundModules = ['topHoldings', 'fundProfile', 'fundPerformance', 'fundOwnership'];
    
    for (const moduleName of fundModules) {
        console.log(`\n--- Module: ${moduleName} ---`);
        const result = await fetchQuoteSummary(testSymbol, [moduleName]);
        
        if (result.error) {
            console.log(`  ❌ Error: ${result.error}`);
            continue;
        }
        
        const moduleData = result[moduleName];
        if (!moduleData) {
            console.log(`  ❌ Not available for ${testSymbol}`);
            continue;
        }
        
        console.log('  ✅ Data structure:');
        console.log(JSON.stringify(moduleData, null, 2));
    }
}

// Run the tests
testAllModules().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
