
const cheerio = require('cheerio');

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

async function testFetch() {
    const symbol = 'IE000ZYRH0Q7:EUR'; 
    // Exact URL from the failing log
    const url = `https://markets.ft.com/data/funds/tearsheet/historical?s=${symbol}&startDate=2021/02/05&endDate=2026/02/05`;

    console.log(`Fetching ${url}...`);
    try {
        const res = await fetch(url, {
            headers: {
                ...BASE_HEADERS,
                'User-Agent': USER_AGENT
            }
        });

        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Length:', text.length);

        const $hist = cheerio.load(text);
        const history = [];

        // --- COPY OF LOGIC FROM route.ts ---
        let priceTable = null;
        $hist('table').each((_, tbl) => {
            const headerText = $hist(tbl).text().toLowerCase();
            // console.log('Checking table header:', headerText.substring(0, 100)); 
            if (headerText.includes('date') && (headerText.includes('close') || headerText.includes('price'))) {
                priceTable = $hist(tbl);
                console.log('Match found via header text');
                return false;
            }
        });

        if (!priceTable) {
             console.log('Fallback to class selector');
             priceTable = $hist('table.mod-tearsheet-historical-prices__results, table.mod-ui-table--historical');
        }

        if (priceTable) {
            console.log('Table found. Processing rows...');
            const rows = priceTable.find('tbody tr');
            console.log(`Found ${rows.length} rows`);

            rows.each((i, tr) => {
                const tds = $hist(tr).find('td');
                // console.log(`Row ${i} cols: ${tds.length}`);
                
                if (tds.length >= 2) {
                    // FIX: FT puts two spans for responsive dates (long/short). Take the first one.
                    let dateText = $hist(tds[0]).find('span').first().text().trim();
                    if (!dateText) dateText = $hist(tds[0]).text().trim(); // Fallback if no spans

                    const closeText = $hist(tds[4]).text().trim() || $hist(tds[1]).text().trim();
                    
                    const val = parseFloat(closeText.replace(/[^0-9.-]/g, ''));
                    const dateObj = new Date(dateText);

                    // console.log(`Row ${i}: DateText="${dateText}", CloseText="${closeText}", Val=${val}, DateObj=${dateObj}`);

                    if (!isNaN(val) && !isNaN(dateObj.getTime())) {
                        history.push({
                            date: dateObj.toISOString().split('T')[0],
                            value: val
                        });
                    } else {
                         console.log(`[FAIL] Row ${i}: DateText="${dateText}", CloseText="${closeText}"`);
                    }
                }
            });
        } else {
            console.log('NO TABLE FOUND AT ALL');
        }
        // -----------------------------------

        console.log(`Extracted ${history.length} items.`);

    } catch (e) {
        console.error('Fetch error:', e);
    }
}

testFetch();
