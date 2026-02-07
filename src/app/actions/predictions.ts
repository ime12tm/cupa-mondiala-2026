'use server';

import { getCurrentUserIdAndSync } from '@/lib/auth';
import { upsertPrediction, canUserPredictGroupStage } from '@/db/queries';
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

    // Validation
    if (homeScore < 0 || awayScore < 0) {
      return { success: false, error: 'Scores must be non-negative' };
    }

    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
      return { success: false, error: 'Scores must be whole numbers' };
    }

    // Check if this is a group stage match
    const match = await db.query.matches.findFirst({
      where: (matches, { eq }) => eq(matches.id, matchId),
      with: {
        stage: true,
      },
    });

    if (!match) {
      return { success: false, error: 'Match not found' };
    }

    // Validate group stage predictions
    if (match.stage.slug === 'group_stage') {
      const validation = await canUserPredictGroupStage(userId);
      if (!validation.allowed) {
        return {
          success: false,
          error: validation.reason || 'Group stage predictions are locked',
          progress: validation.progress,
        };
      }
    }

    const prediction = await upsertPrediction(userId, matchId, homeScore, awayScore);

    // Revalidate the match page and predictions page
    revalidatePath(`/matches/${matchId}`);
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
