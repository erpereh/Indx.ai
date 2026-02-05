
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { holdings } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server';

export async function POST(request: Request) {
    try {
        const user = await currentUser();
        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { fundId, units } = await request.json();

        // Upsert holding (update if exists for user+fund, else insert)
        // Drizzle doesn't support complex upsert easily in one go without unique constraint on (user, fund)
        // We should ensure unique constraint in schema, or check first.
        // For now, check first.

        // Note: userId is a string from Clerk.

        // Ensure uniqueness manually for MVP safety
        const existing = await db.select().from(holdings).where(
            and(eq(holdings.userId, user.id), eq(holdings.fundId, fundId))
        );

        if (existing.length > 0) {
            await db.update(holdings)
                .set({ units: units.toString() })
                .where(eq(holdings.id, existing[0].id));
        } else {
            await db.insert(holdings).values({
                userId: user.id,
                fundId: fundId,
                units: units.toString(),
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const user = await currentUser();
        if (!user) return new NextResponse('Unauthorized', { status: 401 });

        const userHoldings = await db.select().from(holdings).where(eq(holdings.userId, user.id));
        return NextResponse.json(userHoldings);
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
