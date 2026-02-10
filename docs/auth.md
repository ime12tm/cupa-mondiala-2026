# Authentication with Clerk

**This application uses [Clerk](https://clerk.com) for authentication.** All authentication-related code must follow Clerk's patterns and best practices.

---

## Core Architecture

### Clerk Integration Points

1. **Middleware** (`src/middleware.ts`) — Protects routes and handles auth state
2. **Provider** (`src/app/layout.tsx`) — Wraps app with `<ClerkProvider>`
3. **UI Components** — Pre-built auth components (`<SignInButton>`, `<UserButton>`, etc.)
4. **Webhook** (`src/app/api/webhooks/clerk/route.ts`) — Syncs users to database
5. **Server Helpers** — `auth()` for Server Components
6. **Client Hooks** — `useAuth()`, `useUser()` for Client Components

---

## Environment Variables

**Required in `.env.local`:**

```env
# Clerk API Keys (get from https://dashboard.clerk.com/last-active?path=api-keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Clerk Webhook Secret (for user sync)
CLERK_WEBHOOK_SECRET=whsec_...
```

**IMPORTANT:** Never commit these to git. They're in `.gitignore`.

---

## Getting User Information

### In Server Components (Recommended)

Use the `auth()` helper from `@clerk/nextjs/server`:

#### ✅ CORRECT: Check Authentication in Server Component

```tsx
// src/app/my-predictions/page.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function MyPredictionsPage() {
  const { userId } = await auth();

  // Redirect if not authenticated
  if (!userId) {
    redirect('/');
  }

  // userId is available - fetch user data
  const predictions = await getUserPredictions(userId);

  return <div>{/* Render predictions */}</div>;
}
```

#### Available Properties from `auth()`

```tsx
const {
  userId,           // Clerk user ID (string) - null if not signed in
  sessionId,        // Current session ID
  orgId,            // Organization ID (if using orgs)
  orgRole,          // User's role in org
  orgSlug,          // Organization slug
} = await auth();
```

### In Client Components

Use the `useAuth()` or `useUser()` hooks:

#### ✅ CORRECT: Check Authentication in Client Component

```tsx
'use client';
import { useAuth, useUser } from '@clerk/nextjs';

export function UserProfile() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  // Wait for auth to load
  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  // Not signed in
  if (!isSignedIn) {
    return <div>Please sign in</div>;
  }

  return (
    <div>
      <p>User ID: {userId}</p>
      <p>Email: {user?.primaryEmailAddress?.emailAddress}</p>
      <p>Name: {user?.fullName}</p>
    </div>
  );
}
```

#### `useAuth()` vs `useUser()`

- **`useAuth()`** — Minimal auth state (userId, sessionId, loading state)
- **`useUser()`** — Full user object with profile data (name, email, image, etc.)

**Use `useAuth()` when:** You only need userId or auth state
**Use `useUser()` when:** You need user profile data (email, name, avatar)

---

## Clerk UI Components

Clerk provides pre-built, customizable UI components. **Always use these instead of building custom auth UI.**

### Authentication Components

#### Sign In / Sign Up Buttons

```tsx
import { SignInButton, SignUpButton } from '@clerk/nextjs';

export function Header() {
  return (
    <header>
      <SignInButton mode="modal">
        <button>Sign In</button>
      </SignInButton>

      <SignUpButton mode="modal">
        <button>Sign Up</button>
      </SignUpButton>
    </header>
  );
}
```

**Modes:**
- `modal` — Opens sign-in in a modal (recommended)
- `redirect` — Redirects to Clerk-hosted sign-in page

#### User Button (Profile Menu)

```tsx
import { UserButton } from '@clerk/nextjs';

export function Header() {
  return (
    <header>
      <UserButton
        afterSignOutUrl="/"
        appearance={{
          elements: {
            avatarBox: 'w-10 h-10'
          }
        }}
      />
    </header>
  );
}
```

The `<UserButton>` component shows:
- User avatar
- Dropdown menu (profile, sign out, etc.)
- Pre-built account management UI

### Conditional Rendering Based on Auth State

#### ✅ CORRECT: Show Different UI for Signed In/Out Users

```tsx
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';

export function Header() {
  return (
    <header>
      {/* Show when user is signed OUT */}
      <SignedOut>
        <SignInButton mode="modal">
          <button>Sign In</button>
        </SignInButton>
      </SignedOut>

      {/* Show when user is signed IN */}
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </header>
  );
}
```

**Available Components:**
- `<SignedIn>` — Children render only when user is authenticated
- `<SignedOut>` — Children render only when user is NOT authenticated

---

## User Data Synchronization

### Database Sync Pattern

**The app uses a two-tier user system:**

1. **Clerk** — Handles authentication, session management, user profiles
2. **Database** — Stores app-specific user data (predictions, points, etc.)

Users are synced to the database via **Clerk webhooks**.

### Webhook Flow

```
User signs up in Clerk
  ↓
Clerk sends webhook to /api/webhooks/clerk
  ↓
Webhook handler creates user in database
  ↓
User record exists in both Clerk and DB
```

#### Webhook Handler

```tsx
// src/app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { upsertUserFromClerk } from '@/db/queries';

export async function POST(req: Request) {
  // Verify webhook signature
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  const wh = new Webhook(WEBHOOK_SECRET!);
  const evt = wh.verify(body, {
    'svix-id': svix_id!,
    'svix-timestamp': svix_timestamp!,
    'svix-signature': svix_signature!,
  }) as WebhookEvent;

  // Handle user.created and user.updated events
  if (evt.type === 'user.created' || evt.type === 'user.updated') {
    await upsertUserFromClerk({
      id: evt.data.id,
      email: evt.data.email_addresses[0].email_address,
      username: evt.data.username,
      firstName: evt.data.first_name,
      lastName: evt.data.last_name,
    });
  }

  return Response.json({ success: true });
}
```

### Lazy User Sync (Backup Pattern)

If webhook fails or user isn't synced yet, use **lazy sync** in server components:

```tsx
import { auth } from '@clerk/nextjs/server';
import { ensureUserExists } from '@/db/queries';

export default async function MyPredictionsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/');
  }

  // Ensure user exists in database (creates if missing)
  await ensureUserExists(userId);

  // Now safe to query user data
  const predictions = await getUserPredictions(userId);

  return <div>{/* ... */}</div>;
}
```

**When to use lazy sync:**
- Critical pages where user MUST exist in DB
- Backup for webhook failures
- Development/testing environments

**When NOT to use:**
- Every page (performance overhead)
- Public pages (no userId available)

---

## Protected Routes

### Middleware Configuration

The app uses `clerkMiddleware()` to protect routes:

```tsx
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes (accessible without auth)
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/matches(.*)',
  '/groups(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  // Protect all routes except public ones
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

**Route Protection Patterns:**

- **Public Routes** — Anyone can access (home, matches list, groups)
- **Protected Routes** — Requires sign-in (my predictions, profile)
- **Admin Routes** — Requires admin role (handled in page component)

### Page-Level Protection

#### ✅ CORRECT: Protect Entire Page

```tsx
// src/app/my-predictions/page.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function MyPredictionsPage() {
  const { userId } = await auth();

  // Redirect unauthenticated users to home
  if (!userId) {
    redirect('/');
  }

  // Page content (only reached if authenticated)
  return <div>{/* Protected content */}</div>;
}
```

#### ❌ INCORRECT: Missing Auth Check

```tsx
// ❌ WRONG - No auth check, anyone can access
export default async function MyPredictionsPage() {
  // Missing: const { userId } = await auth();
  // Missing: if (!userId) redirect('/');

  return <div>{/* Should be protected! */}</div>;
}
```

---

## Admin Access Control

### Admin Role Management

This app uses **Clerk's Public Metadata** to manage admin roles. Admin status is stored in the user's `publicMetadata.role` field.

**Setting Admin Role in Clerk Dashboard:**

1. Go to [Clerk Dashboard → Users](https://dashboard.clerk.com)
2. Select a user
3. Scroll to "Public Metadata"
4. Add: `{ "role": "admin" }`
5. Save

**Admin Helper Functions** (`src/lib/auth.ts`):

```tsx
// src/lib/auth.ts (already exists)
import { auth, clerkClient } from '@clerk/nextjs/server';

