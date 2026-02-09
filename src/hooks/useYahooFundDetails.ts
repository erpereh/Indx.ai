import { useState, useEffect } from 'react';
import { 
    getYahooFullHistoryCache, 
    saveYahooFullHistoryCache, 
    cleanExpiredFullCache 
} from '@/lib/yahooCache';
import { calculateFundMetrics, calculateAdvancedRiskMetrics } from '@/lib/calculations';
import { getUSTicker } from '@/lib/isinMappings';
import { isDataIncomplete, mergeFundInfo } from '@/lib/fundDataNormalizer';

/**
 * Datos completos de un fondo desde Yahoo Finance
 */
export interface YahooFundDetails {
    isin: string;
    symbol: string;
    name: string;
    exchange: string;
    currency: string;
    history: Array<{ date: string; value: number }>;
    metrics: {
        performance: Record<string, number>;
        cumulativeReturn: number;
        annualizedReturn: number;
        volatility: number;
        maxDrawdown: number;
    } | null;
    fundInfo?: {
        sector?: string;
        category?: string;
        expenseRatio?: number;
        expenseRatioFormatted?: string;
        riskLevel?: number;
        volatility?: number;
        description?: string;
        fundFamily?: string;
        inceptionDate?: string;
        website?: string;
        holdings?: Array<{
            name: string;
            symbol: string;
            weight: string;  // Percentage as string (e.g., "5.23")
        }>;
        sectors?: Array<{
            name: string;
            weight: string;  // Percentage as string (e.g., "24.56")
        }>;
        assetAllocation?: {
            stocks?: string;  // Percentage as string
            bonds?: string;
            cash?: string;
            other?: string;
        };
        regions?: Array<{
            name: string;
            weight: string;  // Percentage as string
        }>;
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
        _dataSource?: 'fallback' | 'direct';  // Metadata: source of data
        _fallbackReason?: string;  // Metadata: reason for fallback
    };
    lastUpdate: string;
    fromCache: boolean;
}

/**
 * Hook para obtener detalles completos de un fondo desde Yahoo Finance
 * Incluye caché automático de 7 días y cálculo de métricas
 * Fetches 10 years of history + fund information
 * 
 * @param isin - Código ISIN del fondo
 * @returns Detalles del fondo, estado de carga y errores
 */
