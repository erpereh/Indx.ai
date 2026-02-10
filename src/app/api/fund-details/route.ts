import { NextRequest, NextResponse } from 'next/server';
import { calculateFundMetrics } from '@/lib/calculations';
import { getYahooAuth } from '@/lib/yahooAuth';
import { normalizeFundData, NormalizedFundData } from '@/lib/fundDataNormalizer';

/**
 * GET /api/fund-details?isin=IE000ZYRH0Q7
 * 
 * Obtiene detalles completos de un fondo desde Yahoo Finance.
 * Incluye histórico de precios y metadatos de composición (Asset Class, Region).
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

        // 2. Fetch data in parallel: History + Composition (QuoteSummary)
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
        const fromStr = fiveYearsAgo.toISOString().split('T')[0];
        const toStr = new Date().toISOString().split('T')[0];

        // Fetch History
        const historyPromise = fetch(`${request.nextUrl.origin}/api/yahoo-history?symbol=${encodeURIComponent(symbol)}&from=${fromStr}&to=${toStr}`)
            .then(res => res.ok ? res.json() : null);

        // Fetch Composition (Directly from Yahoo to enable composition data)
        const compositionPromise = (async () => {
            try {
                const auth = await getYahooAuth();
                const modules = ["assetProfile", "fundProfile", "topHoldings"].join(",");
                const yahooUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(auth.crumb)}`;

                const res = await fetch(yahooUrl, {
                    headers: {
                        "Cookie": auth.cookie,
                        "User-Agent": "Mozilla/5.0"
                    }
                });

                if (!res.ok) return null;
                const data = await res.json();
                const result = data?.quoteSummary?.result?.[0];
                return result ? normalizeFundData(result) : null;
            } catch (e) {
                console.error('[FundDetails] Error fetching composition:', e);
                return null;
            }
        })();

        const [historyData, compositionData] = await Promise.all([historyPromise, compositionPromise]);

        const history = historyData?.history || [];

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
            composition: compositionData ? {
                holdings: compositionData.holdings,
                sectors: compositionData.sectors,
                regions: compositionData.regions,
                allocation: compositionData.assetAllocation ? Object.entries(compositionData.assetAllocation).map(([name, weight]) => ({ name, weight: parseFloat(weight) })) : null
            } : null,
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
