import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/yahoo-search?isin=IE000ZYRH0Q7
 * 
 * Busca un ISIN en Yahoo Finance API para obtener el símbolo (ticker) interno.
 * Retorna: { symbol: "0P0001GGRS.L", name: "Fund Name", etc. }
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const isin = searchParams.get('isin');

    if (!isin) {
        return NextResponse.json(
            { error: 'ISIN is required' },
            { status: 400 }
        );
    }

    try {
        // 1. Buscar en Yahoo Finance usando el ISIN
        const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(isin)}`;

        console.log(`[YAHOO_SEARCH] Searching for ISIN: ${isin}`);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        if (!response.ok) {
            console.warn(`[YAHOO_SEARCH] Yahoo API returned status ${response.status}`);
            return NextResponse.json(
                { error: 'Yahoo Finance search failed', isin, status: response.status },
                { status: 404 }
            );
        }

        const data = await response.json();

        // 2. Extraer el primer resultado (quote)
        if (!data.quotes || data.quotes.length === 0) {
            console.warn(`[YAHOO_SEARCH] No results found for ISIN: ${isin}`);
            return NextResponse.json(
                { error: 'No quotes found for this ISIN', isin },
                { status: 404 }
            );
        }

        // 3. Buscar específicamente un fondo (type === 'mutualfund' o 'equity')
        // Los fondos europeos a menudo aparecen como equity en Yahoo
        let targetQuote = null;

        for (const quote of data.quotes) {
            // Preferir fondos, pero aceptar equity si contiene "fund" en el nombre
            if (quote.quoteType === 'MUTUALFUND' || quote.quoteType === 'EQUITY') {
                if (quote.symbol && !targetQuote) {
                    targetQuote = quote;
                    break;
                }
            }
        }

        // Si no encontramos nada específico, usar el primer resultado
        if (!targetQuote && data.quotes.length > 0) {
            targetQuote = data.quotes[0];
        }

        if (!targetQuote || !targetQuote.symbol) {
            console.warn(`[YAHOO_SEARCH] Could not extract symbol from results for ISIN: ${isin}`);
            return NextResponse.json(
                { error: 'Could not extract valid symbol from search results', isin },
                { status: 404 }
            );
        }

        console.log(`[YAHOO_SEARCH] Found symbol: ${targetQuote.symbol} for ISIN: ${isin}`);

        return NextResponse.json({
            isin,
            symbol: targetQuote.symbol,
            name: targetQuote.longname || targetQuote.shortname || 'Unknown',
            exchange: targetQuote.exchDisp || 'Unknown',
            quoteType: targetQuote.quoteType,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('[YAHOO_SEARCH_ERROR]:', error);
        return NextResponse.json(
            {
                error: 'Internal server error during Yahoo search',
                details: error instanceof Error ? error.message : 'Unknown',
                isin,
            },
            { status: 500 }
        );
    }
}
