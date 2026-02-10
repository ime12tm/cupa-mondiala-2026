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

## Documentation-First Approach

**ALWAYS consult the `/docs` directory before writing any code.** These documentation files define **mandatory conventions** that override general practices and must be followed exactly.

**Available Documentation:**

- `docs/ui.md` — UI coding standards (shadcn/ui components, date formatting, inline composition patterns)
- `docs/data-fetching.md` — **CRITICAL** Data fetching and database security patterns (server components, user data isolation, Drizzle ORM)
- `docs/data-mutations.md` — **CRITICAL** Data mutations with server actions (Zod validation, user isolation, two-layer architecture)
- `docs/auth.md` — Authentication patterns with Clerk (server/client auth, protected routes, admin access)
- _(More docs will be added as the project grows)_

**Workflow:**

1. **Before starting any implementation**, check if there's a relevant doc file in `/docs`
2. **Read the entire documentation file** to understand all conventions
3. **Apply those standards strictly** when writing code
4. If conventions conflict, the `/docs` files take precedence

**Example:** Before building any UI component, read `docs/ui.md` in full to understand component patterns, styling conventions, and date handling requirements.

## Tech Stack

- **Next.js 16.1.6** — App Router, React 19, Server Actions
- **TypeScript 5** — strict mode enabled
- **Tailwind CSS v4** — imported via `@import "tailwindcss"` in `globals.css` (no `tailwind.config.js` needed; uses CSS-based config with `@theme inline`)
- **Geist** fonts (Sans + Mono) loaded via `next/font/google`, exposed as CSS variables `--font-geist-sans` / `--font-geist-mono`
- **Clerk** — authentication via `@clerk/nextjs`
- **Drizzle ORM** — type-safe database queries with PostgreSQL
- **Neon** — serverless PostgreSQL database
- **Zod** — schema validation for server actions (mandatory for all mutations)

## Project Layout

All source lives under `src/` using the Next.js App Router file conventions:

**App Directory:**

- `src/app/layout.tsx` — root layout (fonts, global CSS, metadata, Clerk auth UI)
- `src/app/page.tsx` — home page
- `src/app/globals.css` — global styles; defines `--background` / `--foreground` CSS vars with dark-mode override via `@media (prefers-color-scheme: dark)`
- `src/app/**/actions.ts` — Server Actions (colocated with pages, see `docs/data-mutations.md`)
- `src/app/api/` — API routes (webhooks only, NOT for data fetching)
  - `src/app/api/webhooks/clerk/route.ts` — Clerk user sync webhook
  - `src/app/api/test/route.ts` — Database test endpoint
- `src/middleware.ts` — Clerk authentication middleware using `clerkMiddleware()`

**Database:**

- `src/db/schema.ts` — Drizzle ORM schema (7 tables: users, teams, venues, matches, predictions, tournament_stages, leaderboard_snapshots)
- `src/db/index.ts` — Database connection (Neon serverless)
- `src/data/` — **Data fetching helper functions** (NEW pattern - use this for all queries)
- `src/db/queries.ts` — Legacy query functions (migrate to `src/data/`)
- `src/db/seed.ts` — Database seeding script
- `drizzle.config.ts` — Drizzle Kit configuration
- `drizzle/` — Auto-generated migration files

## Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`). Use this for all internal imports.

## Authentication

The app uses **Clerk** for authentication via `@clerk/nextjs`.

**Key Files:**

- `src/middleware.ts` - Route protection with `clerkMiddleware()`
- `src/app/layout.tsx` - `<ClerkProvider>` wrapper
- `src/app/api/webhooks/clerk/route.ts` - User database sync webhook
- `docs/auth.md` - **MANDATORY** authentication patterns and security

**Environment Variables Required:**

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_SECRET_KEY` - Clerk secret key
- `CLERK_WEBHOOK_SECRET` - Webhook signature verification

Get keys from [Clerk Dashboard → API Keys](https://dashboard.clerk.com/last-active?path=api-keys)

**Common Patterns:**

- Server Components: Use `await auth()` to get `userId`
- Client Components: Use `useAuth()` or `useUser()` hooks
- Protected Pages: Check `userId` and redirect if not authenticated
- Admin Pages: Verify admin status before showing data

See `docs/auth.md` for complete authentication patterns.

## Database

The app uses **Drizzle ORM** with **Neon** (serverless PostgreSQL).

**Key Files:**

- `src/db/schema.ts` - Table definitions and relations
- `src/data/` - Data fetching helper functions (see `docs/data-fetching.md`)
- `src/db/queries.ts` - Legacy query functions (migrate to `src/data/`)
- `DATABASE.md` - Full schema documentation
- `docs/data-fetching.md` - **MANDATORY** data fetching and security patterns

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

- **IMPORTANT**: **Before writing any code, ALWAYS check the `/docs` directory for relevant standards documentation. These docs contain mandatory conventions that must be followed.**
  - `docs/ui.md` for UI components
  - `docs/data-fetching.md` for **ANY data fetching or database queries** (CRITICAL for security)
  - `docs/data-mutations.md` for **ANY data mutations** (create, update, delete) (CRITICAL for security)
  - `docs/auth.md` for **ANY authentication-related code** (Clerk integration, protected routes)

- **Data Fetching (CRITICAL)**: ALL data fetching MUST be done via React Server Components using helper functions from `src/data/`. NEVER use route handlers or client-side fetching. User data MUST be filtered by `userId` to prevent unauthorized access. Read `docs/data-fetching.md` before writing any database queries.

- **Data Mutations (CRITICAL)**: ALL data mutations MUST be done via Server Actions in colocated `actions.ts` files. ALL server action inputs MUST be validated with Zod. Server actions MUST call helper functions from `src/data/` (never direct DB calls). User data MUST be filtered by `userId`. Read `docs/data-mutations.md` before writing any create/update/delete operations.

- **Authentication (CRITICAL)**: This app uses Clerk for authentication. ALWAYS use `await auth()` in Server Components to check authentication. ALWAYS verify `userId` before accessing user data. Protected routes MUST redirect unauthenticated users. Read `docs/auth.md` before writing any auth-related code.

- Dark mode is handled via the CSS `prefers-color-scheme` media query, **not** a class-based strategy. New components should use the `--background` / `--foreground` CSS variables or Tailwind's `dark:` variant accordingly.
- `next.config.ts` is currently empty — add Next.js options there as needed.
- `.env*` files are gitignored. Use `.env.local` for local secrets; add a `.env.example` if new env vars are introduced.
