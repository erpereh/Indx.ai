const fetch = require('node-fetch');

async function verify(isin) {
    const url = `http://localhost:3000/api/fund-details?isin=${isin}`;
    console.log(`Checking ${isin}...`);
    try {
        const res = await fetch(url);
        const data = await res.json();

        console.log(`Name: ${data.name}`);
        console.log(`Launch Date: ${data.launchDate}`);
        console.log(`History count: ${data.history?.length}`);
        console.log(`Sectors found: ${data.composition?.sectors?.length}`);
        console.log(`Regions found: ${data.composition?.regions?.length}`);
        console.log(`Holdings found: ${data.composition?.holdings?.length}`);

        if (data.composition?.sectors?.length > 0) {
            console.log(`Top Sector: ${data.composition.sectors[0].name} (${data.composition.sectors[0].weight}%)`);
        }
    } catch (e) {
        console.error(`Error checking ${isin}:`, e.message);
    }
}

const isins = ['IE00B42W3S00', 'IE000ZYRH0Q7'];
isins.forEach(verify);