/**
 * Check if current user is an admin
 * Checks publicMetadata.role === "admin"
 */
export async function isAdmin(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  try {
    const user = await (await clerkClient()).users.getUser(userId);
    return user.publicMetadata?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Require admin access or throw error
 */
export async function requireAdmin(): Promise<void> {
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error('Unauthorized - Admin access required');
  }
}

/**
 * Get current user ID or null
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Get current user ID and ensure user exists in database (lazy sync)
 */
export async function getCurrentUserIdAndSync(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;

  await ensureUserExists(userId);
  return userId;
}
```

### Admin-Protected Page

#### ✅ CORRECT: Admin-Only Page (Method 1 - Manual Check)

```tsx
// src/app/admin/users/page.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { getAllUsers } from '@/data/admin/users';

export default async function AdminUsersPage() {
  const { userId } = await auth();

  // Check authentication
  if (!userId) {
    redirect('/');
  }

  // Check admin status
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    redirect('/'); // Or show "Access Denied" page
  }

  // Admin verified - safe to access admin data
  const users = await getAllUsers();

  return <div>{/* Admin-only content */}</div>;
}
```

#### ✅ CORRECT: Admin-Only Page (Method 2 - requireAdmin)

```tsx
// src/app/admin/users/page.tsx
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { getAllUsers } from '@/data/admin/users';

