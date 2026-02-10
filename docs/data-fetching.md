# Data Fetching & Database Queries

**CRITICAL REQUIREMENTS** — These rules are mandatory for security and architectural consistency.

---

## Core Principle: Server Components Only

**ALL data fetching in this application MUST be done via React Server Components.**

### ✅ CORRECT: Server Components

```tsx
// src/app/my-predictions/page.tsx
import { db } from '@/db';
import { auth } from '@clerk/nextjs/server';
import { getUserPredictions } from '@/data/predictions';

export default async function MyPredictionsPage() {
  const { userId } = await auth();

  // ✅ Fetch data directly in server component
  const predictions = await getUserPredictions(userId);

  return <div>{/* Render predictions */}</div>;
}
```

### ❌ INCORRECT: Route Handlers

```tsx
// ❌ DO NOT DO THIS - No API routes for data fetching
// src/app/api/predictions/route.ts
export async function GET(request: Request) {
  const predictions = await db.query.predictions.findMany();
  return Response.json(predictions);
}
```

### ❌ INCORRECT: Client Components with useEffect

```tsx
// ❌ DO NOT DO THIS - No client-side data fetching
'use client';
import { useEffect, useState } from 'react';

export function Predictions() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('/api/predictions')
      .then(res => res.json())
      .then(setData);
  }, []);

  return <div>{/* ... */}</div>;
}
```

---

## Database Query Patterns

### Rule 1: Helper Functions in `/data` Directory

**ALL database queries MUST be abstracted into helper functions located in `src/data/`.**

**NEVER write direct database queries in page components or other files.**

#### ✅ CORRECT: Helper Function Pattern

```tsx
// src/data/predictions.ts
import { db } from '@/db';
import { predictions } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Get all predictions for a specific user
 * @param userId - Clerk user ID (string)
 * @returns User's predictions with related match data
 */
export async function getUserPredictions(userId: string) {
  return db.query.predictions.findMany({
    where: eq(predictions.userId, userId),
    with: {
      match: {
        with: {
          homeTeam: true,
          awayTeam: true,
          venue: true,
          stage: true,
        },
      },
    },
    orderBy: (predictions, { desc }) => [desc(predictions.createdAt)],
  });
}
```

```tsx
// src/app/my-predictions/page.tsx
import { auth } from '@clerk/nextjs/server';
import { getUserPredictions } from '@/data/predictions';

export default async function MyPredictionsPage() {
  const { userId } = await auth();
  if (!userId) return <div>Please sign in</div>;

  // ✅ Use helper function
  const predictions = await getUserPredictions(userId);

  return <div>{/* Render predictions */}</div>;
}
```

#### ❌ INCORRECT: Direct Database Queries in Pages

```tsx
// ❌ DO NOT DO THIS - No direct DB queries in pages
import { db } from '@/db';
import { predictions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default async function MyPredictionsPage() {
  const { userId } = await auth();

  // ❌ WRONG - Query should be in src/data/ helper
  const userPredictions = await db.query.predictions.findMany({
    where: eq(predictions.userId, userId),
  });

  return <div>{/* ... */}</div>;
}
```

### Rule 2: Use Drizzle ORM — NO RAW SQL

**ALL database queries MUST use Drizzle ORM. Raw SQL is prohibited.**

#### ✅ CORRECT: Drizzle ORM

```tsx
// src/data/leaderboard.ts
import { db } from '@/db';
import { users } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function getLeaderboard(limit: number = 100) {
  return db.query.users.findMany({
    orderBy: [desc(users.totalPoints)],
    limit,
  });
}
```

#### ❌ INCORRECT: Raw SQL

```tsx
// ❌ DO NOT DO THIS - No raw SQL queries
import { db } from '@/db';

export async function getLeaderboard() {
  // ❌ WRONG - Use Drizzle ORM instead
  const result = await db.execute(
    'SELECT * FROM users ORDER BY total_points DESC LIMIT 100'
  );
  return result;
}
```

---

## Security: Data Isolation

**CRITICAL SECURITY RULE:** A logged-in user can ONLY access their own data. Users MUST NOT be able to access other users' data.

**Exception:** Admin users can access all data.

### Rule 3: Always Filter by User ID

**Every data-fetching helper function MUST filter by the authenticated user's ID.**

#### ✅ CORRECT: User-Scoped Query

```tsx
// src/data/predictions.ts
import { db } from '@/db';
import { predictions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Get a specific prediction for a user
 * SECURITY: Only returns prediction if it belongs to the user
 */
export async function getUserPrediction(userId: string, matchId: number) {
  return db.query.predictions.findFirst({
    where: and(
      eq(predictions.userId, userId),      // ✅ REQUIRED - Filter by user
      eq(predictions.matchId, matchId)
    ),
  });
}
```

#### ❌ INCORRECT: No User Filtering

```tsx
// ❌ SECURITY VIOLATION - Missing user filter
export async function getPrediction(matchId: number) {
  return db.query.predictions.findFirst({
    where: eq(predictions.matchId, matchId),  // ❌ WRONG - No userId filter
  });
}
```

