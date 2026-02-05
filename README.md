
# Personal Investment Dashboard

## Setup

1. **Install Dependencies**
   If the automatic installation stalled, run:
   ```bash
   npm install clsx tailwind-merge lucide-react @tremor/react @headlessui/react @heroicons/react drizzle-orm @vercel/postgres cheerio date-fns @clerk/nextjs --legacy-peer-deps
   npm install -D drizzle-kit dotenv --legacy-peer-deps
   ```

2. **Environment Variables**
   Copy `.env.example` to `.env.local` and fill in your Vercel Postgres and Clerk keys.

3. **Database Migration**
   Push the schema to Vercel Postgres:
   ```bash
   npx drizzle-kit push
   ```
   (Ensure you are logged into Vercel or have the correct POSTGRES_URL).

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## Features implemented
- **Dashboard**: `app/dashboard/page.tsx` (Tremor Charts)
- **Admin**: `app/admin/page.tsx` (Holdings Management)
- **Scraper**: `lib/scraper.ts` (FT Markets)
- **Cron**: `app/api/cron/route.ts` (Daily Updates)
