'use client';

import { useState, useEffect } from 'react';
import { Investment } from '@/lib/types';

/**
 * Datos de rentabilidad porcentual acumulada del portfolio
 */
export interface PortfolioHistoryPoint {
    date: string;           // 'YYYY-MM-DD'
    returnPercent: number;  // Rentabilidad acumulada desde la primera inversión (%)
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
                // 1. Obtener el ISIN más antiguo para determinar el rango de fechas
                const earliestDate = investments.reduce((earliest, inv) => {
                    const invDate = new Date(inv.purchaseDate);
                    return invDate < earliest ? invDate : earliest;
                }, new Date());

                const latestDate = new Date();

                console.log(
                    `[usePortfolioHistory] Fetching history from ${earliestDate.toISOString().split('T')[0]} to ${latestDate.toISOString().split('T')[0]}`
                );

                // 2. Obtener símbolos Yahoo para cada ISIN
                const symbolPromises = investments.map(inv =>
                    fetchYahooSymbol(inv.isin)
                        .then(symbol => ({ isin: inv.isin, symbol }))
                        .catch(err => {
                            console.error(`Failed to get symbol for ${inv.isin}:`, err);
                            return { isin: inv.isin, symbol: null };
                        })
                );

                const symbolResults = await Promise.all(symbolPromises);

                // 3. Filtrar inversiones con símbolo válido
                const investmentsWithSymbols: (Investment & { yahooSymbol: string })[] = [];
                investments.forEach((inv, idx) => {
                    const symbol = symbolResults[idx].symbol;
                    if (symbol) {
                        investmentsWithSymbols.push({
                            ...inv,
                            yahooSymbol: symbol,
                        });
                    }
                });

                if (investmentsWithSymbols.length === 0) {
                    throw new Error('Could not resolve any ISIN to Yahoo symbol');
                }

                // 4. Descargar históricos de precios
                const historiesPromises = investmentsWithSymbols.map(inv =>
                    fetchYahooHistory(inv.yahooSymbol, earliestDate, latestDate)
                        .then(hist => ({ isin: inv.isin, history: hist }))
                        .catch(err => {
                            console.error(`Failed to get history for ${inv.yahooSymbol}:`, err);
                            return { isin: inv.isin, history: [] };
                        })
                );

                const historiesResults = await Promise.all(historiesPromises);

                // 5. Construir mapa de históricos
                const historiesMap = new Map<string, { date: string; value: number }[]>();
                historiesResults.forEach(({ isin, history }) => {
                    if (history.length > 0) {
                        historiesMap.set(isin, history);
                    }
                });

                if (historiesMap.size === 0) {
                    throw new Error('Could not fetch any historical data');
                }

                // 6. Calcular rentabilidad diaria encadenada
                const portfolioHistory = calculateChainedReturns(
                    investmentsWithSymbols,
                    historiesMap,
                    earliestDate,
                    latestDate
                );

                setHistory(portfolioHistory);
                console.log(
                    `[usePortfolioHistory] Successfully calculated ${portfolioHistory.length} history points`
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

    // Calcular valor del portfolio para cada fecha
    const portfolioValues: { date: string; value: number }[] = [];

    for (const dateStr of relevantDates) {
        let totalValue = 0;

        for (const inv of investments) {
            // Solo contar si ya ha sido comprado
            if (new Date(inv.purchaseDate) <= new Date(dateStr)) {
                const history = historiesMap.get(inv.isin);
                if (history) {
                    const priceData = history.find(h => h.date === dateStr);
                    if (priceData) {
                        totalValue += inv.shares * priceData.value;
                    }
                }
            }
        }

        if (totalValue > 0) {
            portfolioValues.push({ date: dateStr, value: totalValue });
        }
    }

    if (portfolioValues.length === 0) {
        return result;
    }

    // Calcular rentabilidad encadenada
    const firstValue = portfolioValues[0].value;
    let cumulativeReturn = 0; // Comienza en 0% (Base 100)

    for (let i = 0; i < portfolioValues.length; i++) {
        const currentValue = portfolioValues[i].value;

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
        });
    }

    return result;
}