export default async function AdminUsersPage() {
  try {
    // Throws error if not admin
    await requireAdmin();
  } catch (error) {
    redirect('/'); // Or show "Access Denied" page
  }

  // Admin verified - safe to access admin data
  const users = await getAllUsers();

  return <div>{/* Admin-only content */}</div>;
}
```

### Admin UI in Client Components

```tsx
'use client';
import { useUser } from '@clerk/nextjs';

export function AdminPanel() {
  const { user, isLoaded } = useUser();

  // Wait for user to load
  if (!isLoaded) {
    return null;
  }

  // Check if user has admin role in publicMetadata
  const isAdmin = user?.publicMetadata?.role === 'admin';

  // Hide admin UI if not admin
  if (!isAdmin) {
    return null;
  }

  return (
    <div>
      {/* Admin-only UI */}
      <button>Edit Match Results</button>
      <button>View All Predictions</button>
    </div>
  );
}
```

**Note:** Client-side admin checks are for UI display only. **ALWAYS verify admin status server-side** before performing admin actions or fetching admin data.

---

## Common Patterns

### Pattern 1: Conditional Data Fetching

```tsx
import { auth } from '@clerk/nextjs/server';
import { getMatches } from '@/data/matches';
import { getUserPredictions } from '@/data/predictions';

export default async function MatchesPage() {
  const { userId } = await auth();

  // Fetch public data (always)
  const matches = await getMatches();

  // Fetch user data only if authenticated
  const predictions = userId
    ? await getUserPredictions(userId)
    : null;

  return (
    <div>
      {matches.map(match => (
        <MatchCard
          key={match.id}
          match={match}
          userPrediction={predictions?.find(p => p.matchId === match.id)}
        />
      ))}
    </div>
  );
}
```

### Pattern 2: Redirect After Sign-In

```tsx
import { SignInButton } from '@clerk/nextjs';

export function Header() {
  return (
    <SignInButton
      mode="modal"
      forceRedirectUrl="/my-predictions"  // Redirect after sign-in
    >
      <button>Sign In</button>
    </SignInButton>
  );
}
```

### Pattern 3: Require User in Database

```tsx
import { auth } from '@clerk/nextjs/server';
import { getUser } from '@/data/users';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/');
  }

  // Fetch user from database
  const user = await getUser(userId);

  // User not synced yet (webhook failed?)
  if (!user) {
    return <div>Setting up your account...</div>;
  }

  return <div>Welcome, {user.displayName}!</div>;
}
```

---

## Security Best Practices

### ✅ DO

1. **Always verify authentication in Server Components**
   ```tsx
   const { userId } = await auth();
   if (!userId) redirect('/');
   ```

2. **Use Clerk UI components** (don't build custom auth forms)
   ```tsx
   <SignInButton mode="modal" />
   <UserButton />
   ```

3. **Filter database queries by userId** (see `docs/data-fetching.md`)
   ```tsx
   await getUserPredictions(userId); // ✅ User-scoped
   ```

4. **Verify webhooks with signature**
   ```tsx
   const wh = new Webhook(WEBHOOK_SECRET);
   const evt = wh.verify(body, headers); // ✅ Verified
   ```

5. **Use environment variables for secrets**
   ```env
   CLERK_SECRET_KEY=sk_test_...  # ✅ In .env.local
   ```

### ❌ DON'T

1. **Don't trust client-side auth state alone**
   ```tsx
   // ❌ WRONG - Client can manipulate this
   const { userId } = useAuth();
   await getUserPredictions(userId); // DON'T do this in client
   ```

2. **Don't hardcode secrets in code**
   ```tsx
   const SECRET = 'sk_test_abc123'; // ❌ NEVER
   ```

3. **Don't skip auth checks**
   ```tsx
   // ❌ WRONG - Missing auth check
   export default async function ProtectedPage() {
     // Should check: const { userId } = await auth();
     return <div>Secret data</div>;
   }
   ```

4. **Don't fetch all users without admin check**
   ```tsx
   // ❌ WRONG - Security violation
   const allUsers = await db.query.users.findMany();
   ```

5. **Don't use raw Clerk user ID as primary key**
   ```tsx
   // ❌ WRONG - Use auto-increment ID
   table: {
     id: serial('id').primaryKey(),        // ✅ CORRECT
     userId: text('user_id').notNull(),    // ✅ Clerk ID as foreign key
   }
   ```

---

## Clerk User Object

When you need full user details (not just userId):

### In Server Components

```tsx
import { currentUser } from '@clerk/nextjs/server';

