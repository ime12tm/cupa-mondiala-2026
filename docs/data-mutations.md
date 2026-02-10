# Data Mutations

**CRITICAL REQUIREMENTS** — These rules are mandatory for security and architectural consistency.

---

## Core Principle: Server Actions Only

**ALL data mutations (create, update, delete) MUST be done via Server Actions.**

Server Actions are asynchronous functions that run on the server and can be called from Client Components or Server Components.

### Why Server Actions?

1. **Security** — Mutations run server-side, client can't bypass validation
2. **Type Safety** — Full TypeScript support from client to server
3. **Progressive Enhancement** — Forms work without JavaScript
4. **Simplified API** — No need for API routes or manual fetch calls
5. **Automatic Revalidation** — Built-in cache invalidation

---

## Architecture: Two-Layer Pattern

**ALL data mutations follow this two-layer architecture:**

```
Client Component
  ↓ calls
Server Action (actions.ts)
  ↓ validates with Zod
  ↓ calls
Data Helper (src/data/)
  ↓ uses Drizzle ORM
Database
```

### Layer 1: Server Actions (`actions.ts`)

**Responsibilities:**
- ✅ Validate input with Zod schemas
- ✅ Check authentication (`await auth()`)
- ✅ Verify authorization (user owns data, admin check)
- ✅ Call data helper functions
- ✅ Handle errors and return typed results
- ✅ Revalidate cache if needed

**Location:** Colocated with the component that uses it

```
src/app/
├── my-predictions/
│   ├── page.tsx           # Server Component
│   ├── prediction-form.tsx # Client Component
│   └── actions.ts         # ✅ Server Actions (colocated)
├── matches/
│   ├── page.tsx
│   └── actions.ts         # ✅ Server Actions (colocated)
```

### Layer 2: Data Helpers (`src/data/`)

**Responsibilities:**
- ✅ Execute database operations via Drizzle ORM
- ✅ Implement business logic
- ✅ Return typed results

**Location:** Organized by domain in `src/data/`

```
src/data/
├── predictions.ts         # Prediction mutations
├── matches.ts            # Match mutations (admin)
├── users.ts              # User profile mutations
└── admin/
    └── predictions.ts    # Admin prediction mutations
```

---

## Server Actions Pattern

### File Structure

Server Actions MUST be in colocated `actions.ts` files:

```tsx
// src/app/my-predictions/actions.ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createPrediction } from '@/data/predictions';

// ✅ Define Zod schema for input validation
const createPredictionSchema = z.object({
  matchId: z.number().int().positive(),
  homeScore: z.number().int().min(0).max(20),
  awayScore: z.number().int().min(0).max(20),
});

// ✅ Server action with typed params (NOT FormData)
export async function createPredictionAction(input: {
  matchId: number;
  homeScore: number;
  awayScore: number;
}) {
  // 1. Authenticate user
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  // 2. Validate input with Zod
  const validation = createPredictionSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: 'Invalid input',
      issues: validation.error.issues,
    };
  }

  const { matchId, homeScore, awayScore } = validation.data;

  try {
    // 3. Call data helper function
    const prediction = await createPrediction({
      userId,
      matchId,
      homeScore,
      awayScore,
    });

    // 4. Revalidate cache
    revalidatePath('/my-predictions');
    revalidatePath(`/matches/${matchId}`);

    // 5. Return success result
    return { success: true, data: prediction };
  } catch (error) {
    console.error('Error creating prediction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create prediction',
    };
  }
}
```

### Required 'use server' Directive

**CRITICAL:** Every `actions.ts` file MUST start with `'use server';`

```tsx
// ✅ CORRECT
'use server';

import { auth } from '@clerk/nextjs/server';
// ... rest of file

export async function myAction() {
  // ...
}
```

```tsx
// ❌ WRONG - Missing 'use server'
import { auth } from '@clerk/nextjs/server';

export async function myAction() {
  // This will NOT work as a server action
}
```

---

## Zod Validation (MANDATORY)

**ALL server actions MUST validate input with Zod.**

### Basic Validation

