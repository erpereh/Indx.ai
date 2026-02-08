# AGENTS.md - Developer Guidelines for Agentic AI Coding

This document is designed for agentic coding agents (AI-based coding assistants) operating on the Indx.ai repository. It provides essential information about the tech stack, build process, code style, and conventions.

## Project Overview

**Indx.ai** is a Next.js-based investment portfolio dashboard that tracks funds, calculates gains/losses, and displays real-time price data using web scraping and chart visualizations.

**Tech Stack:**
- Framework: Next.js 15 (App Router)
- Language: TypeScript 5.7
- Styling: Tailwind CSS 3.4 + custom CSS
- Charts: Chart.js 4 + react-chartjs-2
- State: React Context API
- Data Storage: localStorage + Supabase (optional)
- Database: PostgreSQL (with pg driver)

---

## Build, Lint, and Test Commands

### Development
```bash
npm run dev
```
Starts Next.js dev server on `http://localhost:3000` with hot reload.

### Production Build
```bash
npm run build
npm start
```
Builds optimized production bundle and starts the server.

### Linting
```bash
npm run lint
```
Runs ESLint with Next.js rules (`extends: 'next/core-web-vitals'`). Fix issues with `npm run lint -- --fix`.

### Testing
**Note:** No automated test suite currently exists. Manual testing is documented in `TESTING_GUIDE.md` and `FT_INTEGRATION.md`.

For future testing, use Jest or Vitest. Until then:
1. Test components manually via `npm run dev`
2. Check console (F12) for runtime errors
3. Test price fetching via Network tab in DevTools

---

## Code Style & Conventions

### Imports
- Use TypeScript path aliases: `@/*` maps to `./src/*`
- Order: React/Next imports → third-party → local aliases → relative paths
- Prefer named imports over default when possible

**Example:**
```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Investment } from "@/lib/types";
import "./globals.css";
import { InvestmentProvider } from "@/context/InvestmentContext";
```

### Formatting
- Indentation: 4 spaces (enforce via ESLint)
- Line length: No strict limit; prefer readability
- Semicolons: Required
- Quotes: Double quotes for JSX/strings

### Types & Interfaces
- Use TypeScript strict mode (`strict: true` in tsconfig)
- Define types in `src/lib/types.ts`
- Use `interface` for object contracts, `type` for unions/aliases
- Mark props with `Readonly` when applicable
- Use optional chaining (`?.`) and nullish coalescing (`??`)

**Example from types.ts:**
```typescript
export interface Investment {
    id: string;
    name: string;
    isin: string;
    shares: number;
    initialInvestment: number;
    purchaseDate: string; // ISO Date YYYY-MM-DD
    currentPrice?: number;
    priceError?: boolean;
}
```

### Naming Conventions
- Components: PascalCase (`Header.tsx`, `AddInvestmentModal.tsx`)
- Hooks/utilities: camelCase (`fetchPriceByISIN`, `calculatePortfolioSummary`)
- Constants: UPPER_SNAKE_CASE (`const API_BASE_URL = ...`)
- Files: Match component/function names or use kebab-case for utils
- Context: Suffix with "Context" (`InvestmentContext.tsx`)

### Components
- Prefer functional components with hooks
- Use `'use client'` directive for client components (Next.js App Router)
- Props should be typed explicitly (no implicit `any`)
- Example:

```typescript
export default function Header({
    portfolioSummary,
    onRefresh,
}: {
    portfolioSummary: PortfolioSummary;
    onRefresh: () => Promise<void>;
}) {
    // Component logic
}
```

### Error Handling
- Use try-catch for async operations
- Validate API responses before using
- Show user-friendly error messages (avoid console logs in production)
- Example from priceService:

```typescript
try {
    const priceData = await fetchPriceByISIN(inv.isin);
    return { ...inv, currentPrice: priceData.price, priceError: false };
} catch (error) {
    console.error(`Failed to fetch price for ${inv.isin}:`, error);
    return { ...inv, priceError: true };
}
```

### Async/Promises
- Use async/await over `.then()` chains
- Handle rejected promises explicitly
- Use `Promise.all()` for parallel operations

### React Context
- Define context interfaces in the provider file
- Use `useContext()` hook for consumption
- Wrap high-level components with providers in `layout.tsx`

---

## Directory Structure

