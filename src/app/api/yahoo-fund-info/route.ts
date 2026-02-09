import { NextRequest, NextResponse } from "next/server";
import { normalizeFundData } from "@/lib/fundDataNormalizer";
import { getYahooAuth } from "@/lib/yahooAuth";

/**
 * GET /api/yahoo-fund-info?symbol=VWCE.DE
 * 
 * Fetches fund information from Yahoo Finance quoteSummary endpoint.
 * Uses server-side crumb authentication (yfinance-style dual-strategy approach).
 * 
 * Authentication Strategy:
 * 1. Try Basic: fc.yahoo.com → query1.finance.yahoo.com/v1/test/getcrumb
 * 2. Fallback CSRF: guce.yahoo.com/consent → query2.finance.yahoo.com/v1/test/getcrumb
 * 
 * Returns sector, category, expense ratio, description, holdings, and performance data.
 * Uses data normalizer to handle inconsistent Yahoo API responses.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
        return NextResponse.json(
            { error: "Missing symbol parameter" },
            { status: 400 }
        );
    }

    try {
        // Step 1: Get authentication (crumb + cookie)
        console.log(`[yahoo-fund-info] 🔐 Getting Yahoo auth for: ${symbol}`);
        const auth = await getYahooAuth();
        
        console.log(`[yahoo-fund-info] ✅ Auth obtained, crumb: ${auth.crumb.substring(0, 10)}...`);

        // Step 2: Build Yahoo Finance URL with crumb
        const modules = [
            "assetProfile",         // For sector weightings, description
            "fundProfile",          // Backup fund data
            "topHoldings",          // For holdings and sector breakdown
            "defaultKeyStatistics", // For stats like expense ratio
            "summaryDetail",        // Additional summary info
            "fundPerformance",      // For alpha, beta, sharpe ratio
        ].join(",");

        const yahooUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
            symbol
        )}?modules=${modules}&crumb=${encodeURIComponent(auth.crumb)}`;

        console.log(`[yahoo-fund-info] 🌐 Fetching from Yahoo Finance: ${symbol}`);

        // Step 3: Fetch with cookie header
        const response = await fetch(yahooUrl, {
            headers: {
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Cookie": auth.cookie,
                "Referer": "https://finance.yahoo.com/",
            },
        });

        if (!response.ok) {
            console.error(`[yahoo-fund-info] ❌ Yahoo API error: ${response.status}`);
            const errorText = await response.text();
            console.error(`[yahoo-fund-info] Error response: ${errorText.substring(0, 200)}`);
            
            return NextResponse.json(
                { error: `Yahoo Finance API error: ${response.status} ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        console.log('[yahoo-fund-info] 📦 Raw response structure:', {
            hasQuoteSummary: !!data?.quoteSummary,
            hasResult: !!data?.quoteSummary?.result,
            hasError: !!data?.quoteSummary?.error,
            resultLength: data?.quoteSummary?.result?.length || 0
        });
        
        // Check for errors in response
        if (data?.quoteSummary?.error) {
            console.error('[yahoo-fund-info] ❌ Yahoo returned error:', data.quoteSummary.error);
            return NextResponse.json(
                { error: data.quoteSummary.error.description || 'Yahoo Finance API error' },
                { status: 400 }
            );
        }

        // Extract data from quoteSummary modules
        const result = data?.quoteSummary?.result?.[0];
        if (!result) {
            console.error('[yahoo-fund-info] ❌ No result in quoteSummary response');
            return NextResponse.json(
                { error: "No data returned from Yahoo Finance" },
                { status: 404 }
            );
        }

        const assetProfile = result.assetProfile || {};
        const fundProfile = result.fundProfile || {};
        const keyStats = result.defaultKeyStatistics || {};
        const summaryDetail = result.summaryDetail || {};
        const topHoldings = result.topHoldings || {};
        const fundPerformance = result.fundPerformance || {};

        // Detailed logging for debugging
        console.log('[yahoo-fund-info] 📊 Module availability for', symbol);
        console.log('  - assetProfile:', Object.keys(assetProfile).length, 'keys');
        console.log('  - fundProfile:', Object.keys(fundProfile).length, 'keys');
        console.log('  - topHoldings:', Object.keys(topHoldings).length, 'keys');
        console.log('  - defaultKeyStatistics:', Object.keys(keyStats).length, 'keys');
        console.log('  - fundPerformance:', Object.keys(fundPerformance).length, 'keys');

        // Log specific data availability
        console.log('[yahoo-fund-info] 🔍 Data deep dive:');
        console.log('  - topHoldings.holdings:', topHoldings.holdings ? `${topHoldings.holdings.length} items` : 'NONE');
        console.log('  - topHoldings.sectorWeightings:', topHoldings.sectorWeightings ? `${topHoldings.sectorWeightings.length} items` : 'NONE');
        console.log('  - topHoldings.equityHoldings:', topHoldings.equityHoldings ? `${topHoldings.equityHoldings.length} items` : 'NONE');
        console.log('  - assetProfile.sectorWeightings:', assetProfile.sectorWeightings ? 'EXISTS' : 'NONE');

        // Use normalizer to extract data from multiple possible sources
        console.log('[yahoo-fund-info] 🔄 Starting normalization...');
        const normalized = normalizeFundData(result);
        
        console.log('[yahoo-fund-info] ✅ Normalized data results:');
        console.log('  - holdings:', normalized.holdings ? `${normalized.holdings.length} found` : '⚠️ NONE');
        console.log('  - sectors:', normalized.sectors ? `${normalized.sectors.length} found` : '⚠️ NONE');
        console.log('  - regions:', normalized.regions ? `${normalized.regions.length} found` : '⚠️ NONE');
        console.log('  - assetAllocation:', normalized.assetAllocation ? 'YES' : 'NO');
        console.log('  - performance:', normalized.performance ? 'YES' : 'NO');

        // Build response object using normalized data
        const fundInfo = {
            symbol,
            sector: assetProfile.sector || fundProfile.categoryName || undefined,
            category: fundProfile.categoryName || assetProfile.sector || undefined,
            expenseRatio: keyStats.annualReportExpenseRatio?.raw || summaryDetail.expenseRatio?.raw || undefined,
            expenseRatioFormatted: formatExpenseRatio(
                keyStats.annualReportExpenseRatio?.raw || summaryDetail.expenseRatio?.raw
            ),
            description: assetProfile.longBusinessSummary || undefined,
            fundFamily: fundProfile.fundFamily || assetProfile.companyOfficers?.[0]?.name || undefined,
            inceptionDate: keyStats.fundInceptionDate?.fmt || undefined,
            website: assetProfile.website || undefined,
            
            // Use normalized data (tries multiple sources)
            holdings: normalized.holdings,
            sectors: normalized.sectors,
            regions: normalized.regions,
            assetAllocation: normalized.assetAllocation,
            equityStats: normalized.equityStats,
            bondStats: normalized.bondStats,
            performance: normalized.performance,
        };

        // Remove undefined fields for cleaner response
        const cleanedInfo = Object.fromEntries(
            Object.entries(fundInfo).filter(([_, value]) => value !== undefined)
        );

        console.log('[yahoo-fund-info] 🎉 Returning fund info with', Object.keys(cleanedInfo).length, 'properties');

        return NextResponse.json(cleanedInfo);
    } catch (error) {
        console.error("[yahoo-fund-info] 💥 Error fetching fund info:", error);
        console.error("[yahoo-fund-info] Error details:", {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        
        return NextResponse.json(
            { 
                error: "Internal server error fetching fund info",
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

/**
 * Helper function to format expense ratio as percentage string
 */
function formatExpenseRatio(ratio: number | undefined): string | undefined {
    if (ratio === undefined || ratio === null) {
        return undefined;
    }
    
    // Yahoo returns expense ratio as decimal (e.g., 0.0022 for 0.22%)
    const percentage = (ratio * 100).toFixed(2);
    return `${percentage}%`;
}
