
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { funds, fundPrices } from '@/lib/db/schema';
import { getFundPrice } from '@/lib/scraper';
import { eq } from 'drizzle-orm';

// Vercel Cron generally uses GET
export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const allFunds = await db.select().from(funds);
        const results = [];

        for (const fund of allFunds) {
            const data = await getFundPrice(fund.isin);
            if (data) {
                // Insert price history
                await db.insert(fundPrices).values({
                    fundId: fund.id,
                    date: data.date.toISOString().split('T')[0], // YYYY-MM-DD
                    price: data.price.toString(),
                }).onConflictDoNothing();

                // Update current price
                await db.update(funds)
                    .set({ lastPrice: data.price.toString(), lastUpdated: new Date() })
                    .where(eq(funds.id, fund.id));

                results.push({ isin: fund.isin, status: 'updated', price: data.price });
            } else {
                results.push({ isin: fund.isin, status: 'failed' });
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
