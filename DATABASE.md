# Database Schema Documentation

## Overview

This document describes the PostgreSQL database schema for the World Cup 2026 Predictions App, implemented using Drizzle ORM with Neon serverless database.

## Database Structure

### Tables

The database consists of 7 main tables:

1. **users** - User accounts synced from Clerk authentication
2. **tournament_stages** - Tournament phases (Group Stage, Round of 16, etc.)
3. **teams** - 48 national teams participating in the tournament
4. **venues** - 16 stadiums across USA, Canada, and Mexico
5. **matches** - All 104 tournament matches
6. **predictions** - User predictions for match scores and results
7. **leaderboard_snapshots** - Pre-computed leaderboard data for performance

### Schema Files

- `src/db/schema.ts` - Table definitions, relations, and TypeScript types
- `src/db/index.ts` - Database connection with Neon serverless
- `src/db/queries.ts` - Reusable query functions and business logic
- `src/db/seed.ts` - Database seeding script
- `drizzle.config.ts` - Drizzle Kit configuration

## Table Details

### users
Stores user account information synced from Clerk.

**Columns:**
- `id` (text, PK) - Clerk user ID
- `email` (text, unique, not null) - User email
- `username` (text) - Username
- `displayName` (text) - Display name
- `totalPoints` (integer, default 0) - Total points across all predictions
- `createdAt`, `updatedAt` (timestamp)

**Indexes:**
- `email` - For quick user lookups

**Relations:**
- 1:N with predictions
- 1:N with leaderboard_snapshots

### tournament_stages
Defines the tournament phases with point multipliers.

**Columns:**
- `id` (integer, PK, identity)
- `name` (text) - Stage name (e.g., "Group Stage")
- `slug` (text, unique) - URL-friendly slug (e.g., "group_stage")
- `sortOrder` (integer) - Display order
- `pointsMultiplier` (real, default 1.0) - Points multiplier for this stage

**Seeded Data:**
1. Group Stage (1.0x)
2. Round of 16 (1.5x)
3. Quarter-finals (2.0x)
4. Semi-finals (2.5x)
5. Third Place (2.5x)
6. Final (3.0x)

**Relations:**
- 1:N with matches
- 1:N with leaderboard_snapshots

### teams
48 national teams in 12 groups (A-L).

**Columns:**
- `id` (integer, PK, identity)
- `name` (text) - Team name
- `code` (text, unique) - ISO code (e.g., "USA", "MEX")
- `flagUrl` (text) - Flag image URL
- `groupLetter` (text) - Group letter (A-L)
- `fifaRanking` (integer) - Current FIFA ranking
- `confederation` (text) - CONCACAF, CONMEBOL, UEFA, AFC, CAF, OFC
- `createdAt` (timestamp)

**Indexes:**
- `code` (unique) - For team lookups
- `groupLetter` - For group queries

**Relations:**
- 1:N with matches (as home team)
- 1:N with matches (as away team)

### venues
16 stadiums hosting matches.

**Columns:**
- `id` (integer, PK, identity)
- `name` (text) - Stadium name
- `city` (text) - City
- `country` (text) - USA, Canada, or Mexico
- `capacity` (integer) - Stadium capacity
- `timezone` (text) - IANA timezone for match scheduling

**Indexes:**
- `country` - For filtering by host country

**Relations:**
- 1:N with matches

### matches
All 104 tournament matches.

**Columns:**
- `id` (integer, PK, identity)
- `matchNumber` (integer, unique) - Official match number
- `stageId` (integer, FK → tournament_stages) - Tournament stage
- `homeTeamId` (integer, FK → teams, nullable) - Home team (null for TBD)
- `awayTeamId` (integer, FK → teams, nullable) - Away team (null for TBD)
- `homeTeamPlaceholder` (text) - Text for TBD teams (e.g., "Winner Match 49")
- `awayTeamPlaceholder` (text) - Text for TBD teams
- `venueId` (integer, FK → venues) - Stadium
- `scheduledAt` (timestamp with timezone) - Scheduled kickoff time
- `homeScore`, `awayScore` (integer, nullable) - Final scores (null until finished)
- `status` (text, default "scheduled") - "scheduled", "live", "finished"
- `homeScorePenalty`, `awayScorePenalty` (integer) - Penalty shootout scores
- `kickoffAt`, `finishedAt` (timestamp with timezone) - Actual times
- `createdAt`, `updatedAt` (timestamp)

**Indexes:**
- `matchNumber` (unique)
- `stageId`, `scheduledAt`, `homeTeamId`, `awayTeamId`, `venueId`, `status`

**Relations:**
- N:1 with tournament_stages
- N:1 with teams (home)
- N:1 with teams (away)
- N:1 with venues
- 1:N with predictions

### predictions
User predictions for matches.

