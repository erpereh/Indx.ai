
import * as cheerio from 'cheerio';

export async function getFundPrice(isin: string): Promise<{ price: number; date: Date; name: string } | null> {
    try {
        const url = `https://markets.ft.com/data/funds/tearsheet/summary?s=${isin}`;
        // User-Agent is often required to avoid 403
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            next: { revalidate: 0 } // Don't cache for this use case
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // FT Markets Tearsheet Selectors
        // Name: <h1 class="mod-tearsheet-overview__header__name mod-tearsheet-overview__header__name--large">Fund Name</h1>
        const name = $('.mod-tearsheet-overview__header__name').first().text().trim();

        // Price: <span class="mod-ui-data-list__value">123.45</span> (First one in the quote section)
        const priceText = $('.mod-tearsheet-overview__quote .mod-ui-data-list__value').first().text().trim();

        // Clean price string (remove currency symbol if present, handle commas)
        // FT uses "123.45" format usually.
        const priceCleaned = priceText.replace(/[^\d.]/g, '');
        const price = parseFloat(priceCleaned);

        if (!name || isNaN(price)) {
            console.warn(`Could not parse data for ${isin}: Name="${name}", Price="${priceText}"`);
            return null;
        }

        return {
            price,
            date: new Date(),
            name
        };
    } catch (error) {
        console.error(`Error fetching price for ${isin}`, error);
        return null;
    }
}