```tsx
import { z } from 'zod';

// Define schema
const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100),
  email: z.string().email(),
});

export async function updateProfileAction(input: {
  displayName: string;
  email: string;
}) {
  // Validate
  const validation = updateProfileSchema.safeParse(input);

  if (!validation.success) {
    return {
      success: false,
      error: 'Invalid input',
      issues: validation.error.issues,
    };
  }

  // Use validated data
  const { displayName, email } = validation.data;

  // ... rest of action
}
```

### Advanced Validation

```tsx
const createPredictionSchema = z.object({
  matchId: z.number().int().positive(),
  homeScore: z.number().int().min(0).max(20),
  awayScore: z.number().int().min(0).max(20),
}).refine(
  (data) => {
    // Custom validation: scores can't both be > 10 (unrealistic)
    return !(data.homeScore > 10 && data.awayScore > 10);
  },
  {
    message: 'Both scores cannot exceed 10',
  }
);
```

### Validation with Transformations

```tsx
const updateMatchSchema = z.object({
  matchId: z.number().int().positive(),
  homeScore: z.string().transform(Number), // Transform string to number
  awayScore: z.string().transform(Number),
  status: z.enum(['scheduled', 'live', 'finished']),
});
```

### Reusing Schemas

```tsx
// src/lib/validations.ts
export const predictionSchema = z.object({
  matchId: z.number().int().positive(),
  homeScore: z.number().int().min(0).max(20),
  awayScore: z.number().int().min(0).max(20),
});

// src/app/my-predictions/actions.ts
import { predictionSchema } from '@/lib/validations';

export async function createPredictionAction(
  input: z.infer<typeof predictionSchema>
) {
  const validation = predictionSchema.safeParse(input);
  // ...
}
```

---

## Data Helper Functions

### Mutation Helpers in `src/data/`

Data helper functions handle the actual database operations.

#### ✅ CORRECT: User-Scoped Mutation

```tsx
// src/data/predictions.ts
import { db } from '@/db';
import { predictions, type NewPrediction } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Create a new prediction for a user
 * SECURITY: Requires userId - user can only create their own predictions
 */
export async function createPrediction(data: {
  userId: string;
  matchId: number;
  homeScore: number;
  awayScore: number;
}) {
  const result = calculateResult(data.homeScore, data.awayScore);

  const [prediction] = await db
    .insert(predictions)
    .values({
      userId: data.userId,
      matchId: data.matchId,
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      result,
      isLocked: false,
      pointsEarned: null,
    })
    .returning();

  return prediction;
}

/**
 * Update a prediction for a user
 * SECURITY: Filters by BOTH userId AND predictionId
 */
export async function updatePrediction(data: {
  userId: string;
  predictionId: number;
  homeScore: number;
  awayScore: number;
}) {
  const result = calculateResult(data.homeScore, data.awayScore);

  const [updated] = await db
    .update(predictions)
    .set({
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      result,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(predictions.id, data.predictionId),
        eq(predictions.userId, data.userId) // ✅ REQUIRED - User filter
      )
    )
    .returning();

  if (!updated) {
    throw new Error('Prediction not found or access denied');
  }

  return updated;
}

/**
 * Delete a prediction for a user
 * SECURITY: Filters by BOTH userId AND predictionId
 */
export async function deletePrediction(data: {
  userId: string;
  predictionId: number;
}) {
  const [deleted] = await db
    .delete(predictions)
    .where(
      and(
        eq(predictions.id, data.predictionId),
        eq(predictions.userId, data.userId) // ✅ REQUIRED - User filter
      )
    )
    .returning();

  if (!deleted) {
    throw new Error('Prediction not found or access denied');
  }

  return deleted;
}

// Helper function
function calculateResult(homeScore: number, awayScore: number): '1' | 'X' | '2' {
  if (homeScore > awayScore) return '1';
  if (homeScore === awayScore) return 'X';
  return '2';
}
```

#### ❌ INCORRECT: Missing User Filter

