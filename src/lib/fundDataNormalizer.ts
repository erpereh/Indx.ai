/**
 * Fund Data Normalizer for Yahoo Finance API Responses
 * 
 * Yahoo Finance returns fund data in inconsistent structures depending on:
 * - Fund type (ETF vs Mutual Fund vs Index Fund)
 * - Exchange/Region (US vs Europe vs Asia)
 * - Data availability
 * 
 * This normalizer tries multiple data sources to extract:
 * - Top Holdings
 * - Sector Weightings
 * - Geographic Distribution
 * - Asset Allocation
 * - Performance Metrics (Alpha, Beta, Sharpe)
 */

export interface NormalizedFundData {
    holdings?: Array<{
        name: string;
        symbol: string;
        weight: string; // Percentage as string (e.g., "5.23")
    }>;
    sectors?: Array<{
        name: string;
        weight: string; // Percentage as string
    }>;
    regions?: Array<{
        name: string;
        weight: string;
    }>;
    assetAllocation?: {
        stocks?: string;
        bonds?: string;
        cash?: string;
        other?: string;
    };
    equityStats?: {
        priceToEarnings?: number;
        priceToBook?: number;
        priceToSales?: number;
        medianMarketCap?: number;
    };
    bondStats?: {
        duration?: number;
        maturity?: number;
        creditQuality?: any;
    };
    performance?: {
        alpha3y?: number;
        beta3y?: number;
        sharpe3y?: number;
    };
}

/**
 * Main normalization function
 * Tries multiple data sources for each field
 */
export function normalizeFundData(quoteSummaryResult: any): NormalizedFundData {
    const normalized: NormalizedFundData = {};

    // Extract holdings
    const holdings = extractHoldings(quoteSummaryResult);
    if (holdings && holdings.length > 0) {
        normalized.holdings = holdings;
    }

    // Extract sectors
    const sectors = extractSectors(quoteSummaryResult);
    if (sectors && sectors.length > 0) {
        normalized.sectors = sectors;
    }

    // Extract regions
    const regions = extractRegions(quoteSummaryResult);
    if (regions && regions.length > 0) {
        normalized.regions = regions;
    }

    // Extract asset allocation
    const assetAllocation = extractAssetAllocation(quoteSummaryResult);
    if (assetAllocation) {
        normalized.assetAllocation = assetAllocation;
    }

    // Extract equity stats
    const equityStats = extractEquityStats(quoteSummaryResult);
    if (equityStats) {
        normalized.equityStats = equityStats;
    }

    // Extract bond stats
    const bondStats = extractBondStats(quoteSummaryResult);
    if (bondStats) {
        normalized.bondStats = bondStats;
    }

    // Extract performance metrics
    const performance = extractPerformance(quoteSummaryResult);
    if (performance) {
        normalized.performance = performance;
    }

    return normalized;
}

/**
 * Extract top holdings from multiple possible sources
 * Enhanced with detailed logging for debugging
 */