export default async function ProfilePage() {
  const user = await currentUser();

  if (!user) {
    redirect('/');
  }

  return (
    <div>
      <img src={user.imageUrl} alt={user.fullName || 'User'} />
      <h1>{user.fullName}</h1>
      <p>{user.primaryEmailAddress?.emailAddress}</p>
      <p>Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
    </div>
  );
}
```

### In Client Components

```tsx
'use client';
import { useUser } from '@clerk/nextjs';

export function UserProfile() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return <div>Loading...</div>;
  if (!user) return <div>Not signed in</div>;

  return (
    <div>
      <img src={user.imageUrl} alt={user.fullName || 'User'} />
      <h1>{user.fullName}</h1>
      <p>{user.primaryEmailAddress?.emailAddress}</p>
    </div>
  );
}
```

### Available User Properties

```tsx
user.id                              // Clerk user ID
user.primaryEmailAddress?.emailAddress  // Email
user.fullName                        // Full name
user.firstName                       // First name
user.lastName                        // Last name
user.username                        // Username (if set)
user.imageUrl                        // Profile picture URL
user.createdAt                       // Timestamp of account creation
user.emailAddresses                  // All email addresses
user.phoneNumbers                    // Phone numbers (if collected)
```

---

## Testing Authentication

### Development Setup

1. **Create test accounts** in Clerk Dashboard
2. **Use Clerk Development mode** (automatically enabled in `npm run dev`)
3. **Test both signed-in and signed-out states**

### Testing Protected Routes

```tsx
// Test as unauthenticated user
// 1. Open /my-predictions
// 2. Should redirect to /
// 3. Click "Sign In" to authenticate

// Test as authenticated user
// 1. Sign in via Clerk modal
// 2. Access /my-predictions
// 3. Should see your predictions
```

### Testing Admin Access

```tsx
// 1. Add your Clerk user ID to ADMIN_USER_IDS
// 2. Sign in as that user
// 3. Access /admin routes
// 4. Should see admin UI

// 5. Sign in as different user (not in ADMIN_USER_IDS)
// 6. Access /admin routes
// 7. Should redirect or show "Access Denied"
```

---

## Summary Checklist

Before merging any auth-related code:

- [ ] ✅ Uses Clerk components (`<SignInButton>`, `<UserButton>`, etc.)
- [ ] ✅ Checks auth in Server Components with `await auth()`
- [ ] ✅ Protected routes redirect unauthenticated users
- [ ] ✅ Admin routes verify admin status before showing data
- [ ] ✅ User data queries filter by `userId` (see `docs/data-fetching.md`)
- [ ] ✅ Webhook signature verification enabled
- [ ] ✅ Environment variables used for secrets (not hardcoded)
- [ ] ✅ No sensitive data exposed to client without auth check

---

## Additional Resources

- **Clerk Docs:** https://clerk.com/docs/nextjs
- **Clerk Next.js Quickstart:** https://clerk.com/docs/quickstarts/nextjs
- **Clerk Dashboard:** https://dashboard.clerk.com
- **Data Fetching Security:** See `docs/data-fetching.md`
