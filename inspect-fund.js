const cheerio = require('cheerio');

async function inspect(isin) {
    const symbol = isin.includes(':') ? isin : isin + ':EUR';
    const headers = { 'User-Agent': 'Mozilla/5.0' };

    console.log(`--- Inspecting ${isin} ---`);

    // 1. Summary
    const sumRes = await fetch(`https://markets.ft.com/data/funds/tearsheet/summary?s=${symbol}`, { headers });
    const sumHtml = await sumRes.text();
    const $sum = cheerio.load(sumHtml);
    console.log('Summary Headings:', $sum('h1, h2, h3, h4').map((_, e) => $sum(e).text().trim()).get());

    const profileRow = $sum('tr').filter((_, tr) => $sum(tr).text().toLowerCase().includes('launch date'));
    console.log('Launch Date Row found:', profileRow.length > 0);
    if (profileRow.length > 0) {
        console.log('Launch Date Text:', profileRow.text().trim());
    }

    // 2. Holdings
    const holdRes = await fetch(`https://markets.ft.com/data/funds/tearsheet/holdings?s=${symbol}`, { headers });
    const holdHtml = await holdRes.text();
    const $hold = cheerio.load(holdHtml);
    console.log('Holdings Headings:', $hold('h1, h2, h3, h4').map((_, e) => $hold(e).text().trim()).get());

    $hold('table').each((i, table) => {
        const ths = $hold(table).find('th').map((_, e) => $hold(e).text().trim()).get();
        const firstRow = $hold(table).find('tbody tr').first().find('td').first().text().trim();
        console.log(`Table ${i}: Headers: [${ths.join(', ')}], First Cell: ${firstRow}`);
    });
}

const isins = ['IE00B42W3S00', 'IE000ZYRH0Q7'];
Promise.all(isins.map(inspect));
