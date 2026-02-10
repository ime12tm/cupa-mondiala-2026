/**
 * Zod Validation Schemas
 *
 * All server action inputs MUST be validated with Zod schemas.
 * See docs/data-mutations.md for server action patterns.
 */

import { z } from 'zod';

// ============================================================================
// REUSABLE SCHEMAS
// ============================================================================

/**
 * Score validation (0-20 range for football/soccer matches)
 */
const scoreSchema = z.number().int().min(0).max(20);

/**
 * Prediction scores (home + away)
 */
export const predictionScoresSchema = z.object({
  homeScore: scoreSchema,
  awayScore: scoreSchema,
});

// ============================================================================
// PREDICTION SCHEMAS
// ============================================================================

/**
 * Create new prediction
 */
export const createPredictionSchema = z.object({
  matchId: z.number().int().positive(),
  ...predictionScoresSchema.shape,
});

/**
 * Update existing prediction
 */
export const updatePredictionSchema = z.object({
  predictionId: z.number().int().positive(),
  ...predictionScoresSchema.shape,
});

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

/**
 * Update match result (admin only)
 */
export const matchResultSchema = z.object({
  matchId: z.number().int().positive(),
  homeScore: scoreSchema,
  awayScore: scoreSchema,
  status: z.enum(['live', 'finished']),
});

/**
 * Update prediction as admin (allows partial updates)
 */
export const updatePredictionAdminSchema = z.object({
  predictionId: z.number().int().positive(),
  homeScore: scoreSchema.optional(),
  awayScore: scoreSchema.optional(),
  pointsEarned: z.number().int().min(0).max(3).nullable().optional(),
  isLocked: z.boolean().optional(),
});

/**
 * Delete prediction (admin only)
 */
export const deletePredictionAdminSchema = z.object({
  predictionId: z.number().int().positive(),
});

// ============================================================================
// WEBHOOK SCHEMAS
// ============================================================================

/**
 * Clerk webhook - user.created / user.updated event
 */
export const clerkUserEventSchema = z.object({
  id: z.string().min(1),
  email_addresses: z.array(z.object({
    id: z.string(),
    email_address: z.string().email(),
  })).min(1),
  primary_email_address_id: z.string().optional(),
  username: z.string().nullable().optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
});

/**
 * Clerk webhook - user.deleted event
 */
export const clerkUserDeletedEventSchema = z.object({
  id: z.string().min(1),
});