```tsx
// ❌ SECURITY VIOLATION - No userId filter
export async function updatePrediction(data: {
  predictionId: number;
  homeScore: number;
  awayScore: number;
}) {
  const [updated] = await db
    .update(predictions)
    .set({
      homeScore: data.homeScore,
      awayScore: data.awayScore,
    })
    .where(eq(predictions.id, data.predictionId)) // ❌ Missing userId filter
    .returning();

  return updated;
}
```

---

## Complete Example: Create Prediction

### 1. Data Helper (`src/data/predictions.ts`)

```tsx
// src/data/predictions.ts
import { db } from '@/db';
import { predictions, matches } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function createPrediction(data: {
  userId: string;
  matchId: number;
  homeScore: number;
  awayScore: number;
}) {
  // Check if match exists and is not started
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, data.matchId),
  });

  if (!match) {
    throw new Error('Match not found');
  }

  if (match.status !== 'scheduled') {
    throw new Error('Cannot predict for a match that has started or finished');
  }

  // Check if prediction already exists
  const existing = await db.query.predictions.findFirst({
    where: and(
      eq(predictions.userId, data.userId),
      eq(predictions.matchId, data.matchId)
    ),
  });

  if (existing) {
    throw new Error('Prediction already exists for this match');
  }

  // Calculate result
  const result =
    data.homeScore > data.awayScore
      ? '1'
      : data.homeScore === data.awayScore
      ? 'X'
      : '2';

  // Create prediction
  const [prediction] = await db
    .insert(predictions)
    .values({
      userId: data.userId,
      matchId: data.matchId,
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      result,
      isLocked: false,
      pointsEarned: null,
    })
    .returning();

  return prediction;
}
```

### 2. Server Action (`src/app/my-predictions/actions.ts`)

```tsx
// src/app/my-predictions/actions.ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createPrediction } from '@/data/predictions';

const createPredictionSchema = z.object({
  matchId: z.number().int().positive(),
  homeScore: z.number().int().min(0).max(20),
  awayScore: z.number().int().min(0).max(20),
});

type CreatePredictionInput = z.infer<typeof createPredictionSchema>;

export async function createPredictionAction(input: CreatePredictionInput) {
  // 1. Authenticate
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  // 2. Validate
  const validation = createPredictionSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: 'Invalid input',
      issues: validation.error.issues,
    };
  }

  const { matchId, homeScore, awayScore } = validation.data;

  // 3. Execute mutation
  try {
    const prediction = await createPrediction({
      userId,
      matchId,
      homeScore,
      awayScore,
    });

    // 4. Revalidate cache
    revalidatePath('/my-predictions');
    revalidatePath(`/matches/${matchId}`);

    return { success: true, data: prediction };
  } catch (error) {
    console.error('Error creating prediction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create prediction',
    };
  }
}
```

### 3. Client Component (`src/app/my-predictions/prediction-form.tsx`)

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPredictionAction } from './actions';

