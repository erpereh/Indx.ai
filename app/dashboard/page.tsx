
import { Card, Title, Text, Metric, Grid } from "@tremor/react";
import { AllocationChart } from "./components/AllocationChart";

// ... (imports)

// remove DonutChart from imports if unused, or keep it. 
// I will just add the import at the top in a separate step or assume I can't easily add imports with replace_file_content if I don't target the top.
// Actually, I'll use multi_replace to handle import and usage.

// Wait, I can't comfortably add the import AND replace the usage in one simple replace_file_content if they are far apart.
// I'll use multi_replace.

import { db } from "@/lib/db";
import { funds, holdings, fundPrices } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";

// Helper to format currency
const formatCurrency = (value: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);

export default async function DashboardPage() {
    // const user = await currentUser();
    // if (!user) {
    //     // Ideally redirect to sign-in
    //     return <div className="p-4">Please sign in.</div>;
    // }
    const user = { id: 'mock_user' }; // Mock user for preview

    // Fetch data with fallback
    let userHoldings = [];
    try {
        // Attempt DB Fetch
        userHoldings = await db.select({
            name: funds.name,
            units: holdings.units,
            lastPrice: funds.lastPrice,
            currency: funds.currency,
        })
            .from(holdings)
            .leftJoin(funds, eq(holdings.fundId, funds.id))
            .where(eq(holdings.userId, user.id));
    } catch (e) {
        // Mock data
        userHoldings = [
            { name: 'Vanguard Global Stock Index Fund', units: '124.5', lastPrice: '98.50', currency: 'EUR' },
            { name: 'iShares Emerging Markets', units: '450', lastPrice: '12.30', currency: 'EUR' },
            { name: 'Vanguard Global Small-Cap', units: '85', lastPrice: '156.20', currency: 'EUR' },
        ];
    }

    // Calculate totals
    let totalValue = 0;
    const allocation = userHoldings.map(h => {
        const value = parseFloat(h.units) * parseFloat(h.lastPrice || '0');
        totalValue += value;
        return {
            name: h.name || 'Unknown Fund',
            value: value,
        };
    });

    return (
        <main>
            <Title className="text-gray-900 dark:text-white">Dashboard</Title>
            <Text className="text-gray-500">Portfolio Overview</Text>

            <Grid numItems={1} numItemsSm={2} numItemsLg={3} className="gap-6 mt-6">
                <Card decoration="top" decorationColor="indigo">
                    <Text>Total Portfolio Value</Text>
                    <Metric>{formatCurrency(totalValue)}</Metric>
                </Card>
                {/* Placeholder for Return stats */}
                <Card decoration="top" decorationColor="emerald">
                    <Text>YTD Return</Text>
                    <Metric>-- %</Metric>
                </Card>
            </Grid>

            <div className="mt-6">
                <AllocationChart data={allocation} />
            </div>

            {/* Historical Chart Placeholder */}
            <div className="mt-6">
                <Card>
                    <Title>History</Title>
                    <div className="h-72 mt-4 flex items-center justify-center border-dashed border-2 rounded">
                        <Text>Historical chart requires accumulating price data (Cron Job)</Text>
                    </div>
                </Card>
            </div>
        </main>
    );
}
