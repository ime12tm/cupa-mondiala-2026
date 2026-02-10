'use server';

import { getCurrentUserIdAndSync } from '@/lib/auth';
import { upsertPrediction, canUserPredictGroupStage } from '@/db/queries';
import { createPredictionSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';

export async function submitPrediction(
  matchId: number,
  homeScore: number,
  awayScore: number
) {
  try {
    // Get userId and ensure user exists in database (lazy sync)
    const userId = await getCurrentUserIdAndSync();
    if (!userId) {
      return { success: false, error: 'You must be logged in' };
    }

    // Validate input with Zod
    const validation = createPredictionSchema.safeParse({ matchId, homeScore, awayScore });
    if (!validation.success) {
      return {
        success: false,
        error: 'Invalid input',
        issues: validation.error.issues,
      };
    }

    const { matchId: validMatchId, homeScore: validHomeScore, awayScore: validAwayScore } = validation.data;

    // Check if this is a group stage match
    const match = await db.query.matches.findFirst({
      where: (matches, { eq }) => eq(matches.id, validMatchId),
      with: {
        stage: true,
      },
    });

    if (!match) {
      return { success: false, error: 'Match not found' };
    }

    // Validate group stage predictions
    if (match.stage.slug === 'group_stage') {
      const groupStageValidation = await canUserPredictGroupStage(userId);
      if (!groupStageValidation.allowed) {
        return {
          success: false,
          error: groupStageValidation.reason || 'Group stage predictions are locked',
          progress: groupStageValidation.progress,
        };
      }
    }

    const prediction = await upsertPrediction(userId, validMatchId, validHomeScore, validAwayScore);

    // Revalidate the match page and predictions page
    revalidatePath(`/matches/${validMatchId}`);
    revalidatePath('/my-predictions');

    return { success: true, prediction };

  } catch (error) {
    console.error('Error submitting prediction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit prediction'
    };
  }
}