function extractHoldings(data: any): Array<{name: string, symbol: string, weight: string}> | undefined {
    console.log('[fundDataNormalizer] 🔍 Extracting holdings...');
    console.log('[fundDataNormalizer] Available sources:', {
        topHoldingsHoldings: !!data.topHoldings?.holdings,
        fundProfileHoldings: !!data.fundProfile?.holdings,
        assetProfileHoldings: !!data.assetProfile?.holdings,
    });
    
    // Try source 1: topHoldings.holdings (most common)
    const topHoldings = data.topHoldings?.holdings;
    if (topHoldings && Array.isArray(topHoldings) && topHoldings.length > 0) {
        console.log(`[fundDataNormalizer] ✅ Found ${topHoldings.length} holdings in topHoldings.holdings`);
        console.log('[fundDataNormalizer] Sample holding:', topHoldings[0]);
        
        const holdings = topHoldings.slice(0, 10).map((h: any) => {
            // Extract weight handling {raw, fmt} format or plain number
            let weight = '0.00';
            if (h.holdingPercent) {
                if (typeof h.holdingPercent === 'object' && 'raw' in h.holdingPercent) {
                    weight = (h.holdingPercent.raw * 100).toFixed(2);
                } else if (typeof h.holdingPercent === 'number') {
                    weight = (h.holdingPercent * 100).toFixed(2);
                } else {
                    weight = String(h.holdingPercent);
                }
            }
            
            return {
                name: h.holdingName || h.symbol || 'Unknown',
                symbol: h.symbol || '',
                weight
            };
        });
        
        console.log(`[fundDataNormalizer] 📦 Returning ${holdings.length} holdings from topHoldings.holdings`);
        return holdings;
    }

    // Try source 2: fundProfile.holdings
    const fundProfileHoldings = data.fundProfile?.holdings;
    if (fundProfileHoldings && Array.isArray(fundProfileHoldings) && fundProfileHoldings.length > 0) {
        console.log(`[fundDataNormalizer] ✅ Found ${fundProfileHoldings.length} holdings in fundProfile.holdings`);
        
        const holdings = fundProfileHoldings.slice(0, 10).map((h: any) => ({
            name: h.holdingName || h.name || h.symbol || 'Unknown',
            symbol: h.symbol || h.ticker || '',
            weight: h.holdingPercent ? (h.holdingPercent * 100).toFixed(2) : 
                   h.weight ? (h.weight * 100).toFixed(2) : '0.00'
        }));
        
        console.log(`[fundDataNormalizer] 📦 Returning ${holdings.length} holdings from fundProfile.holdings`);
        return holdings;
    }

    // Try source 3: assetProfile.holdings (rare)
    const assetProfileHoldings = data.assetProfile?.holdings;
    if (assetProfileHoldings && Array.isArray(assetProfileHoldings) && assetProfileHoldings.length > 0) {
        console.log(`[fundDataNormalizer] ✅ Found ${assetProfileHoldings.length} holdings in assetProfile.holdings`);
        
        const holdings = assetProfileHoldings.slice(0, 10).map((h: any) => ({
            name: h.name || h.symbol || 'Unknown',
            symbol: h.symbol || '',
            weight: h.percentage ? String(h.percentage) : '0.00'
        }));
        
        console.log(`[fundDataNormalizer] 📦 Returning ${holdings.length} holdings from assetProfile.holdings`);
        return holdings;
    }

    console.warn('[fundDataNormalizer] ⚠️ No holdings found in any source!');
    return undefined;
}

/**
 * Extract sector weightings from multiple possible sources
 * Enhanced with detailed logging for debugging
 */
function extractSectors(data: any): Array<{name: string, weight: string}> | undefined {
    console.log('[fundDataNormalizer] 🔍 Extracting sectors...');
    console.log('[fundDataNormalizer] Available sources:', {
        topHoldingsSectorWeightings: !!data.topHoldings?.sectorWeightings,
        fundProfileSectorWeightings: !!data.fundProfile?.sectorWeightings,
        equityHoldingsSectorWeightings: !!data.topHoldings?.equityHoldings?.sectorWeightings,
        assetProfileSectorWeightings: !!data.assetProfile?.sectorWeightings,
    });
    
    // Try source 1: topHoldings.sectorWeightings (array of objects)
    const topHoldingsSectors = data.topHoldings?.sectorWeightings;
    if (topHoldingsSectors && Array.isArray(topHoldingsSectors) && topHoldingsSectors.length > 0) {
        console.log(`[fundDataNormalizer] ✅ Found ${topHoldingsSectors.length} sectors in topHoldings.sectorWeightings`);
        console.log('[fundDataNormalizer] Sample sector:', topHoldingsSectors[0]);
        
        const sectors = topHoldingsSectors
            .map((sector: any) => {
                const [name, weightObj] = Object.entries(sector)[0];
                
                // Handle different weight formats:
                // 1. Object with {raw: 0.0185, fmt: '1.85%'}
                // 2. Plain number: 0.0185
                // 3. String: "0.0185"
                let weightNum: number;
                if (weightObj && typeof weightObj === 'object' && 'raw' in weightObj) {
                    weightNum = (weightObj as any).raw;
                } else if (typeof weightObj === 'number') {
                    weightNum = weightObj;
                } else {
                    weightNum = parseFloat(weightObj as string);
                }
                
                return {
                    name: translateSector(name as string),
                    weight: (weightNum * 100).toFixed(2)
                };
            })
            .filter((s: any) => parseFloat(s.weight) > 0);
        
        console.log(`[fundDataNormalizer] 📦 Returning ${sectors.length} sectors from topHoldings.sectorWeightings`);
        return sectors;
    }
    
    // Try source 2: assetProfile.sectorWeightings (object, not array)
    const assetProfileSectors = data.assetProfile?.sectorWeightings;
    if (assetProfileSectors && typeof assetProfileSectors === 'object' && !Array.isArray(assetProfileSectors)) {
        console.log(`[fundDataNormalizer] ✅ Found sectors in assetProfile.sectorWeightings (object)`);
        console.log('[fundDataNormalizer] Sector keys:', Object.keys(assetProfileSectors));
        
        const sectors = Object.entries(assetProfileSectors)
            .map(([name, weight]) => {
                const weightNum = typeof weight === 'number' ? weight : parseFloat(weight as string);
                return {
                    name: translateSector(name),
                    weight: (weightNum * 100).toFixed(2)
                };
            })
            .filter(s => parseFloat(s.weight) > 0);
        
        if (sectors.length > 0) {
            console.log(`[fundDataNormalizer] 📦 Returning ${sectors.length} sectors from assetProfile.sectorWeightings`);
            return sectors;
        }
    }

    // Try source 3: fundProfile.sectorWeightings
    const fundProfileSectors = data.fundProfile?.sectorWeightings;
    if (fundProfileSectors && Array.isArray(fundProfileSectors) && fundProfileSectors.length > 0) {
        console.log(`[fundDataNormalizer] ✅ Found ${fundProfileSectors.length} sectors in fundProfile.sectorWeightings`);
        
        const mapped = fundProfileSectors
            .map((sector: any) => {
                if (typeof sector === 'object' && sector !== null) {
                    const [name, weight] = Object.entries(sector)[0];
                    const weightNum = typeof weight === 'number' ? weight : parseFloat(weight as string);
                    return {
                        name: translateSector(name as string),
                        weight: (weightNum * 100).toFixed(2)
                    };
                }
                return null;
            })
            .filter((s: any): s is {name: string, weight: string} => s !== null && parseFloat(s.weight) > 0);
        
        if (mapped.length > 0) {
            console.log(`[fundDataNormalizer] 📦 Returning ${mapped.length} sectors from fundProfile.sectorWeightings`);
            return mapped;
        }
    }

    // Try source 4: equityHoldings.sectorWeightings (alternative structure)
    const equityHoldingsSectors = data.topHoldings?.equityHoldings?.sectorWeightings;
    if (equityHoldingsSectors && Array.isArray(equityHoldingsSectors) && equityHoldingsSectors.length > 0) {
        console.log(`[fundDataNormalizer] ✅ Found ${equityHoldingsSectors.length} sectors in equityHoldings.sectorWeightings`);
        
        const sectors = equityHoldingsSectors
            .map((sector: any) => ({
                name: sector.sectorName || sector.name || 'Unknown',
                weight: sector.weight ? (sector.weight * 100).toFixed(2) : '0.00'
            }))
            .filter((s: any) => parseFloat(s.weight) > 0);
        
        console.log(`[fundDataNormalizer] 📦 Returning ${sectors.length} sectors from equityHoldings.sectorWeightings`);
        return sectors;
    }

    console.warn('[fundDataNormalizer] ⚠️ No sectors found in any source!');
    return undefined;
}

