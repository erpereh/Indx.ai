import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getPerformanceMetrics } from '@/lib/financialEngine';

// Force dynamic since we're fetching live data
export const dynamic = 'force-dynamic';

const BASE_HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
};

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const MONTHS_ES: { [key: string]: string } = {
    'enero': 'Jan',
    'febrero': 'Feb',
    'marzo': 'Mar',
    'abril': 'Apr',
    'mayo': 'May',
    'junio': 'Jun',
    'julio': 'Jul',
    'agosto': 'Aug',
    'septiembre': 'Sep',
    'octubre': 'Oct',
    'noviembre': 'Nov',
    'diciembre': 'Dec',
    'ene': 'Jan',
    'feb': 'Feb',
    'mar': 'Mar',
    'abr': 'Apr',
    'may': 'May',
    'jun': 'Jun',
    'jul': 'Jul',
    'ago': 'Aug',
    'sep': 'Sep',
    'oct': 'Oct',
    'nov': 'Nov',
    'dic': 'Dec'
};

const SORTED_MONTH_KEYS = Object.keys(MONTHS_ES).sort((a, b) => b.length - a.length);

function parseFlexibleDate(dateStr: string): Date {
    if (!dateStr) return new Date('Invalid');

    let parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) return parsed;

    let normalized = dateStr.toLowerCase().replace(/de /g, '').replace(/,/g, '');
    for (const key of SORTED_MONTH_KEYS) {
        if (normalized.includes(key)) {
            normalized = normalized.replace(key, MONTHS_ES[key]);
            break;
        }
    }
    parsed = new Date(normalized);
    return parsed;
}