export function useYahooFundDetails(isin: string | null) {
    const [details, setDetails] = useState<YahooFundDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isin) {
            setDetails(null);
            return;
        }

        const fetchDetails = async () => {
            setLoading(true);
            setError(null);
            
            // Capture isin as non-null (already checked above)
            const validIsin = isin as string;

            try {
                // 0. Limpiar caché expirado
                cleanExpiredFullCache();

                // 1. Verificar si hay datos en caché completo (10 años)
                const cached = getYahooFullHistoryCache(validIsin);
                
                if (cached) {
                    console.log(`[useYahooFundDetails] ✅ Full Cache HIT for ${validIsin}`);
                    
                    // Calcular métricas desde datos cacheados
                    const metrics = calculateFundMetrics(cached.history);
                    
                    setDetails({
                        isin: validIsin,
                        symbol: cached.symbol,
                        name: cached.symbol, // Yahoo no siempre tiene nombre largo
                        exchange: 'Yahoo Finance',
                        currency: detectCurrency(cached.symbol),
                        history: cached.history,
                        metrics,
                        fundInfo: cached.fundInfo,
                        lastUpdate: new Date(cached.fetchedAt).toISOString(),
                        fromCache: true,
                    });
                    
                    setLoading(false);
                    return;
                }

                console.log(`[useYahooFundDetails] ❌ Full Cache MISS for ${validIsin} - Fetching 10 years from Yahoo`);
                
                // 2. Buscar símbolo de Yahoo desde ISIN
                const symbolResponse = await fetch(`/api/yahoo-search?isin=${encodeURIComponent(validIsin)}`);
                
                if (!symbolResponse.ok) {
                    throw new Error(`No se encontró el fondo con ISIN ${validIsin} en Yahoo Finance`);
                }
                
                const symbolData = await symbolResponse.json();
                const symbol = symbolData.symbol;
                const name = symbolData.name || symbol;

                // 3. Obtener histórico de precios (10 años con maxHistory=true)
                const historyResponse = await fetch(
                    `/api/yahoo-history?symbol=${encodeURIComponent(symbol)}&maxHistory=true`
                );
                
                if (!historyResponse.ok) {
                    throw new Error(`No se pudieron obtener datos históricos para ${symbol}`);
                }
                
                const historyData = await historyResponse.json();
                const history = historyData.history;

                if (!history || history.length === 0) {
                    throw new Error('No hay datos históricos disponibles para este fondo');
                }

                console.log(`[useYahooFundDetails] ✅ Fetched ${history.length} data points (10 years)`);

                // 4. Obtain fund information (with fallback to US ticker if needed)
                let fundInfo = undefined;
                let usedFallback = false;
                
                try {
                    const fundInfoResponse = await fetch(
                        `/api/yahoo-fund-info?symbol=${encodeURIComponent(symbol)}`
                    );
                    
                    if (fundInfoResponse.ok) {
                        const fundInfoData = await fundInfoResponse.json();
                        fundInfo = fundInfoData;
                        
                        console.log(`[useYahooFundDetails] ✅ Fetched fund info for ${symbol}`);
                        console.log(`[useYahooFundDetails]   - Holdings: ${fundInfo.holdings ? fundInfo.holdings.length : 0}`);
                        console.log(`[useYahooFundDetails]   - Sectors: ${fundInfo.sectors ? fundInfo.sectors.length : 0}`);
                        console.log(`[useYahooFundDetails]   - Regions: ${fundInfo.regions ? fundInfo.regions.length : 0}`);
                        
                        // Check if data is incomplete and fallback is available
                        if (isDataIncomplete(fundInfo)) {
                            const usTicker = getUSTicker(validIsin);
                            
                            if (usTicker) {
                                console.log(`[useYahooFundDetails] ⚠️ Data incomplete for ${symbol}, trying US equivalent: ${usTicker}`);
                                
                                const fallbackResponse = await fetch(
                                    `/api/yahoo-fund-info?symbol=${encodeURIComponent(usTicker)}`
                                );
                                
                                if (fallbackResponse.ok) {
                                    const fallbackData = await fallbackResponse.json();
                                    
                                    // Merge fallback data (prefer fallback for missing fields)
                                    fundInfo = mergeFundInfo(fundInfo, fallbackData);
                                    usedFallback = true;
                                    
                                    console.log(`[useYahooFundDetails] ✅ Merged data from ${usTicker}`);
                                    console.log(`[useYahooFundDetails]   - Holdings: ${fundInfo.holdings ? fundInfo.holdings.length : 0}`);
                                    console.log(`[useYahooFundDetails]   - Sectors: ${fundInfo.sectors ? fundInfo.sectors.length : 0}`);
                                    console.log(`[useYahooFundDetails]   - Regions: ${fundInfo.regions ? fundInfo.regions.length : 0}`);
                                } else {
                                    console.warn(`[useYahooFundDetails] ❌ Fallback to ${usTicker} failed`);
                                }
                            } else {
                                console.warn(`[useYahooFundDetails] ⚠️ No US equivalent found for ${validIsin}`);
                            }
                        }
                    } else {
                        const errorStatus = fundInfoResponse.status;
                        console.warn(`[useYahooFundDetails] ⚠️ Fund info failed with ${errorStatus} for ${symbol}`);
                        
                        // Since we're using AllOrigins proxy, authentication errors shouldn't happen
                        // If they do, directly try fallback to US ticker
                        console.log('[useYahooFundDetails] 🔄 Attempting fallback to US ticker...');
                        await tryFallback();
                        
                        // Helper function to try US ticker fallback
                        async function tryFallback() {
                            const usTicker = getUSTicker(validIsin);
                            
                            if (!usTicker) {
                                console.warn(`[useYahooFundDetails] ⚠️ No US equivalent found for ${validIsin}`);
                                return;
                            }
                            
                            console.log(`[useYahooFundDetails] 🔄 Trying fallback ticker: ${usTicker} (from ${symbol})`);
                            
                            const fallbackResponse = await fetch(
                                `/api/yahoo-fund-info?symbol=${encodeURIComponent(usTicker)}`
                            );
                            
                            if (fallbackResponse.ok) {
                                fundInfo = await fallbackResponse.json();
                                fundInfo._dataSource = 'fallback';
                                fundInfo._fallbackReason = `European symbol returned ${errorStatus}`;
                                usedFallback = true;
                                
                                console.log(`[useYahooFundDetails] ✅ Fallback successful with ${usTicker}`);
                                console.log(`[useYahooFundDetails]   - Holdings: ${fundInfo.holdings ? fundInfo.holdings.length : 0}`);
                                console.log(`[useYahooFundDetails]   - Sectors: ${fundInfo.sectors ? fundInfo.sectors.length : 0}`);
                                console.log(`[useYahooFundDetails]   - Regions: ${fundInfo.regions ? fundInfo.regions.length : 0}`);
                            } else {
                                console.warn(`[useYahooFundDetails] ❌ Fallback to ${usTicker} also failed with ${fallbackResponse.status}`);
                            }
                        }
                    }
                } catch (err) {
                    console.warn('[useYahooFundDetails] ⚠️ Fund info fetch failed (non-critical):', err);
                }
                
                // Detailed X-Ray logging for debugging
                if (fundInfo) {
                    console.log("📊 [useYahooFundDetails] === X-RAY DATA RECEIVED ===");
                    console.log("📊 Symbol:", symbol);
                    console.log("📊 Holdings:", fundInfo.holdings ? `✅ ${fundInfo.holdings.length} items` : "❌ EMPTY");
                    console.log("📊 Sectors:", fundInfo.sectors ? `✅ ${fundInfo.sectors.length} items` : "❌ EMPTY");
                    console.log("📊 Regions:", fundInfo.regions ? `✅ ${fundInfo.regions.length} items` : "❌ EMPTY");
                    console.log("📊 Asset Allocation:", fundInfo.assetAllocation ? "✅ EXISTS" : "❌ NONE");
                    console.log("📊 Performance:", fundInfo.performance ? "✅ EXISTS" : "❌ NONE");
                    console.log("📊 Category:", fundInfo.category || "N/A");
                    console.log("📊 Expense Ratio:", fundInfo.expenseRatioFormatted || "N/A");
                    console.log("📊 Data Source:", usedFallback ? "🔄 US FALLBACK" : "🌐 DIRECT");
                    
                    // Detailed holdings preview
                    if (fundInfo.holdings && fundInfo.holdings.length > 0) {
                        console.log("📊 Top 3 Holdings:");
                        fundInfo.holdings.slice(0, 3).forEach((h: any, i: number) => {
                            console.log(`   ${i + 1}. ${h.name} (${h.symbol}): ${h.weight}%`);
                        });
                    }
                    
                    // Detailed sectors preview
                    if (fundInfo.sectors && fundInfo.sectors.length > 0) {
                        console.log("📊 Top 3 Sectors:");
                        fundInfo.sectors.slice(0, 3).forEach((s: any, i: number) => {
                            console.log(`   ${i + 1}. ${s.name}: ${s.weight}%`);
                        });
                    }
                    
                    console.log("📊 ============================");
                } else {
                    console.warn("📊 [useYahooFundDetails] ⚠️ NO FUND INFO RECEIVED - Data will be limited");
                }
                
                // Calculate volatility and risk level from historical data
                const fundMetrics = calculateFundMetrics(history);
                const volatility = fundMetrics?.volatility || 0;
                const riskLevel = calculateRiskLevel(volatility);
                
                // Enhance fundInfo with calculated metrics
                if (fundInfo) {
                    fundInfo.riskLevel = riskLevel;
                    fundInfo.volatility = volatility;
                    
                    // Calculate advanced risk metrics if not provided by API
                    if (!fundInfo.performance || 
                        fundInfo.performance.alpha3y === undefined || 
                        fundInfo.performance.beta3y === undefined || 
                        fundInfo.performance.sharpe3y === undefined) {
                        
                        console.log('[useYahooFundDetails] ⚙️ Calculating risk metrics from historical data...');
                        
                        // Calculate with risk-free rate of 3%
                        const calculatedMetrics = calculateAdvancedRiskMetrics(history, undefined, 0.03);
                        
                        // Merge calculated metrics with existing performance data
                        fundInfo.performance = {
                            ...fundInfo.performance,
                            ...calculatedMetrics,
                        };
                        
                        console.log('[useYahooFundDetails] ✅ Calculated metrics:');
                        console.log(`  - Sharpe: ${calculatedMetrics.sharpe3y?.toFixed(2) || 'N/A'}`);
                        console.log(`  - Alpha: ${calculatedMetrics.alpha3y?.toFixed(2) || 'N/A'} (requires benchmark)`);
                        console.log(`  - Beta: ${calculatedMetrics.beta3y?.toFixed(2) || 'N/A'} (requires benchmark)`);
                    }
                    
                    // Add metadata flag if fallback was used
                    if (usedFallback) {
                        fundInfo._dataSource = 'fallback';
                    }
                }

                // 5. Calcular métricas
                const metrics = calculateFundMetrics(history);

                // 6. Guardar en caché completo (7 días)
                saveYahooFullHistoryCache(validIsin, symbol, history, fundInfo);

                // 7. Detectar moneda del símbolo
                const currency = detectCurrency(symbol);

                setDetails({
                    isin: validIsin,
                    symbol,
                    name,
                    exchange: symbolData.exchange || 'Unknown',
                    currency,
                    history,
                    metrics,
                    fundInfo,
                    lastUpdate: new Date().toISOString(),
                    fromCache: false,
                });

                console.log(`[useYahooFundDetails] ✅ Successfully loaded full details for ${validIsin}`);

            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
                console.error('[useYahooFundDetails] Error:', errorMessage);
                setError(errorMessage);
                setDetails(null);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [isin]);

    return { details, loading, error };
}

