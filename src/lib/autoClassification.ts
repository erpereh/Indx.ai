import { Investment } from './types';

interface FundComposition {
    holdings?: any[];
    sectors?: any[];
    regions?: { name: string; weight: string }[];
    allocation?: { name: string; weight: number }[];
}

export type AssetClass = Investment['assetClass'];
export type Region = Investment['region'];

export function autoClassifyFund(composition: FundComposition | null): {
    assetClass: AssetClass;
    region: Region
} {
    if (!composition) {
        return { assetClass: 'Equity', region: 'Global' }; // Default fallback
    }

    const assetClass = determineAssetClass(composition.allocation);
    const region = determineRegion(composition.regions);

    return { assetClass, region };
}

function determineAssetClass(allocation?: { name: string; weight: number }[]): AssetClass {
    if (!allocation || allocation.length === 0) return 'Equity';

    // Normalize weights (Yahoo sometimes gives strings or decimals)
    // allocation format from our API is [{name: 'stocks', weight: 98.5}, ...]

    let stocks = 0;
    let bonds = 0;
    let cash = 0;
    let other = 0;

    allocation.forEach(a => {
        const name = a.name.toLowerCase();
        const weight = a.weight; // Assuming 0-100 scale based on normalizer

        if (name.includes('stock') || name.includes('equity')) stocks += weight;
        else if (name.includes('bond') || name.includes('fixed')) bonds += weight;
        else if (name.includes('cash')) cash += weight;
        else other += weight;
    });

    // Classification Logic
    if (stocks > 70) return 'Equity';
    if (bonds > 70) return 'Fixed Income';
    if (stocks + bonds < 20 && other > 50) return 'Commodity'; // Potential proxy for commodities/crypto

    // Balanced or Mixed -> Default to Equity for now or create a Mixed category if supported
    // The current type definition only has specific classes. 
    // If it's a mix (e.g. 60/40), usually we classify by the dominant one or allow user to override.
    return stocks >= bonds ? 'Equity' : 'Fixed Income';
}

function determineRegion(regions?: { name: string; weight: string }[]): Region {
    if (!regions || regions.length === 0) return 'Global';

    // Parse weights to numbers
    const parsedRegions = regions.map(r => ({
        name: r.name.toLowerCase(),
        weight: parseFloat(r.weight)
    }));

    // Aggregate by major regions
    let us = 0;
    let europe = 0;
    let emerging = 0;
    let japan = 0;
    let asia = 0;

    parsedRegions.forEach(r => {
        if (r.name.includes('estados unidos') || r.name.includes('united states') || r.name.includes('usa')) us += r.weight;
        if (r.name.includes('europa') || r.name.includes('europe') || r.name.includes('euro')) europe += r.weight;
        if (r.name.includes('emergente') || r.name.includes('emerging')) emerging += r.weight;
        if (r.name.includes('japón') || r.name.includes('japan')) japan += r.weight;
        if (r.name.includes('asia')) asia += r.weight;
    });

    // Classification Logic (Thresholds)
    if (us > 60) return 'North America';
    if (europe > 60) return 'Europe';
    if (jpnDominant(japan, us, europe)) return 'Japan';
    if (emerging > 50) return 'Emerging Markets';
    if (asia > 60) return 'Asia Pacific';

    // If no single region dominates, it's likely Global
    return 'Global';
}

function jpnDominant(japan: number, us: number, europe: number): boolean {
    return japan > 40 && japan > us && japan > europe;
}
