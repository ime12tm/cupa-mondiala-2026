# Data Layer

This directory contains all data-fetching helper functions for the application.

## 📖 Documentation

**REQUIRED READING:** See `docs/data-fetching.md` for complete data fetching patterns and security requirements.

## Directory Structure

```
src/data/
├── README.md               # This file
├── predictions.ts          # User predictions (user-scoped)
├── matches.ts              # Match data (public)
├── users.ts                # User profiles (user-scoped)
└── admin/                  # Admin-only queries
    └── users.ts            # All users (admin-only)
```

## Key Principles

### 1. Server Components Only

ALL data fetching MUST be done in React Server Components. Never use:
- ❌ Route handlers (`src/app/api/`)
- ❌ Client components with `useEffect` + `fetch`
- ❌ Client-side data libraries

### 2. User Data Isolation

Functions that return user-specific data MUST filter by `userId`:

```ts
// ✅ CORRECT - User-scoped
export async function getUserPredictions(userId: string) {
  return db.query.predictions.findMany({
    where: eq(predictions.userId, userId),  // Required!
  });
}

// ❌ WRONG - No user filter
export async function getAllPredictions() {
  return db.query.predictions.findMany();  // Security violation!
}
```

### 3. Drizzle ORM Only

Use Drizzle ORM for all queries. Raw SQL is prohibited:

```ts
// ✅ CORRECT - Drizzle ORM
return db.query.users.findMany({
  where: eq(users.userId, userId),
  orderBy: [desc(users.totalPoints)],
});

// ❌ WRONG - Raw SQL
return db.execute('SELECT * FROM users WHERE user_id = $1', [userId]);
```

### 4. Function Naming

- `getUserX()` — User-scoped (requires userId parameter)
- `getX()` — Public data (no userId needed)
- `getAllX()` — Admin-only (returns all data)

## Examples

### User-Scoped Query

```ts
// src/data/predictions.ts
export async function getUserPredictions(userId: string) {
  return db.query.predictions.findMany({
    where: eq(predictions.userId, userId),
    with: { match: true },
  });
}
```

### Public Query

```ts
// src/data/matches.ts
export async function getMatches() {
  return db.query.matches.findMany({
    with: { homeTeam: true, awayTeam: true },
  });
}
```

### Admin Query

```ts
// src/data/admin/users.ts
export async function getAllUsers() {
  // SECURITY: Caller MUST verify admin before calling
  return db.query.users.findMany();
}
```

## Usage in Server Components

```tsx
// src/app/my-predictions/page.tsx
import { auth } from '@clerk/nextjs/server';
import { getUserPredictions } from '@/data/predictions';

export default async function MyPredictionsPage() {
  const { userId } = await auth();

  if (!userId) {
    return <div>Please sign in</div>;
  }

  // ✅ Fetch data using helper function
  const predictions = await getUserPredictions(userId);

  return <div>{/* Render predictions */}</div>;
}
```

## Migration from Legacy Code

Legacy queries in `src/db/queries.ts` should be migrated to this directory:

1. Create new file in `src/data/` (e.g., `predictions.ts`)
2. Move function from `src/db/queries.ts`
3. **Verify security:** Ensure user-scoped queries filter by `userId`
4. Update imports in consuming components
5. Delete old function from `src/db/queries.ts`

## Security Checklist

Before merging any data-fetching code:

- [ ] ✅ Uses React Server Component (not route handler/client component)
- [ ] ✅ Uses helper function from `src/data/`
- [ ] ✅ Uses Drizzle ORM (no raw SQL)
- [ ] ✅ User-scoped data filters by `userId`
- [ ] ✅ Admin queries have admin verification in caller
- [ ] ✅ Function follows naming conventions

## Questions?

See `docs/data-fetching.md` for complete documentation.
