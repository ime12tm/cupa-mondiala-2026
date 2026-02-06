'use server';

import { requireAdmin } from '@/lib/auth';
import {
  updateMatchResult,
  calculatePointsForMatch,
  lockPredictionsForMatch,
} from '@/db/queries';
import { revalidatePath } from 'next/cache';

export async function updateMatchResultAction(
  matchId: number,
  homeScore: number,
  awayScore: number,
  status: 'live' | 'finished'
) {
  try {
    await requireAdmin();

    // Validation
    if (homeScore < 0 || awayScore < 0) {
      return { success: false, error: 'Scores must be non-negative' };
    }

    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
      return { success: false, error: 'Scores must be whole numbers' };
    }

    // Update match result
    await updateMatchResult(matchId, homeScore, awayScore, status);

    // Lock predictions for this match
    await lockPredictionsForMatch(matchId);

    // Calculate points if match is finished
    if (status === 'finished') {
      await calculatePointsForMatch(matchId);
    }

    // Revalidate relevant pages
    revalidatePath(`/matches/${matchId}`);
    revalidatePath('/admin/matches');
    revalidatePath(`/admin/matches/${matchId}`);
    revalidatePath('/leaderboard');
    revalidatePath('/my-predictions');

    return { success: true };
  } catch (error) {
    console.error('Error updating match result:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update match result',
    };
  }
}
