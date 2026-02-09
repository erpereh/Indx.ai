import { NextRequest, NextResponse } from 'next/server';
import { calculateFundMetrics } from '@/lib/calculations';

/**
 * GET /api/fund-details?isin=IE000ZYRH0Q7
 * 
 * Obtiene detalles completos de un fondo desde Yahoo Finance.
 * Incluye histórico de precios y métricas calculadas.
 * 
 * MIGRADO DE FINANCIAL TIMES A YAHOO FINANCE
 */

// Force dynamic since we're fetching live data
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const isin = searchParams.get('isin');

    if (!isin) {
        return NextResponse.json({ error: 'ISIN is required' }, { status: 400 });
    }

    try {
        console.log(`[FundDetails] Fetching data for ISIN: ${isin}`);

        // 1. Search Yahoo Finance for the symbol
        const symbolUrl = `${request.nextUrl.origin}/api/yahoo-search?isin=${encodeURIComponent(isin)}`;
        const symbolResponse = await fetch(symbolUrl);

        if (!symbolResponse.ok) {
            console.error(`[FundDetails] Yahoo search failed for ${isin}`);
            return NextResponse.json(
                { error: `No se encontró el fondo con ISIN ${isin} en Yahoo Finance` },
                { status: 404 }
            );
        }

        const symbolData = await symbolResponse.json();
        const symbol = symbolData.symbol;
        const name = symbolData.name || symbol;
        const exchange = symbolData.exchange || 'Unknown';

        console.log(`[FundDetails] Found symbol: ${symbol} for ISIN: ${isin}`);

        // 2. Fetch historical data (last 5 years)
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
        
        const fromStr = fiveYearsAgo.toISOString().split('T')[0];
        const toStr = new Date().toISOString().split('T')[0];

        const historyUrl = `${request.nextUrl.origin}/api/yahoo-history?symbol=${encodeURIComponent(symbol)}&from=${fromStr}&to=${toStr}`;
        const historyResponse = await fetch(historyUrl);

        if (!historyResponse.ok) {
            console.error(`[FundDetails] Yahoo history failed for ${symbol}`);
            return NextResponse.json(
                { error: `No se pudieron obtener datos históricos para ${symbol}` },
                { status: 404 }
            );
        }

        const historyData = await historyResponse.json();
        const history = historyData.history;

        if (!history || history.length === 0) {
            return NextResponse.json(
                { error: 'No hay datos históricos disponibles para este fondo' },
                { status: 404 }
            );
        }

        console.log(`[FundDetails] Retrieved ${history.length} historical data points`);

        // 3. Calculate metrics from history
        const metrics = calculateFundMetrics(history);

        // 4. Detect currency from symbol
        let currency = 'EUR';
        if (symbol.includes('.L')) currency = 'GBP';
        else if (symbol.includes('.SW')) currency = 'CHF';
        else if (symbol.includes('.AS') || symbol.includes('.PA') || symbol.includes('.MI')) currency = 'EUR';

        // 5. Return structured response
        return NextResponse.json({
            isin,
            symbol,
            name,
            exchange,
            currency,
            history,
            metrics: metrics ? {
                performance: metrics.performance,
                cumulativeReturn: metrics.cumulativeReturn,
                annualizedReturn: metrics.annualizedReturn,
                volatility: metrics.volatility,
                maxDrawdown: metrics.maxDrawdown,
            } : null,
            composition: null, // Yahoo Finance doesn't provide composition data
            lastUpdate: new Date().toISOString(),
            source: 'yahoo-finance',
        });

    } catch (error) {
        console.error('[FundDetails] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        return NextResponse.json(
            { error: 'Error al obtener datos del fondo', details: errorMessage },
            { status: 500 }
        );
    }
}