async function fetchWithRetry(url: string, retries = 1): Promise<{ text: string, status: number }> {
    for (let i = 0; i <= retries; i++) {
        const headers = {
            ...BASE_HEADERS,
            'User-Agent': USER_AGENT
        };

        try {
            console.log(`[FT_FETCH] Attempt ${i + 1}/${retries + 1} for ${url}`);
            const response = await fetch(url, { headers, cache: 'no-store' });
            const text = await response.text();
            
            console.log(`[FT_STATUS] ${response.status}`);
            console.log(`[FT_CONTENT_LENGTH] ${text.length}`);
            console.log(`[FT_BODY_PREVIEW] ${text.substring(0, 200).replace(/\n/g, ' ')}...`);

            if (response.ok && text.length > 20000) {
                return { text, status: response.status };
            }
            
            // If we get blocked or short content, wait and retry
            console.warn(`[FT_WARNING] Suspicious response (Status: ${response.status}, Length: ${text.length}). Retrying...`);
            if (i < retries) await new Promise(r => setTimeout(r, 2000));

        } catch (e) {
            console.error(`[FT_ERROR] Fetch failed:`, e);
            if (i < retries) await new Promise(r => setTimeout(r, 2000));
        }
    }
    throw new Error('Failed to fetch after retries');
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const isin = searchParams.get('isin');

    if (!isin) {
        return NextResponse.json({ error: 'ISIN is required' }, { status: 400 });
    }

    try {
        const symbol = isin.includes(':') ? isin : `${isin}:EUR`;
        const now = new Date();
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(now.getFullYear() - 5);
        
        const formatDate = (date: Date) => `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        const historicalUrl = `https://markets.ft.com/data/funds/tearsheet/historical?s=${symbol}&startDate=${formatDate(fiveYearsAgo)}&endDate=${formatDate(now)}`;
        const summaryUrl = `https://markets.ft.com/data/funds/tearsheet/summary?s=${symbol}`;

        // 1. Fetch History
        const { text: histHtml } = await fetchWithRetry(historicalUrl);
        const $hist = cheerio.load(histHtml);

        // Extract Metadata
        const fundName = $hist('h1').first().text().trim() || $hist('.mod-tearsheet-header__title').text().trim() || isin;
        const subTitle = $hist('.mod-tearsheet-header__subtitle').text().trim();
        const currencyMatch = subTitle.match(/([A-Z]{3})/);
        const currency = currencyMatch ? currencyMatch[1] : 'EUR';

        // Extract History
        const history: { date: string; value: number }[] = [];
        
        // Find Table by Header content
        let priceTable = null;
        const tables = $hist('table');
        console.log(`[FT_DEBUG] Found ${tables.length} tables in HTML`);

        tables.each((i, tbl) => {
            const headerText = $hist(tbl).text().toLowerCase();
            const hasDate = headerText.includes('date');
            const hasPrice = headerText.includes('close') || headerText.includes('price');
            
            if (hasDate && hasPrice) {
                console.log(`[FT_DEBUG] Table ${i} matched heuristic`);
                priceTable = $hist(tbl);
                return false;
            }
        });

        if (!priceTable) {
             console.log('[FT_DEBUG] Falling back to class selector');
             priceTable = $hist('table.mod-tearsheet-historical-prices__results, table.mod-ui-table--historical');
        }

        if (priceTable && priceTable.length > 0) {
            const rows = priceTable.find('tbody tr');
            console.log(`[FT_DEBUG] Price table found. Rows: ${rows.length}`);
            
            rows.each((i, tr) => {
                const tds = $hist(tr).find('td');
                if (tds.length >= 2) {
                    let dateText = $hist(tds[0]).find('span').first().text().trim();
                    if (!dateText) dateText = $hist(tds[0]).text().trim();

                    const closeText = $hist(tds[4]).text().trim() || $hist(tds[1]).text().trim();
                    
                    const val = parseFloat(closeText.replace(/[^0-9.-]/g, ''));
                    const dateObj = parseFlexibleDate(dateText);

                    if (!isNaN(val) && !isNaN(dateObj.getTime())) {
                        history.push({
                            date: dateObj.toISOString().split('T')[0],
                            value: val
                        });
                    } else {
                         console.log(`[FT_PARSE_FAIL] Row ${i} invalid: D='${dateText}' V='${closeText}'`);
                    }
                } else {
                    console.log(`[FT_DEBUG_FAIL] Row ${i} not enough cols: ${tds.length}`);
                }
            });
        } else {
            console.error('[FT_ERROR] No price table identified or found no rows.');
        }

        history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        console.log(`[FT_NAV_HISTORY] Extracted ${history.length} data points.`);

        // 2. Random Delay to be human
        const delay = Math.floor(Math.random() * 2000) + 1000;
        await new Promise(r => setTimeout(r, delay));

        // 3. Fetch Summary (Composition)
        const composition: any = { holdings: null, sectors: null, regions: null, allocation: null };
        
        try {
            const { text: sumHtml } = await fetchWithRetry(summaryUrl);
            const $sum = cheerio.load(sumHtml);

            // Robust Table Finder for Composition
            $sum('.mod-ui-table').each((_, table) => {
                const $table = $sum(table);
                // Look for header in the table OR the parent module header
                const tableHeader = $table.find('th').text().toLowerCase();
                const moduleHeader = $table.closest('.mod-module').find('.mod-module__header').text().toLowerCase();
                const fullContext = `${tableHeader} ${moduleHeader}`;
                
                let targetKey: string | null = null;
                if (fullContext.includes('sector') && !fullContext.includes('asset')) targetKey = 'sectors';
                else if (fullContext.includes('region') || fullContext.includes('geographical')) targetKey = 'regions';
                else if (fullContext.includes('asset allocation') || fullContext.includes('asset type')) targetKey = 'allocation';

                if (targetKey) {
                    const items: any[] = [];
                    $table.find('tbody tr').each((_, tr) => {
                        const tds = $sum(tr).find('td');
                        if (tds.length >= 2) {
                            const name = $sum(tds[0]).text().trim();
                            const weightText = $sum(tds[tds.length - 1]).text().trim();
                            
                            // Handle negative weights and <0.01
                            let weight = 0;
                            const cleanText = weightText.replace('%', '').trim();
                            if (cleanText.includes('<')) weight = 0.01;
                            else weight = parseFloat(cleanText);

                            if (!isNaN(weight) && name.toLowerCase() !== 'total' && name !== '') {
                                items.push({ name, weight });
                            }
                        }
                    });
                    
                    // Sort by weight desc
                    items.sort((a, b) => b.weight - a.weight);
                    
                    if (items.length > 0) {
                        composition[targetKey] = items;
                        console.log(`[FT_PARSED_${targetKey.toUpperCase()}] Found ${items.length} items.`);
                    }
                }
            });

        } catch (e) {
            console.error('[FT_ERROR] Summary fetch failed, continuing with history only', e);
        }

        const metrics = getPerformanceMetrics(history.map(h => ({ date: h.date, price: h.value })));

        return NextResponse.json({
            isin,
            name: fundName,
            currency,
            history,
            composition,
            metrics: {
                performance: metrics
            },
            lastUpdate: new Date().toISOString()
        });

    } catch (apiError: any) {
        console.error('[API_ERROR] API Error:', apiError.message);
        return NextResponse.json({ error: 'Internal server error', details: apiError.message }, { status: 500 });
    }
}