```
src/
├── app/                           # Next.js App Router
│   ├── api/                       # API routes
│   │   ├── price/route.ts         # Price fetching endpoint
│   │   └── fund-details/route.ts  # Fund data endpoint
│   ├── layout.tsx                 # Root layout with providers
│   ├── page.tsx                   # Home page (dashboard)
│   └── globals.css                # Global styles
├── components/                    # Reusable React components
│   ├── Header.tsx
│   ├── PortfolioSummary.tsx
│   ├── ChartsSection.tsx
│   ├── AddInvestmentModal.tsx
│   └── ... (others)
├── context/                       # React Context providers
│   └── InvestmentContext.tsx      # Global investment state
├── lib/                           # Utilities and helpers
│   ├── types.ts                   # TypeScript interfaces
│   ├── priceService.ts            # Price fetching logic
│   ├── calculations.ts            # Financial calculations
│   └── storage.ts                 # localStorage management
└── styles/                        # Additional CSS if needed
```

---

## Key Patterns & Best Practices

### State Management
- Use React Context API for global state (investments, portfolio summary, history)
- Persist investments to localStorage automatically on changes
- Avoid prop drilling; lift state up or use context

### API Calls
- Centralize API logic in `src/lib/priceService.ts`
- Use `fetch()` with error handling
- Set appropriate timeouts for external requests
- Return typed responses matching interfaces from `types.ts`

### Styling
- Use Tailwind CSS utility classes primarily
- Keep custom CSS in component-scoped CSS Modules or `globals.css`
- Color scheme: Dark mode with blue accents (`#4d94ff` palette)
- Semantic colors: Green for gains, Red for losses

### Form Handling
- Validate input before submission (e.g., ISIN must be 12 chars)
- Clear forms after successful submission
- Show loading states during async operations (spinners)
- Example: `AddInvestmentModal.tsx`

---

## ESLint Configuration

Current config extends `next/core-web-vitals`. To extend:
1. Edit `.eslintrc.js`
2. Add rules under `rules: { ... }`
3. Run `npm run lint` to verify

Example custom rules (if needed):
```javascript
module.exports = {
    extends: 'next/core-web-vitals',
    rules: {
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        '@typescript-eslint/no-unused-vars': 'error',
    },
};
```

---

## Environment Variables

Store in `.env.local` (never commit sensitive data):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
DATABASE_URL=...
```

Access in code:
```typescript
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
```

---

## Common Tasks for Agents

### Adding a New Feature
1. Create component in `src/components/`
2. Define types in `src/lib/types.ts` if needed
3. Add context logic in `src/context/InvestmentContext.tsx` if it affects global state
4. Style with Tailwind CSS
5. Test via `npm run dev`
6. Run `npm run lint` and fix issues
7. Update README or TESTING_GUIDE if user-facing

### Modifying Price Fetching
1. Edit `src/lib/priceService.ts`
2. Update API route in `src/app/api/price/route.ts` if needed
3. Test with ISINs from `TESTING_GUIDE.md`
4. Verify historical data fetching works

### Fixing Type Errors
1. Check error message from build output
2. Verify interface definitions in `types.ts`
3. Use `satisfies` keyword or `as const` for type narrowing
4. Run `npm run lint` to catch related issues

---

## Performance Considerations

- **Chart rendering:** Limit historical data points to ~100 for smooth rendering
- **API calls:** Cache price data; avoid repeated calls in quick succession
- **Re-renders:** Use React DevTools Profiler to identify unnecessary renders
- **Bundle size:** Monitor with `npm run build` output

---

## Debugging

1. **Dev server errors:** Check terminal output from `npm run dev`
2. **Type errors:** Run `npm run build` to see all TypeScript issues
3. **Lint issues:** Run `npm run lint` 
4. **Runtime issues:** Use DevTools Console (F12) and Network tab
5. **Context issues:** Use React DevTools extension to inspect context state

---

## File Modifications Checklist

When modifying core files:
- [ ] Types updated in `src/lib/types.ts` if interfaces change
- [ ] Context updated in `src/context/InvestmentContext.tsx` if state changes
- [ ] localStorage logic updated in `src/lib/storage.ts` if data structure changes
- [ ] All imports use `@/*` path aliases
- [ ] No console logs in production code (ok in dev/debugging)
- [ ] TypeScript strict mode compliance verified
- [ ] ESLint passes: `npm run lint`

---

**Last Updated:** 2024-02-08  
**Framework Version:** Next.js 15.1.4 | TypeScript 5.7.2