**Columns:**
- `id` (integer, PK, identity)
- `userId` (text, FK → users, cascade delete) - User who made prediction
- `matchId` (integer, FK → matches, cascade delete) - Match predicted
- `homeScore`, `awayScore` (integer, not null) - Predicted scores
- `result` (text, not null) - Predicted result: "1" (home win), "X" (draw), "2" (away win)
- `pointsEarned` (integer, nullable) - Points awarded (null until match finished)
- `isLocked` (boolean, default false) - Locked when match starts
- `createdAt`, `updatedAt` (timestamp)

**Constraints:**
- Unique index on (userId, matchId) - One prediction per user per match

**Indexes:**
- `userId`, `matchId` - For quick lookups

**Relations:**
- N:1 with users
- N:1 with matches

**Points Calculation:**
- Exact score: 3 points × stage multiplier
- Correct result (1/X/2): 1 point × stage multiplier
- Wrong: 0 points

### leaderboard_snapshots
Pre-computed leaderboard data for performance optimization.

**Columns:**
- `id` (integer, PK, identity)
- `userId` (text, FK → users, cascade delete)
- `stageId` (integer, FK → tournament_stages, nullable) - null for overall
- `totalPoints` (integer, not null) - Total points
- `rank` (integer, not null) - User rank
- `matchesPredicted` (integer, not null) - Number of predictions made
- `exactScores` (integer, default 0) - Number of exact score predictions
- `correctResults` (integer, default 0) - Number of correct result predictions
- `snapshotAt` (timestamp) - When snapshot was taken

**Indexes:**
- `(userId, stageId)` - For user stage stats
- `rank` - For leaderboard queries
- `(stageId, snapshotAt)` - For historical data

**Relations:**
- N:1 with users
- N:1 with tournament_stages

## Database Utilities

### Query Functions (src/db/queries.ts)

**Prediction Management:**
- `upsertPrediction(userId, matchId, homeScore, awayScore)` - Create or update prediction
- `getUserPredictions(userId)` - Get all user predictions with match details
- `lockPredictionsForMatch(matchId)` - Lock predictions when match starts
- `lockUpcomingMatchPredictions()` - Lock all predictions for matches starting soon

**Match Queries:**
- `getMatchesWithUserPredictions(userId?, stageSlug?)` - Get matches with user predictions
- `getUpcomingMatches(limit)` - Get upcoming scheduled matches
- `getMatchById(matchId)` - Get match with full details
- `updateMatchResult(matchId, homeScore, awayScore, status)` - Update match score

**Points Calculation:**
- `calculatePointsForMatch(matchId)` - Calculate points for all predictions after match finishes

**Leaderboard:**
- `getLeaderboard(limit)` - Get global leaderboard
- `getUserStats(userId)` - Get detailed user statistics

**User Management:**
- `upsertUserFromClerk(clerkData)` - Sync user from Clerk webhook

## Seeding the Database

Run the seed script to populate initial data:

```bash
npx tsx src/db/seed.ts
```

This seeds:
- 6 tournament stages
- 48 teams in 12 groups
- 16 venues
- (Matches can be added manually or via admin interface)

## Clerk Webhook Integration

The app syncs users from Clerk via webhooks.

**Endpoint:** `POST /api/webhooks/clerk`

**Events Handled:**
- `user.created` - Create new user in database
- `user.updated` - Update user information
- `user.deleted` - Delete user and cascade delete predictions

**Setup:**
1. Add `CLERK_WEBHOOK_SECRET` to `.env.local`
2. Configure webhook in Clerk Dashboard → Webhooks
3. Point to: `https://your-domain.com/api/webhooks/clerk`
4. Subscribe to: `user.created`, `user.updated`, `user.deleted`

## Testing the Schema

**Start Drizzle Studio:**
```bash
npx drizzle-kit studio
```
Opens at https://local.drizzle.studio

**Test API Endpoint:**
```bash
curl http://localhost:3000/api/test
```

Returns counts and sample data from all tables.

## Migration Commands

**Generate migration:**
```bash
npx drizzle-kit generate
```

**Push schema to database:**
```bash
npx drizzle-kit push
```

**View current schema:**
```bash
npx drizzle-kit introspect
```

## Environment Variables

Required in `.env.local`:

```bash
# Database
DATABASE_URL="postgresql://..."  # Neon connection string

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
CLERK_WEBHOOK_SECRET="whsec_..."  # For webhook verification
```

## Performance Optimizations

1. **Indexes** - Strategic indexes on foreign keys and frequently queried columns
2. **Unique Constraints** - Enforced at database level for data integrity
3. **Cascade Deletes** - Automatic cleanup of related records
4. **Leaderboard Snapshots** - Pre-computed data to avoid expensive aggregations
5. **Timezone Support** - All match times use `timestamp with timezone`

## Future Enhancements

Potential additions to the schema:

1. **User Groups/Leagues** - Private prediction leagues
2. **Achievements** - User badges and milestones
3. **Comments** - Discussion threads for matches
4. **Notifications** - Alert preferences for match reminders
5. **Historical Data** - Archive past tournament predictions
6. **Social Features** - Follow users, share predictions
7. **Match Statistics** - Extended match data (possession, shots, cards)

## License

This schema is part of the World Cup 2026 Predictions App.