/**
 * Extract regional distribution from multiple possible sources
 */
function extractRegions(data: any): Array<{name: string, weight: string}> | undefined {
    // Try source 1: topHoldings.regionWeightings
    const topHoldingsRegions = data.topHoldings?.regionWeightings;
    if (topHoldingsRegions && Array.isArray(topHoldingsRegions) && topHoldingsRegions.length > 0) {
        return topHoldingsRegions
            .map((region: any) => {
                const [name, weight] = Object.entries(region)[0];
                return {
                    name: translateRegion(name as string),
                    weight: ((weight as number) * 100).toFixed(2)
                };
            })
            .filter((r: any) => parseFloat(r.weight) > 0);
    }

    // Try source 2: fundProfile.regionWeightings
    const fundProfileRegions = data.fundProfile?.regionWeightings;
    if (fundProfileRegions && Array.isArray(fundProfileRegions) && fundProfileRegions.length > 0) {
        const mapped = fundProfileRegions
            .map((region: any) => {
                if (typeof region === 'object' && region !== null) {
                    const [name, weight] = Object.entries(region)[0];
                    return {
                        name: translateRegion(name as string),
                        weight: typeof weight === 'number' ? (weight * 100).toFixed(2) : String(weight)
                    };
                }
                return null;
            })
            .filter((r: any): r is {name: string, weight: string} => r !== null && parseFloat(r.weight) > 0);
        
        if (mapped.length > 0) return mapped;
    }

    // Try source 3: assetProfile.countryWeightings (country-level, less common)
    const countryWeightings = data.assetProfile?.countryWeightings;
    if (countryWeightings && Array.isArray(countryWeightings) && countryWeightings.length > 0) {
        return countryWeightings
            .map((country: any) => ({
                name: country.countryName || country.name || 'Unknown',
                weight: country.weight ? (country.weight * 100).toFixed(2) : '0.00'
            }))
            .filter((c: any) => parseFloat(c.weight) > 0);
    }

    return undefined;
}

/**
 * Extract asset allocation (stocks/bonds/cash split)
 */
