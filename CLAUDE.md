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

## Project Layout

All source lives under `src/app/` using the Next.js App Router file conventions:

- `src/app/layout.tsx` — root layout (fonts, global CSS, metadata)
- `src/app/page.tsx` — home page (the only page so far)
- `src/app/globals.css` — global styles; defines `--background` / `--foreground` CSS vars with dark-mode override via `@media (prefers-color-scheme: dark)`

## Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`). Use this for all internal imports.

## Key Conventions

- Dark mode is handled via the CSS `prefers-color-scheme` media query, **not** a class-based strategy. New components should use the `--background` / `--foreground` CSS variables or Tailwind's `dark:` variant accordingly.
- `next.config.ts` is currently empty — add Next.js options there as needed.
- `.env*` files are gitignored. Use `.env.local` for local secrets; add a `.env.example` if new env vars are introduced.
