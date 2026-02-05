# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with Turbo (http://localhost:3000)
npm run build     # Production build
npm run start     # Run production build
npm run lint      # ESLint (flat config, eslint.config.mjs)
```

No test runner is configured. If tests are added later, update this section.

## Tech Stack

- **Next.js 16.1.6** — App Router, React 19
- **TypeScript 5** — strict mode enabled
- **Tailwind CSS v4** — imported via `@import "tailwindcss"` in `globals.css` (no `tailwind.config.js` needed; uses CSS-based config with `@theme inline`)
- **Geist** fonts (Sans + Mono) loaded via `next/font/google`, exposed as CSS variables `--font-geist-sans` / `--font-geist-mono`
- **Clerk** — authentication via `@clerk/nextjs`
- **Drizzle ORM** — type-safe database queries with PostgreSQL
- **Neon** — serverless PostgreSQL database

## Project Layout

All source lives under `src/` using the Next.js App Router file conventions:

**App Directory:**
- `src/app/layout.tsx` — root layout (fonts, global CSS, metadata, Clerk auth UI)
- `src/app/page.tsx` — home page
- `src/app/globals.css` — global styles; defines `--background` / `--foreground` CSS vars with dark-mode override via `@media (prefers-color-scheme: dark)`
- `src/app/api/` — API routes
  - `src/app/api/webhooks/clerk/route.ts` — Clerk user sync webhook
  - `src/app/api/test/route.ts` — Database test endpoint
- `src/middleware.ts` — Clerk authentication middleware using `clerkMiddleware()`

**Database:**
- `src/db/schema.ts` — Drizzle ORM schema (7 tables: users, teams, venues, matches, predictions, tournament_stages, leaderboard_snapshots)
- `src/db/index.ts` — Database connection (Neon serverless)
- `src/db/queries.ts` — Reusable query functions and business logic
- `src/db/seed.ts` — Database seeding script
- `drizzle.config.ts` — Drizzle Kit configuration
- `drizzle/` — Auto-generated migration files

## Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`). Use this for all internal imports.

## Authentication

Clerk is configured using the App Router approach:

- `src/middleware.ts` uses `clerkMiddleware()` from `@clerk/nextjs/server`
- `src/app/layout.tsx` wraps the app with `<ClerkProvider>`
- Auth UI components (`<SignInButton>`, `<SignUpButton>`, `<UserButton>`, `<SignedIn>`, `<SignedOut>`) are in the header
- Users are automatically synced to the database via Clerk webhooks (`src/app/api/webhooks/clerk/route.ts`)
- Environment variables required in `.env.local`:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `CLERK_WEBHOOK_SECRET` (for webhook verification)
- Get keys from [Clerk Dashboard → API Keys](https://dashboard.clerk.com/last-active?path=api-keys)

## Database

The app uses **Drizzle ORM** with **Neon** (serverless PostgreSQL).

**Key Files:**
- `src/db/schema.ts` - Table definitions and relations
- `src/db/queries.ts` - Reusable query functions
- `DATABASE.md` - Full schema documentation

**Schema Overview:**
- **users** - Synced from Clerk, tracks total points
- **tournament_stages** - 6 stages with point multipliers (1.0x to 3.0x)
- **teams** - 48 teams in 12 groups (A-L)
- **venues** - 16 stadiums across USA, Canada, Mexico
- **matches** - 104 tournament matches with timezone support
- **predictions** - User predictions (scores + 1/X/2 result), locked at kickoff
- **leaderboard_snapshots** - Pre-computed leaderboard data

**Common Commands:**
```bash
npx drizzle-kit studio        # Open database GUI
npx drizzle-kit generate      # Generate migration
npx drizzle-kit push          # Push schema to database
npx tsx src/db/seed.ts        # Seed database
```

**Environment Variable Required:**
- `DATABASE_URL` - Neon PostgreSQL connection string

## Key Conventions

- Dark mode is handled via the CSS `prefers-color-scheme` media query, **not** a class-based strategy. New components should use the `--background` / `--foreground` CSS variables or Tailwind's `dark:` variant accordingly.
- `next.config.ts` is currently empty — add Next.js options there as needed.
- `.env*` files are gitignored. Use `.env.local` for local secrets; add a `.env.example` if new env vars are introduced.