function extractAssetAllocation(data: any): NormalizedFundData['assetAllocation'] | undefined {
    console.log('[fundDataNormalizer] 🔍 Extracting asset allocation...');
    
    const topHoldings = data.topHoldings;
    
    if (!topHoldings) {
        console.warn('[fundDataNormalizer] ⚠️ No topHoldings object found');
        return undefined;
    }

    // Log raw values from Yahoo
    console.log('[fundDataNormalizer] Raw Yahoo values:', {
        stockPosition: topHoldings.stockPosition,
        bondPosition: topHoldings.bondPosition,
        cashPosition: topHoldings.cashPosition,
        otherPosition: topHoldings.otherPosition
    });

    const hasData = topHoldings.stockPosition !== undefined || 
                   topHoldings.bondPosition !== undefined || 
                   topHoldings.cashPosition !== undefined;

    if (!hasData) {
        console.warn('[fundDataNormalizer] ⚠️ No asset allocation data found');
        return undefined;
    }

    const allocation = {
        stocks: topHoldings.stockPosition !== undefined ? (topHoldings.stockPosition * 100).toFixed(2) : undefined,
        bonds: topHoldings.bondPosition !== undefined ? (topHoldings.bondPosition * 100).toFixed(2) : undefined,
        cash: topHoldings.cashPosition !== undefined ? (topHoldings.cashPosition * 100).toFixed(2) : undefined,
        other: topHoldings.otherPosition !== undefined ? (topHoldings.otherPosition * 100).toFixed(2) : undefined,
    };
    
    console.log('[fundDataNormalizer] ✅ Formatted allocation:', allocation);
    console.log('[fundDataNormalizer] ✅ Parsed values:', {
        stocks: allocation.stocks ? parseFloat(allocation.stocks) : 0,
        bonds: allocation.bonds ? parseFloat(allocation.bonds) : 0,
        cash: allocation.cash ? parseFloat(allocation.cash) : 0,
        other: allocation.other ? parseFloat(allocation.other) : 0,
    });
    
    return allocation;
}

/**
 * Extract equity fund statistics
 */
function extractEquityStats(data: any): NormalizedFundData['equityStats'] | undefined {
    const equityHoldings = data.topHoldings?.equityHoldings;
    
    if (!equityHoldings) return undefined;

    const stats: NormalizedFundData['equityStats'] = {};
    
    if (equityHoldings.priceToEarnings?.raw !== undefined) {
        stats.priceToEarnings = equityHoldings.priceToEarnings.raw;
    }
    if (equityHoldings.priceToBook?.raw !== undefined) {
        stats.priceToBook = equityHoldings.priceToBook.raw;
    }
    if (equityHoldings.priceToSales?.raw !== undefined) {
        stats.priceToSales = equityHoldings.priceToSales.raw;
    }
    if (equityHoldings.medianMarketCap?.raw !== undefined) {
        stats.medianMarketCap = equityHoldings.medianMarketCap.raw;
    }

    return Object.keys(stats).length > 0 ? stats : undefined;
}

/**
 * Extract bond fund statistics
 */
function extractBondStats(data: any): NormalizedFundData['bondStats'] | undefined {
    const bondHoldings = data.topHoldings?.bondHoldings;
    
    if (!bondHoldings) return undefined;

    const stats: NormalizedFundData['bondStats'] = {};
    
    if (bondHoldings.duration?.raw !== undefined) {
        stats.duration = bondHoldings.duration.raw;
    }
    if (bondHoldings.maturity?.raw !== undefined) {
        stats.maturity = bondHoldings.maturity.raw;
    }
    if (bondHoldings.creditQuality !== undefined) {
        stats.creditQuality = bondHoldings.creditQuality;
    }

    return Object.keys(stats).length > 0 ? stats : undefined;
}

/**
 * Extract performance metrics (Alpha, Beta, Sharpe)
 */
function extractPerformance(data: any): NormalizedFundData['performance'] | undefined {
    const riskStats = data.fundPerformance?.riskOverviewStatistics?.riskStatistics;
    
    if (!riskStats) return undefined;

    const perf: NormalizedFundData['performance'] = {};
    
    if (riskStats.alpha3y?.raw !== undefined) {
        perf.alpha3y = riskStats.alpha3y.raw;
    }
    if (riskStats.beta3y?.raw !== undefined) {
        perf.beta3y = riskStats.beta3y.raw;
    }
    if (riskStats.sharpe3y?.raw !== undefined) {
        perf.sharpe3y = riskStats.sharpe3y.raw;
    }

    return Object.keys(perf).length > 0 ? perf : undefined;
}

/**
 * Helper: Capitalize first letter of a string
 */