export function PredictionForm({ matchId }: { matchId: number }) {
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Call server action
    const result = await createPredictionAction({
      matchId,
      homeScore,
      awayScore,
    });

    if (result.success) {
      // Success - redirect or show success message
      router.push('/my-predictions');
    } else {
      // Error - show error message
      setError(result.error);
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex gap-4">
        <Input
          type="number"
          min={0}
          max={20}
          value={homeScore}
          onChange={(e) => setHomeScore(Number(e.target.value))}
          disabled={isSubmitting}
        />
        <Input
          type="number"
          min={0}
          max={20}
          value={awayScore}
          onChange={(e) => setAwayScore(Number(e.target.value))}
          disabled={isSubmitting}
        />
      </div>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Prediction'}
      </Button>
    </form>
  );
}
```

---

## Return Types from Server Actions

Server actions should return a consistent result object:

### Standard Result Type

```tsx
// src/lib/types.ts
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; issues?: Array<{ message: string }> };
```

### Usage

```tsx
export async function createPredictionAction(
  input: CreatePredictionInput
): Promise<ActionResult<Prediction>> {
  // ... validation and authentication

  try {
    const prediction = await createPrediction({
      userId,
      matchId,
      homeScore,
      awayScore,
    });

    revalidatePath('/my-predictions');

    return { success: true, data: prediction };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### Client-Side Handling

```tsx
const result = await createPredictionAction(input);

if (result.success) {
  // TypeScript knows result.data exists
  console.log('Created:', result.data);
} else {
  // TypeScript knows result.error exists
  console.error('Error:', result.error);
}
```

---

## Cache Revalidation

After mutations, revalidate affected pages/data.

### Revalidate Path

```tsx
import { revalidatePath } from 'next/cache';

export async function updatePredictionAction(input: UpdatePredictionInput) {
  // ... validation and mutation

  // Revalidate specific paths
  revalidatePath('/my-predictions');
  revalidatePath(`/matches/${matchId}`);
  revalidatePath('/'); // Home page if it shows predictions

  return { success: true, data: updated };
}
```

### Revalidate Tag (Advanced)

```tsx
import { revalidateTag } from 'next/cache';

export async function updatePredictionAction(input: UpdatePredictionInput) {
  // ... validation and mutation

  // Revalidate all data tagged with 'predictions'
  revalidateTag('predictions');
  revalidateTag(`match-${matchId}`);

  return { success: true, data: updated };
}
```

**Note:** To use tags, you must add them when fetching:

```tsx
// In data helper
const predictions = await fetch('/api/predictions', {
  next: { tags: ['predictions'] },
});
```

---

## Security Patterns

### Pattern 1: User Ownership Check

```tsx
export async function updatePredictionAction(input: {
  predictionId: number;
  homeScore: number;
  awayScore: number;
}) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input
  const validation = updatePredictionSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: 'Invalid input' };
  }

  // Update with userId filter (ensures user owns this prediction)
  try {
    const updated = await updatePrediction({
      userId, // ✅ REQUIRED - User filter
      predictionId: validation.data.predictionId,
      homeScore: validation.data.homeScore,
      awayScore: validation.data.awayScore,
    });

    revalidatePath('/my-predictions');
    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: 'Failed to update prediction' };
  }
}
```

### Pattern 2: Admin-Only Mutation

```tsx
// src/app/admin/matches/actions.ts
'use server';

import { requireAdmin } from '@/lib/auth';
import { updateMatchResult } from '@/data/admin/matches';

export async function updateMatchResultAction(input: {
  matchId: number;
  homeScore: number;
  awayScore: number;
}) {
  // 1. Verify admin
  try {
    await requireAdmin();
  } catch {
    return { success: false, error: 'Admin access required' };
  }

  // 2. Validate
  const validation = updateMatchSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: 'Invalid input' };
  }

  // 3. Execute admin mutation
  try {
    const match = await updateMatchResult(validation.data);

    revalidatePath('/admin/matches');
    revalidatePath(`/matches/${input.matchId}`);

    return { success: true, data: match };
  } catch (error) {
    return { success: false, error: 'Failed to update match' };
  }
}
```

### Pattern 3: Conditional Authorization

```tsx
export async function deletePredictionAction(input: { predictionId: number }) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get prediction
  const prediction = await db.query.predictions.findFirst({
    where: eq(predictions.id, input.predictionId),
  });

  if (!prediction) {
    return { success: false, error: 'Prediction not found' };
  }

  // Check ownership
  if (prediction.userId !== userId) {
    // Not the owner - check if admin
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      return { success: false, error: 'Access denied' };
    }
  }

  // User is owner OR admin - allow deletion
  try {
    await deletePrediction({ userId, predictionId: input.predictionId });
    revalidatePath('/my-predictions');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete prediction' };
  }
}
```

---

## Form Handling

### ❌ INCORRECT: Using FormData

```tsx
// ❌ DON'T DO THIS - Avoid FormData
export async function createPredictionAction(formData: FormData) {
  const matchId = formData.get('matchId');
  const homeScore = formData.get('homeScore');
  // ... no type safety, manual parsing
}
```

### ✅ CORRECT: Typed Parameters

```tsx
// ✅ CORRECT - Typed parameters
export async function createPredictionAction(input: {
  matchId: number;
  homeScore: number;
  awayScore: number;
}) {
  // Full type safety from client to server
  const validation = createPredictionSchema.safeParse(input);
  // ...
}
```

### Client-Side Form Submission

```tsx
'use client';

import { useState } from 'react';
import { createPredictionAction } from './actions';

export function PredictionForm({ matchId }: { matchId: number }) {
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Call with typed object
    const result = await createPredictionAction({
      matchId,
      homeScore,
      awayScore,
    });

    if (result.success) {
      // Handle success
    } else {
      // Handle error
    }
  }

  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}
```

---

## Navigation and Redirects

**CRITICAL RULE:** The `redirect()` function MUST NOT be used within server actions. Redirects should be handled client-side after the server action resolves.

### Why Not redirect() in Server Actions?

1. **Separation of Concerns** — Server actions handle data mutations, clients handle navigation
2. **Better Error Handling** — Client can show error messages before redirecting
3. **User Experience** — Client can show loading states, success messages, and animations
4. **Flexibility** — Different clients can navigate differently based on the same action result

### ❌ INCORRECT: Using redirect() in Server Action

```tsx
// ❌ DON'T DO THIS
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function createPredictionAction(input: CreatePredictionInput) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  const validation = createPredictionSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const prediction = await createPrediction({ userId, ...validation.data });
    revalidatePath('/my-predictions');

    // ❌ WRONG - Don't redirect from server action
    redirect('/my-predictions');
  } catch (error) {
    return { success: false, error: 'Failed to create prediction' };
  }
}
```

**Problems with this approach:**
- Client can't show success message before redirect
- Client can't handle errors gracefully
- No control over navigation timing
- Breaks component flexibility (what if different components want different navigation?)

### ✅ CORRECT: Client-Side Redirect After Server Action

```tsx
// ✅ Server Action - Returns result, no redirect
'use server';

import { revalidatePath } from 'next/cache';

export async function createPredictionAction(input: CreatePredictionInput) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  const validation = createPredictionSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const prediction = await createPrediction({ userId, ...validation.data });
    revalidatePath('/my-predictions');

    // ✅ CORRECT - Return success result, let client handle navigation
    return { success: true, data: prediction };
  } catch (error) {
    return { success: false, error: 'Failed to create prediction' };
  }
}
```

```tsx
// ✅ Client Component - Handles redirect
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPredictionAction } from './actions';

export function PredictionForm({ matchId }: { matchId: number }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await createPredictionAction({
      matchId,
      homeScore: 2,
      awayScore: 1,
    });

    if (result.success) {
      // ✅ Client handles redirect after successful mutation
      router.push('/my-predictions');
      // Or stay on page and show success message:
      // toast.success('Prediction saved!');
    } else {
      // Show error message (no redirect)
      setError(result.error);
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Prediction'}
      </button>
    </form>
  );
}
```

### Advanced Pattern: Success Message Before Redirect

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPredictionAction } from './actions';

export function PredictionForm({ matchId }: { matchId: number }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await createPredictionAction({
      matchId,
      homeScore: 2,
      awayScore: 1,
    });

    if (result.success) {
      // Show success message
      setShowSuccess(true);

      // Wait 1.5 seconds, then redirect
      setTimeout(() => {
        router.push('/my-predictions');
      }, 1500);
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  }

  if (showSuccess) {
    return (
      <div className="text-green-600">
        ✓ Prediction saved! Redirecting...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Prediction'}
      </button>
    </form>
  );
}
```

### Pattern: Conditional Navigation

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { deletePredictionAction } from './actions';

export function DeleteButton({
  predictionId,
  returnTo,
}: {
  predictionId: number;
  returnTo?: string;
}) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm('Delete this prediction?')) return;

    const result = await deletePredictionAction({ predictionId });

    if (result.success) {
      // Navigate based on context
      if (returnTo) {
        router.push(returnTo);
      } else {
        router.push('/my-predictions');
      }
    } else {
      alert(result.error);
    }
  }

  return (
    <button onClick={handleDelete} className="text-red-600">
      Delete
    </button>
  );
}
```

### Pattern: Stay on Page (No Redirect)

```tsx
'use client';

import { useState } from 'react';
import { updatePredictionAction } from './actions';

export function EditPredictionForm({
  predictionId,
  initialHomeScore,
  initialAwayScore,
}: {
  predictionId: number;
  initialHomeScore: number;
  initialAwayScore: number;
}) {
  const [homeScore, setHomeScore] = useState(initialHomeScore);
  const [awayScore, setAwayScore] = useState(initialAwayScore);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const result = await updatePredictionAction({
      predictionId,
      homeScore,
      awayScore,
    });

    if (result.success) {
      // ✅ No redirect - stay on page and show success message
      setMessage('Prediction updated!');

      // Optionally clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {message && (
        <p className={message.includes('updated') ? 'text-green-600' : 'text-red-600'}>
          {message}
        </p>
      )}
      {/* Form fields */}
      <button type="submit">Update</button>
    </form>
  );
}
```

### When to Redirect vs. Stay on Page

**Redirect After Mutation:**
- Creating a new resource (e.g., create prediction → go to predictions list)
- Deleting a resource (e.g., delete prediction → go back to list)
- Completing a multi-step flow (e.g., finish setup → go to dashboard)

**Stay on Page After Mutation:**
- Updating existing data (e.g., edit prediction scores)
- Toggling settings (e.g., enable/disable notifications)
- Quick actions (e.g., like, bookmark, vote)

---

## Error Handling

### Comprehensive Error Handling

```tsx
export async function createPredictionAction(input: CreatePredictionInput) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  const validation = createPredictionSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: 'Invalid input',
      issues: validation.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  try {
    const prediction = await createPrediction({
      userId,
      ...validation.data,
    });

    revalidatePath('/my-predictions');
    return { success: true, data: prediction };
  } catch (error) {
    console.error('Error creating prediction:', error);

    // Return user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return { success: false, error: 'You have already predicted this match' };
      }
      if (error.message.includes('not found')) {
        return { success: false, error: 'Match not found' };
      }
      if (error.message.includes('started')) {
        return { success: false, error: 'Match has already started' };
      }

      return { success: false, error: error.message };
    }

    return { success: false, error: 'An unexpected error occurred' };
  }
}
```

---

## Common Patterns

### Pattern 1: Create (Insert)

```tsx
// Data helper
export async function createPrediction(data: NewPredictionInput) {
  const [prediction] = await db
    .insert(predictions)
    .values(data)
    .returning();

  return prediction;
}

// Server action
export async function createPredictionAction(input: CreatePredictionInput) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const validation = createPredictionSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const prediction = await createPrediction({ userId, ...validation.data });
    revalidatePath('/my-predictions');
    return { success: true, data: prediction };
  } catch (error) {
    return { success: false, error: 'Failed to create prediction' };
  }
}
```

### Pattern 2: Update

```tsx
// Data helper
export async function updatePrediction(data: {
  userId: string;
  predictionId: number;
  homeScore: number;
  awayScore: number;
}) {
  const [updated] = await db
    .update(predictions)
    .set({
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(predictions.id, data.predictionId),
        eq(predictions.userId, data.userId) // User filter
      )
    )
    .returning();

  if (!updated) {
    throw new Error('Prediction not found or access denied');
  }

  return updated;
}

// Server action
export async function updatePredictionAction(input: UpdatePredictionInput) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const validation = updatePredictionSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    const updated = await updatePrediction({ userId, ...validation.data });
    revalidatePath('/my-predictions');
    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: 'Failed to update prediction' };
  }
}
```

### Pattern 3: Delete

```tsx
// Data helper
export async function deletePrediction(data: {
  userId: string;
  predictionId: number;
}) {
  const [deleted] = await db
    .delete(predictions)
    .where(
      and(
        eq(predictions.id, data.predictionId),
        eq(predictions.userId, data.userId) // User filter
      )
    )
    .returning();

  if (!deleted) {
    throw new Error('Prediction not found or access denied');
  }

  return deleted;
}

// Server action
export async function deletePredictionAction(input: { predictionId: number }) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const validation = deletePredictionSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    await deletePrediction({ userId, predictionId: validation.data.predictionId });
    revalidatePath('/my-predictions');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete prediction' };
  }
}
```

---

## Anti-Patterns

### ❌ DON'T: Skip Zod Validation

```tsx
// ❌ WRONG - No validation
export async function createPredictionAction(input: {
  matchId: number;
  homeScore: number;
  awayScore: number;
}) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Not authenticated' };

  // ❌ Directly using unvalidated input
  const prediction = await createPrediction({ userId, ...input });

  return { success: true, data: prediction };
}
```

### ❌ DON'T: Direct DB Calls in Server Actions

```tsx
// ❌ WRONG - Direct database call in server action
export async function createPredictionAction(input: CreatePredictionInput) {
  const { userId } = await auth();

  // ❌ Should use data helper function instead
  const [prediction] = await db
    .insert(predictions)
    .values({ userId, ...input })
    .returning();

  return { success: true, data: prediction };
}
```

### ❌ DON'T: Missing User Filter

```tsx
// ❌ SECURITY VIOLATION - Anyone can update any prediction
export async function updatePredictionAction(input: {
  predictionId: number;
  homeScore: number;
  awayScore: number;
}) {
  const validation = updatePredictionSchema.safeParse(input);
  if (!validation.success) return { success: false, error: 'Invalid' };

  // ❌ Missing auth check and user filter
  const [updated] = await db
    .update(predictions)
    .set({ homeScore: input.homeScore, awayScore: input.awayScore })
    .where(eq(predictions.id, input.predictionId)) // ❌ No userId filter!
    .returning();

  return { success: true, data: updated };
}
```

### ❌ DON'T: Use FormData Type

```tsx
// ❌ WRONG - FormData loses type safety
export async function createPredictionAction(formData: FormData) {
  const matchId = Number(formData.get('matchId'));
  const homeScore = Number(formData.get('homeScore'));
  // ... manual parsing, no type safety
}
```

### ❌ DON'T: Use redirect() in Server Actions

```tsx
// ❌ WRONG - Don't redirect from server actions
'use server';

import { redirect } from 'next/navigation';

export async function createPredictionAction(input: CreatePredictionInput) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const validation = createPredictionSchema.safeParse(input);
  if (!validation.success) return { success: false, error: 'Invalid' };

  const prediction = await createPrediction({ userId, ...validation.data });

  // ❌ Don't do this - handle navigation client-side
  redirect('/my-predictions');
}
```

**Instead:** Return a success result and let the client handle navigation:

```tsx
// ✅ CORRECT - Return result, let client redirect
export async function createPredictionAction(input: CreatePredictionInput) {
  // ... validation and mutation

  return { success: true, data: prediction };
}

// Client component
const result = await createPredictionAction(input);
if (result.success) {
  router.push('/my-predictions'); // ✅ Client handles redirect
}
```

---

## Summary Checklist

Before merging any data mutation code:

- [ ] ✅ Server action is in colocated `actions.ts` file
- [ ] ✅ File starts with `'use server';` directive
- [ ] ✅ Action uses typed parameters (NOT FormData)
- [ ] ✅ Input is validated with Zod schema
- [ ] ✅ User authentication is checked (`await auth()`)
- [ ] ✅ Action calls data helper function (not direct DB call)
- [ ] ✅ Data helper uses Drizzle ORM (no raw SQL)
- [ ] ✅ User-scoped mutations filter by `userId`
- [ ] ✅ Admin-only mutations verify admin status
- [ ] ✅ Errors are caught and returned as typed results
- [ ] ✅ Affected paths are revalidated
- [ ] ✅ Return type is consistent (`ActionResult<T>`)
- [ ] ✅ Navigation handled client-side (NO `redirect()` in server actions)

---

## Additional Resources

- **Server Actions:** https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
- **Zod Documentation:** https://zod.dev
- **Drizzle ORM:** https://orm.drizzle.team
- **Related Docs:**
  - `docs/data-fetching.md` - Data querying patterns
  - `docs/auth.md` - Authentication patterns