### Rule 4: Admin-Only Queries

Admin functions should be clearly marked and include admin checks.

#### ✅ CORRECT: Admin Query Pattern

```tsx
// src/data/admin/users.ts
import { db } from '@/db';
import { users } from '@/db/schema';

/**
 * Get all users (ADMIN ONLY)
 * @param adminUserId - Must be verified as admin before calling
 */
export async function getAllUsers() {
  // Note: Admin verification should happen in the calling component
  // using auth() and checking against admin list
  return db.query.users.findMany({
    orderBy: (users, { desc }) => [desc(users.totalPoints)],
  });
}
```

```tsx
// src/app/admin/users/page.tsx
import { auth } from '@clerk/nextjs/server';
import { getAllUsers } from '@/data/admin/users';
import { redirect } from 'next/navigation';

const ADMIN_USER_IDS = [
  'user_xxx', // Replace with actual admin Clerk IDs
];

export default async function AdminUsersPage() {
  const { userId } = await auth();

  // ✅ REQUIRED - Verify admin before accessing admin data
  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    redirect('/');
  }

  const users = await getAllUsers();

  return <div>{/* Render all users */}</div>;
}
```

---

## Organizing Data Helper Functions

### Directory Structure

```
src/
├── data/                    # ✅ All data-fetching helpers
│   ├── predictions.ts       # User predictions queries
│   ├── matches.ts           # Matches queries (public data)
│   ├── leaderboard.ts       # Leaderboard queries
│   ├── groups.ts            # Group standings queries
│   └── admin/               # Admin-only queries
│       ├── users.ts
│       └── analytics.ts
├── db/
│   ├── schema.ts            # Database schema definitions
│   ├── index.ts             # Database connection
│   └── queries.ts           # Legacy queries (migrate to /data)
└── app/
    └── [pages using data helpers]
```

### Naming Conventions

**Helper functions should be named based on their scope:**

- `getUserX()` — Returns data for a specific user (user-scoped)
- `getX()` — Returns public data (not user-scoped)
- `getAllX()` — Returns all records (admin-only, usually)

**Examples:**

```tsx
// User-scoped (requires userId parameter)
getUserPredictions(userId: string)
getUserStats(userId: string)
getUserPrediction(userId: string, matchId: number)

// Public data (no userId needed)
getMatches()
getMatch(matchId: number)
getGroupStandings(groupName: string)

// Admin-only (no userId filter, returns all data)
getAllUsers()
getAllPredictions()
```

---

## Public vs Private Data

### Public Data (No Authentication Required)

Some data is public and doesn't require user filtering:

- **Matches** — Tournament schedule
- **Teams** — Team information
- **Venues** — Stadium details
- **Tournament Stages** — Stage definitions
- **Group Standings** — Calculated group tables

```tsx
// src/data/matches.ts
export async function getMatches() {
  // ✅ No userId needed - public data
  return db.query.matches.findMany({
    orderBy: (matches, { asc }) => [asc(matches.scheduledAt)],
    with: {
      homeTeam: true,
      awayTeam: true,
      venue: true,
      stage: true,
    },
  });
}
```

### Private Data (Authentication Required)

User-specific data MUST be filtered:

- **Predictions** — User's match predictions
- **User profile** — User settings/stats
- **Leaderboard position** — User's rank

```tsx
// src/data/predictions.ts
export async function getUserPredictions(userId: string) {
  // ✅ userId required - private data
  return db.query.predictions.findMany({
    where: eq(predictions.userId, userId),
    // ...
  });
}
```

---

## Migration Path

**Current state:** Some queries exist in `src/db/queries.ts`

**Target state:** All data-fetching logic should move to `src/data/`

### How to Migrate

1. **Create new file** in `src/data/` for the domain (e.g., `predictions.ts`)
2. **Move query logic** from `src/db/queries.ts` to the new file
3. **Update imports** in consuming components
4. **Verify security:** Ensure user-scoped queries filter by `userId`
5. **Delete old function** from `src/db/queries.ts`

---

## Summary Checklist

Before writing any data-fetching code, verify:

- [ ] ✅ Data is fetched in a **React Server Component** (not route handler, not client component)
- [ ] ✅ Database query uses a **helper function from `src/data/`**
- [ ] ✅ Helper function uses **Drizzle ORM** (no raw SQL)
- [ ] ✅ User-scoped data is **filtered by `userId`**
- [ ] ✅ Admin-only queries have **admin verification** in the calling component
- [ ] ✅ Function naming follows conventions (`getUserX`, `getX`, `getAllX`)
- [ ] ✅ Security reviewed: Users cannot access other users' data

---

## Why These Rules Matter

1. **Security:** Prevents unauthorized data access and data leaks
2. **Performance:** Server components eliminate client-side waterfalls
3. **Maintainability:** Centralized queries are easier to update and test
4. **Type Safety:** Drizzle ORM provides full TypeScript typing
5. **Consistency:** Single pattern across the entire application

**When in doubt, ask:** "Could this query accidentally expose another user's data?" If yes, add user filtering.
