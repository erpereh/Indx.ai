import { useState, useEffect } from 'react';
import { Investment } from '@/lib/types';
import { 
    getYahooHistoryCache, 
    saveYahooHistoryCache, 
    cleanExpiredCache 
} from '@/lib/yahooCache';

/**
 * Datos de rentabilidad porcentual acumulada del portfolio
 */
export interface PortfolioHistoryPoint {
    date: string;           // 'YYYY-MM-DD'
    returnPercent: number;  // Rentabilidad acumulada desde la primera inversión (%)
    totalInvested: number;  // Capital invertido hasta esta fecha (€)
    totalValue: number;     // Valor del portfolio en esta fecha (€)
}

/**
 * Hook que calcula la evolución de rentabilidad porcentual del portfolio
 * utilizando datos de Yahoo Finance.
 *
 * Lógica:
 * 1. Obtiene símbolos Yahoo para cada ISIN
 * 2. Descarga históricos de precios diarios
 * 3. Aplica forward fill para días sin cotización
 * 4. Calcula rentabilidad diaria encadenada (interés compuesto)
 * 5. Retorna array de { date, returnPercent }
 */
export function usePortfolioHistory(investments: Investment[]) {
    const [history, setHistory] = useState<PortfolioHistoryPoint[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!investments || investments.length === 0) {
            setHistory([]);
            return;
        }

        const performFetch = async () => {
            setLoading(true);
            setError(null);

            try {
                // 0. Limpiar caché expirado al inicio
                cleanExpiredCache();

                // 1. Obtener el ISIN más antiguo para determinar el rango de fechas
                const earliestDate = investments.reduce((earliest, inv) => {
                    const invDate = new Date(inv.purchaseDate);
                    return invDate < earliest ? invDate : earliest;
                }, new Date());

                const latestDate = new Date();

                console.log(
                    `[usePortfolioHistory] Fetching history from ${earliestDate.toISOString().split('T')[0]} to ${latestDate.toISOString().split('T')[0]}`
                );

                // 2. Intentar obtener datos del caché primero, luego fetch si es necesario
                const dataPromises = investments.map(async (inv) => {
                    // Intentar caché primero
                    const cached = getYahooHistoryCache(inv.isin);
                    
                    if (cached) {
                        // Cache HIT - usar datos cacheados
                        return {
                            isin: inv.isin,
                            symbol: cached.symbol,
                            history: cached.history,
                            fromCache: true,
                        };
                    }

                    // Cache MISS - fetch desde Yahoo Finance
                    try {
                        const symbol = await fetchYahooSymbol(inv.isin);
                        const history = await fetchYahooHistory(symbol, earliestDate, latestDate);
                        
                        // Guardar en caché para futuros usos
                        saveYahooHistoryCache(inv.isin, symbol, history);
                        
                        return {
                            isin: inv.isin,
                            symbol,
                            history,
                            fromCache: false,
                        };
                    } catch (err) {
                        console.error(`Failed to fetch data for ${inv.isin}:`, err);
                        return {
                            isin: inv.isin,
                            symbol: null,
                            history: [],
                            fromCache: false,
                        };
                    }
                });

                const results = await Promise.all(dataPromises);

                // 3. Filtrar inversiones con datos válidos y construir estructuras
                const investmentsWithSymbols: (Investment & { yahooSymbol: string })[] = [];
                const historiesMap = new Map<string, { date: string; value: number }[]>();

                results.forEach((result, idx) => {
                    if (result.symbol && result.history.length > 0) {
                        investmentsWithSymbols.push({
                            ...investments[idx],
                            yahooSymbol: result.symbol,
                        });
                        historiesMap.set(result.isin, result.history);
                    }
                });

                if (investmentsWithSymbols.length === 0) {
                    throw new Error('Could not resolve any ISIN to Yahoo data');
                }

                // 4. Calcular rentabilidad diaria encadenada
                const portfolioHistory = calculateChainedReturns(
                    investmentsWithSymbols,
                    historiesMap,
                    earliestDate,
                    latestDate
                );

                setHistory(portfolioHistory);
                
                const cacheHits = results.filter(r => r.fromCache).length;
                const cacheMisses = results.filter(r => !r.fromCache).length;
                
                console.log(
                    `[usePortfolioHistory] ✅ Success - ${portfolioHistory.length} points | Cache: ${cacheHits} hits, ${cacheMisses} misses`
                );

            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                console.error('[usePortfolioHistory] Error:', errorMessage);
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        performFetch();
    }, [investments]);

    return { history, loading, error };
}