/**
 * Detectar moneda basada en el símbolo de Yahoo
 */
function detectCurrency(symbol: string): string {
    if (symbol.includes('.L')) return 'GBP';
    if (symbol.includes('.SW')) return 'CHF';
    if (symbol.includes('.AS') || symbol.includes('.PA') || symbol.includes('.MI') || symbol.includes('.DE')) return 'EUR';
    if (symbol.includes('.US') || !symbol.includes('.')) return 'USD';
    return 'EUR'; // Default
}

/**
 * Calcular nivel de riesgo aproximado (1-7) basado en volatilidad anualizada
 * Aproximación del SRRI europeo
 * 
 * @param volatility - Volatilidad anualizada (decimal, e.g., 0.15 = 15%)
 * @returns Nivel de riesgo de 1 a 7
 */
function calculateRiskLevel(volatility: number): number {
    if (volatility < 0.005) return 1;  // <0.5% → Muy bajo riesgo
    if (volatility < 0.02) return 2;   // 0.5-2% → Bajo riesgo
    if (volatility < 0.05) return 3;   // 2-5% → Bajo-medio riesgo
    if (volatility < 0.10) return 4;   // 5-10% → Medio riesgo
    if (volatility < 0.15) return 5;   // 10-15% → Medio-alto riesgo
    if (volatility < 0.25) return 6;   // 15-25% → Alto riesgo
    return 7;                           // >25% → Muy alto riesgo
}

