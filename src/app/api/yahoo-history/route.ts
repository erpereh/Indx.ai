import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/yahoo-history?symbol=0P0001GGRS.L&from=2023-01-01&to=2024-12-31
 *
 * Obtiene el histórico de precios diarios de Yahoo Finance.
 * Incluye forward fill para días sin cotización (fines de semana, festivos).
 *
 * Retorna: { history: [{ date: '2023-01-01', close: 10.5 }, ...] }
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    if (!symbol) {
        return NextResponse.json(
            { error: 'Symbol is required' },
            { status: 400 }
        );
    }

    try {
        // 1. Parsear fechas (defaults: from = 5 años atrás, to = hoy)
        const toDate = toStr ? new Date(toStr) : new Date();
        const fromDate = fromStr
            ? new Date(fromStr)
            : new Date(toDate.getTime() - 5 * 365.25 * 24 * 60 * 60 * 1000);

        console.log(`[YAHOO_HISTORY] Fetching ${symbol} from ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`);

        // 2. Convertir a timestamps Unix (Yahoo los necesita en segundos)
        const fromUnix = Math.floor(fromDate.getTime() / 1000);
        const toUnix = Math.floor(toDate.getTime() / 1000);

        // 3. Construir URL de Yahoo Finance Chart API
        // Documentación: https://query1.finance.yahoo.com/v10/finance/quoteSummary/SYMBOL
        // Para históricos: https://query1.finance.yahoo.com/v7/finance/chart/SYMBOL
        const url = `https://query1.finance.yahoo.com/v7/finance/chart/${encodeURIComponent(
            symbol
        )}?interval=1d&period1=${fromUnix}&period2=${toUnix}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        if (!response.ok) {
            console.warn(`[YAHOO_HISTORY] Yahoo API returned status ${response.status} for ${symbol}`);
            return NextResponse.json(
                { error: 'Yahoo Finance chart data unavailable', symbol, status: response.status },
                { status: 404 }
            );
        }

        const data = await response.json();

        // 4. Extraer datos del histórico
        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
            console.warn(`[YAHOO_HISTORY] No chart data found for ${symbol}`);
            return NextResponse.json(
                { error: 'No chart data available for this symbol', symbol },
                { status: 404 }
            );
        }

        const result = data.chart.result[0];
        const timestamps = result.timestamp || [];
        const quote = result.indicators?.quote?.[0] || {};
        const adjclose = quote.adjclose || quote.close || [];

        if (timestamps.length === 0 || adjclose.length === 0) {
            console.warn(`[YAHOO_HISTORY] Empty timestamp or price data for ${symbol}`);
            return NextResponse.json(
                { error: 'Insufficient data in chart result', symbol },
                { status: 404 }
            );
        }

        // 5. Construir array de históricos (sin forward fill aún)
        const rawHistory: { date: string; close: number }[] = [];

        for (let i = 0; i < timestamps.length; i++) {
            const price = adjclose[i];
            if (price !== null && price !== undefined && !isNaN(price)) {
                const date = new Date(timestamps[i] * 1000); // Convertir Unix a ms
                const dateStr = date.toISOString().split('T')[0];
                rawHistory.push({
                    date: dateStr,
                    close: price,
                });
            }
        }

        console.log(`[YAHOO_HISTORY] Extracted ${rawHistory.length} raw data points for ${symbol}`);

        // 6. Aplicar forward fill para días sin cotización
        const filledHistory = applyForwardFill(rawHistory, fromDate, toDate);

        console.log(`[YAHOO_HISTORY] After forward fill: ${filledHistory.length} data points for ${symbol}`);

        return NextResponse.json({
            symbol,
            from: fromDate.toISOString().split('T')[0],
            to: toDate.toISOString().split('T')[0],
            history: filledHistory.map(h => ({
                date: h.date,
                value: h.close, // Usar 'value' para compatibilidad con el resto del código
            })),
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('[YAHOO_HISTORY_ERROR]:', error);
        return NextResponse.json(
            {
                error: 'Internal server error during Yahoo history fetch',
                details: error instanceof Error ? error.message : 'Unknown',
                symbol,
            },
            { status: 500 }
        );
    }
}

/**
 * Aplica forward fill para rellenar días sin cotización (fines de semana, festivos).
 * Comienza desde fromDate (o el primer dato disponible) hasta toDate.
 */
function applyForwardFill(
    history: { date: string; close: number }[],
    fromDate: Date,
    toDate: Date
): { date: string; close: number }[] {
    if (history.length === 0) return [];

    // Crear un mapa para búsqueda rápida
    const historyMap = new Map<string, number>();
    history.forEach(h => historyMap.set(h.date, h.close));

    const filledHistory: { date: string; close: number }[] = [];
    let currentDate = new Date(fromDate);
    let lastKnownPrice = history[0].close;
    let hasFoundFirstData = false;

    // Iterar día a día desde fromDate hasta toDate
    while (currentDate <= toDate) {
        const dateStr = currentDate.toISOString().split('T')[0];

        if (historyMap.has(dateStr)) {
            // Si tenemos dato para este día, usarlo
            const price = historyMap.get(dateStr)!;
            lastKnownPrice = price;
            hasFoundFirstData = true;
            filledHistory.push({
                date: dateStr,
                close: price,
            });
        } else if (hasFoundFirstData) {
            // Si ya encontramos el primer dato, aplicar forward fill
            filledHistory.push({
                date: dateStr,
                close: lastKnownPrice,
            });
        }

        // Avanzar un día
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return filledHistory;
}