/**
 * Obtiene el símbolo Yahoo Finance para un ISIN
 */
async function fetchYahooSymbol(isin: string): Promise<string> {
    const response = await fetch(`/api/yahoo-search?isin=${encodeURIComponent(isin)}`);

    if (!response.ok) {
        throw new Error(`Failed to fetch symbol for ${isin}: ${response.status}`);
    }

    const data = await response.json();
    if (!data.symbol) {
        throw new Error(`No symbol found for ${isin}`);
    }

    return data.symbol;
}

/**
 * Obtiene el histórico de precios diarios para un símbolo Yahoo
 */
async function fetchYahooHistory(
    symbol: string,
    fromDate: Date,
    toDate: Date
): Promise<{ date: string; value: number }[]> {
    const fromStr = fromDate.toISOString().split('T')[0];
    const toStr = toDate.toISOString().split('T')[0];

    const response = await fetch(
        `/api/yahoo-history?symbol=${encodeURIComponent(symbol)}&from=${fromStr}&to=${toStr}`
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch history for ${symbol}: ${response.status}`);
    }

    const data = await response.json();
    if (!data.history || !Array.isArray(data.history)) {
        throw new Error(`Invalid history format for ${symbol}`);
    }

    return data.history;
}

/**
 * Calcula la rentabilidad porcentual acumulada con encadenamiento de rendimientos diarios.
 *
 * Lógica:
 * - Para cada día, obtiene el precio ponderado del portfolio
 * - Calcula el rendimiento diario: (Precio_Hoy / Precio_Ayer) - 1
 * - Encadena los rendimientos: Producto de (1 + r_diario) - 1
 * - Ignora depósitos adicionales (solo usa investmentInicial y los precios históricos)
 */
function calculateChainedReturns(
    investments: (Investment & { yahooSymbol: string })[],
    historiesMap: Map<string, { date: string; value: number }[]>,
    fromDate: Date,
    toDate: Date
): PortfolioHistoryPoint[] {
    const result: PortfolioHistoryPoint[] = [];

    // Obtener todas las fechas disponibles (unión de fechas de todos los fondos)
    const allDates = new Set<string>();

    for (const history of historiesMap.values()) {
        history.forEach(h => allDates.add(h.date));
    }

    const sortedDates = Array.from(allDates).sort();

    if (sortedDates.length === 0) {
        return result;
    }

    // Filtrar fechas dentro del rango
    const relevantDates = sortedDates.filter(dateStr => {
        const date = new Date(dateStr);
        return date >= fromDate && date <= toDate;
    });

    if (relevantDates.length === 0) {
        return result;
    }

    // Pre-construir mapas de precio por fecha para cada fondo (para búsqueda O(1))
    // y arrays ordenados para forward-fill eficiente
    const priceMaps = new Map<string, Map<string, number>>();
    const sortedHistories = new Map<string, { date: string; value: number }[]>();

    for (const [isin, history] of historiesMap.entries()) {
        const priceMap = new Map<string, number>();
        history.forEach(h => priceMap.set(h.date, h.value));
        priceMaps.set(isin, priceMap);
        // Ordenar cronológicamente para forward-fill
        sortedHistories.set(isin, [...history].sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
        ));
    }

    // Forward-fill: obtener el precio más reciente disponible en o antes de dateStr
    const getForwardFilledPrice = (isin: string, dateStr: string): number | null => {
        // 1. Match exacto (caso más común)
        const priceMap = priceMaps.get(isin);
        if (priceMap?.has(dateStr)) {
            return priceMap.get(dateStr)!;
        }

        // 2. Forward-fill: buscar el último precio conocido antes de esta fecha
        const sorted = sortedHistories.get(isin);
        if (!sorted || sorted.length === 0) return null;

        const targetTs = new Date(dateStr).getTime();
        let lastKnown: number | null = null;

        for (const h of sorted) {
            if (new Date(h.date).getTime() <= targetTs) {
                lastKnown = h.value;
            } else {
                break; // Ya pasamos la fecha objetivo
            }
        }

        return lastKnown;
    };

    // Calcular valor del portfolio para cada fecha
    const portfolioValues: { date: string; value: number; invested: number }[] = [];

    for (const dateStr of relevantDates) {
        let totalValue = 0;
        let totalInvested = 0;
        let hasAnyPrice = false;

        for (const inv of investments) {
            // Solo contar si ya ha sido comprado
            if (new Date(inv.purchaseDate) <= new Date(dateStr)) {
                // Precio de compra implícito (lo que realmente pagó el usuario por participación)
                const purchasePrice = inv.shares > 0 ? inv.initialInvestment / inv.shares : 0;

                const price = getForwardFilledPrice(inv.isin, dateStr);
                if (price !== null && purchasePrice > 0) {
                    // Normalizar: usar ratio precio_mercado/precio_compra sobre el capital invertido
                    // Así el primer punto siempre da P&L = 0 (price ≈ purchasePrice al inicio)
                    const relativePrice = price / purchasePrice;
                    totalValue += inv.initialInvestment * relativePrice;
                    totalInvested += inv.initialInvestment;
                    hasAnyPrice = true;
                } else {
                    // Sin ningún dato histórico para este fondo aún --
                    // valor = inversión inicial → P&L = 0 para este fondo
                    totalValue += inv.initialInvestment;
                    totalInvested += inv.initialInvestment;
                    hasAnyPrice = true;
                }
            }
        }

        if (hasAnyPrice && totalValue > 0) {
            portfolioValues.push({ date: dateStr, value: totalValue, invested: totalInvested });
        }
    }

    if (portfolioValues.length === 0) {
        return result;
    }

    // Inyectar precio real-time (currentPrice) en el último punto
    // para alinear con el valor que muestra Resumen
    const lastPoint = portfolioValues[portfolioValues.length - 1];
    let realtimeValue = 0;
    let realtimeInvested = 0;
    let hasRealtime = false;

    for (const inv of investments) {
        if (new Date(inv.purchaseDate) <= new Date(lastPoint.date)) {
            const purchasePrice = inv.shares > 0 ? inv.initialInvestment / inv.shares : 0;

            if (inv.currentPrice && inv.currentPrice > 0 && purchasePrice > 0) {
                // Normalizar con el mismo ratio que el loop principal
                const relativePrice = inv.currentPrice / purchasePrice;
                realtimeValue += inv.initialInvestment * relativePrice;
                realtimeInvested += inv.initialInvestment;
                hasRealtime = true;
            } else {
                // Fondo sin precio real-time: usar el último histórico normalizado
                const price = getForwardFilledPrice(inv.isin, lastPoint.date);
                if (price !== null && purchasePrice > 0) {
                    const relativePrice = price / purchasePrice;
                    realtimeValue += inv.initialInvestment * relativePrice;
                } else {
                    realtimeValue += inv.initialInvestment;
                }
                realtimeInvested += inv.initialInvestment;
            }
        }
    }

    // Solo reemplazar si tenemos datos real-time válidos
    if (hasRealtime && realtimeValue > 0) {
        lastPoint.value = realtimeValue;
        lastPoint.invested = realtimeInvested;
    }

    // Calcular rentabilidad encadenada
    const firstValue = portfolioValues[0].value;
    let cumulativeReturn = 0; // Comienza en 0% (Base 100)

    for (let i = 0; i < portfolioValues.length; i++) {
        const currentValue = portfolioValues[i].value;
        const currentInvested = portfolioValues[i].invested;

        if (i === 0) {
            // Primer punto siempre es 0%
            cumulativeReturn = 0;
        } else {
            // Rendimiento diario
            const previousValue = portfolioValues[i - 1].value;
            const dailyReturn = previousValue > 0 ? currentValue / previousValue - 1 : 0;

            // Encadenar: nueva rentabilidad acumulada
            cumulativeReturn = (1 + cumulativeReturn) * (1 + dailyReturn) - 1;
        }

        result.push({
            date: portfolioValues[i].date,
            returnPercent: cumulativeReturn * 100, // Convertir a porcentaje
            totalInvested: currentInvested,
            totalValue: currentValue,
        });
    }

    return result;
}
