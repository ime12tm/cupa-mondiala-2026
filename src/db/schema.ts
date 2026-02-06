import {
  pgTable,
  text,
  integer,
  timestamp,
  real,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table - synced from Clerk
export const users = pgTable(
  "users",
  {
    userId: text("user_id").primaryKey(), // Clerk user ID
    email: text("email").notNull().unique(),
    username: text("username"),
    displayName: text("display_name"),
    totalPoints: integer("total_points").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
  })
);

// Tournament stages (Group Stage, R16, QF, SF, Final, etc.)
export const tournamentStages = pgTable(
  "tournament_stages",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("tournament_stages_slug_idx").on(table.slug),
  })
);

// Teams table - 48 national teams
export const teams = pgTable(
  "teams",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: text("name").notNull(),
    code: text("code").notNull().unique(), // ISO code like 'USA', 'MEX'
    flagUrl: text("flag_url"),
    groupLetter: text("group_letter"), // 'A' through 'L'
    fifaRanking: integer("fifa_ranking"),
    confederation: text("confederation"), // CONCACAF, UEFA, CONMEBOL, etc.
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    codeIdx: uniqueIndex("teams_code_idx").on(table.code),
    groupIdx: index("teams_group_idx").on(table.groupLetter),
  })
);

// Venues table - 16 stadiums
export const venues = pgTable(
  "venues",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: text("name").notNull(),
    city: text("city").notNull(),
    country: text("country").notNull(), // 'USA', 'Canada', 'Mexico'
    capacity: integer("capacity"),
    timezone: text("timezone").notNull(), // IANA timezone
  },
  (table) => ({
    countryIdx: index("venues_country_idx").on(table.country),
  })
);

// Matches table - all 104 tournament matches
export const matches = pgTable(
  "matches",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    matchNumber: integer("match_number").notNull().unique(),
    stageId: integer("stage_id")
      .notNull()
      .references(() => tournamentStages.id),
    homeTeamId: integer("home_team_id").references(() => teams.id), // nullable for TBD
    awayTeamId: integer("away_team_id").references(() => teams.id), // nullable for TBD
    homeTeamPlaceholder: text("home_team_placeholder"), // e.g., 'Winner Match 49'
    awayTeamPlaceholder: text("away_team_placeholder"),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venues.id),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    homeScore: integer("home_score"), // actual result, null until finished
    awayScore: integer("away_score"), // actual result, null until finished
    status: text("status").default("scheduled").notNull(), // 'scheduled', 'live', 'finished'
    homeScorePenalty: integer("home_score_penalty"), // for knockout matches
    awayScorePenalty: integer("away_score_penalty"), // for knockout matches
  },
  (table) => ({
    matchNumberIdx: uniqueIndex("matches_match_number_idx").on(
      table.matchNumber
    ),
    stageIdx: index("matches_stage_idx").on(table.stageId),
    scheduledIdx: index("matches_scheduled_idx").on(table.scheduledAt),
    homeTeamIdx: index("matches_home_team_idx").on(table.homeTeamId),
    awayTeamIdx: index("matches_away_team_idx").on(table.awayTeamId),
    venueIdx: index("matches_venue_idx").on(table.venueId),
    statusIdx: index("matches_status_idx").on(table.status),
  })
);

// Predictions table - user predictions for matches
export const predictions = pgTable(
  "predictions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    homeScore: integer("home_score").notNull(),
    awayScore: integer("away_score").notNull(),
    result: text("result").notNull(), // '1', 'X', '2'
    pointsEarned: integer("points_earned"), // null until match finished
    isLocked: boolean("is_locked").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userMatchIdx: uniqueIndex("predictions_user_match_idx").on(
      table.userId,
      table.matchId
    ),
    userIdx: index("predictions_user_idx").on(table.userId),
    matchIdx: index("predictions_match_idx").on(table.matchId),
  })
);

// Leaderboard snapshots - pre-computed leaderboard data for performance
export const leaderboardSnapshots = pgTable(
  "leaderboard_snapshots",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    stageId: integer("stage_id").references(() => tournamentStages.id), // null for overall
    totalPoints: integer("total_points").notNull(),
    rank: integer("rank").notNull(),
    matchesPredicted: integer("matches_predicted").notNull(),
    exactScores: integer("exact_scores").default(0).notNull(),
    correctResults: integer("correct_results").default(0).notNull(),
    snapshotAt: timestamp("snapshot_at").defaultNow().notNull(),
  },
  (table) => ({
    userStageIdx: index("leaderboard_user_stage_idx").on(
      table.userId,
      table.stageId
    ),
    rankIdx: index("leaderboard_rank_idx").on(table.rank),
    stageSnapshotIdx: index("leaderboard_stage_snapshot_idx").on(
      table.stageId,
      table.snapshotAt
    ),
  })
);

// Relations for type-safe queries
export const usersRelations = relations(users, ({ many }) => ({
  predictions: many(predictions),
  leaderboardSnapshots: many(leaderboardSnapshots),
}));

export const tournamentStagesRelations = relations(
  tournamentStages,
  ({ many }) => ({
    matches: many(matches),
    leaderboardSnapshots: many(leaderboardSnapshots),
  })
);

export const teamsRelations = relations(teams, ({ many }) => ({
  homeMatches: many(matches, { relationName: "homeTeam" }),
  awayMatches: many(matches, { relationName: "awayTeam" }),
}));

export const venuesRelations = relations(venues, ({ many }) => ({
  matches: many(matches),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  stage: one(tournamentStages, {
    fields: [matches.stageId],
    references: [tournamentStages.id],
  }),
  homeTeam: one(teams, {
    fields: [matches.homeTeamId],
    references: [teams.id],
    relationName: "homeTeam",
  }),
  awayTeam: one(teams, {
    fields: [matches.awayTeamId],
    references: [teams.id],
    relationName: "awayTeam",
  }),
  venue: one(venues, {
    fields: [matches.venueId],
    references: [venues.id],
  }),
  predictions: many(predictions),
}));

export const predictionsRelations = relations(predictions, ({ one }) => ({
  user: one(users, {
    fields: [predictions.userId],
    references: [users.userId],
  }),
  match: one(matches, {
    fields: [predictions.matchId],
    references: [matches.id],
  }),
}));

export const leaderboardSnapshotsRelations = relations(
  leaderboardSnapshots,
  ({ one }) => ({
    user: one(users, {
      fields: [leaderboardSnapshots.userId],
      references: [users.userId],
    }),
    stage: one(tournamentStages, {
      fields: [leaderboardSnapshots.stageId],
      references: [tournamentStages.id],
    }),
  })
);

// TypeScript types for insert and select operations
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type TournamentStage = typeof tournamentStages.$inferSelect;
export type NewTournamentStage = typeof tournamentStages.$inferInsert;

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;

export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;

export type Prediction = typeof predictions.$inferSelect;
export type NewPrediction = typeof predictions.$inferInsert;

export type LeaderboardSnapshot = typeof leaderboardSnapshots.$inferSelect;
export type NewLeaderboardSnapshot = typeof leaderboardSnapshots.$inferInsert;