function capitalizeFirst(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Helper: Translate Yahoo Finance region names to Spanish
 */
function translateRegion(region: string): string {
    const translations: Record<string, string> = {
        'unitedStates': 'Estados Unidos',
        'unitedKingdom': 'Reino Unido',
        'europeExUk': 'Europa (ex-UK)',
        'europe': 'Europa',
        'japan': 'Japón',
        'china': 'China',
        'emergingMarkets': 'Mercados Emergentes',
        'asiaPacific': 'Asia-Pacífico',
        'latinAmerica': 'Latinoamérica',
        'africa': 'África',
        'middleEast': 'Medio Oriente',
        'other': 'Otros',
        'nonUs': 'No-EE.UU.',
        'developedMarkets': 'Mercados Desarrollados',
    };
    
    return translations[region] || capitalizeFirst(region);
}

/**
 * Helper: Translate Yahoo Finance sector names to Spanish with proper financial terminology
 */
function translateSector(sector: string): string {
    // Normalize input: lowercase and remove spaces/underscores
    const normalized = sector.toLowerCase().replace(/[\s_-]+/g, '');
    
    const translations: Record<string, string> = {
        // Technology & Communication
        'technology': 'Tecnología',
        'communicationservices': 'Servicios de Comunicación',
        'communication': 'Comunicación',
        
        // Finance & Real Estate
        'financials': 'Financiero',
        'financialservices': 'Servicios Financieros',
        'realestate': 'Inmobiliario',
        'finance': 'Financiero',
        
        // Consumer
        'consumercyclical': 'Consumo Cíclico',
        'consumerdefensive': 'Consumo Defensivo',
        'consumerstaples': 'Productos Básicos de Consumo',
        'consumerdiscretionary': 'Consumo Discrecional',
        'consumer': 'Consumo',
        
        // Health & Energy
        'healthcare': 'Salud',
        'health': 'Salud',
        'energy': 'Energía',
        
        // Industrial & Materials
        'industrials': 'Industrial',
        'basicmaterials': 'Materiales Básicos',
        'materials': 'Materiales',
        
        // Utilities
        'utilities': 'Servicios Públicos',
        
        // Other
        'other': 'Otros',
        'diversified': 'Diversificado',
    };
    
    return translations[normalized] || capitalizeFirst(sector);
}

/**
 * Check if fund data is incomplete (used for fallback decision)
 */
/**
 * Check if fund data is incomplete (to decide whether to try US ticker fallback)
 * 
 * Strategy (Moderate):
 * - If ALL three core fields (holdings, sectors, regions) are missing → incomplete
 * - If holdings OR sectors exist BUT regions are missing → incomplete (likely European fund that needs US data)
 * 
 * This ensures we try fallback for European funds missing geographic data
 */
export function isDataIncomplete(fundInfo: any): boolean {
    if (!fundInfo) return true;

    const hasHoldings = fundInfo.holdings && fundInfo.holdings.length > 0;
    const hasSectors = fundInfo.sectors && fundInfo.sectors.length > 0;
    const hasRegions = fundInfo.regions && fundInfo.regions.length > 0;

    // Data is incomplete if:
    // 1. ALL three are missing (original logic)
    // 2. OR holdings/sectors exist but regions are missing (likely European fund)
    const allMissing = !hasHoldings && !hasSectors && !hasRegions;
    const missingRegions = (hasHoldings || hasSectors) && !hasRegions;
    
    return allMissing || missingRegions;
}

/**
 * Merge fund info from fallback source (prefer fallback data for missing fields)
 */
export function mergeFundInfo(primary: any, fallback: any): any {
    if (!primary) return fallback;
    if (!fallback) return primary;

    return {
        ...primary,
        // Prefer fallback data for key missing fields
        holdings: primary.holdings || fallback.holdings,
        sectors: primary.sectors || fallback.sectors,
        regions: primary.regions || fallback.regions,
        assetAllocation: primary.assetAllocation || fallback.assetAllocation,
        equityStats: primary.equityStats || fallback.equityStats,
        bondStats: primary.bondStats || fallback.bondStats,
        performance: primary.performance || fallback.performance,
        
        // Keep other fields from primary
        sector: primary.sector || fallback.sector,
        category: primary.category || fallback.category,
        expenseRatio: primary.expenseRatio || fallback.expenseRatio,
        expenseRatioFormatted: primary.expenseRatioFormatted || fallback.expenseRatioFormatted,
        description: primary.description || fallback.description,
        fundFamily: primary.fundFamily || fallback.fundFamily,
        inceptionDate: primary.inceptionDate || fallback.inceptionDate,
        website: primary.website || fallback.website,
    };
}
