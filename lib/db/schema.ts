
import { pgTable, text, timestamp, numeric, serial, uniqueIndex, date } from 'drizzle-orm/pg-core';

// Funds Table
export const funds = pgTable('funds', {
    id: serial('id').primaryKey(),
    isin: text('isin').notNull().unique(),
    name: text('name').notNull(),
    currency: text('currency').notNull().default('EUR'),
    lastPrice: numeric('last_price', { precision: 10, scale: 4 }),
    lastUpdated: timestamp('last_updated').defaultNow(),
});

// Price History Table
export const fundPrices = pgTable('fund_prices', {
    id: serial('id').primaryKey(),
    fundId: serial('fund_id').references(() => funds.id),
    date: date('date').notNull(),
    price: numeric('price', { precision: 10, scale: 4 }).notNull(),
}, (table) => {
    return {
        fundDateIdx: uniqueIndex('fund_date_idx').on(table.fundId, table.date),
    };
});

// User Holdings
export const holdings = pgTable('holdings', {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(), // From Clerk
    fundId: serial('fund_id').references(() => funds.id),
    units: numeric('units', { precision: 12, scale: 4 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});
