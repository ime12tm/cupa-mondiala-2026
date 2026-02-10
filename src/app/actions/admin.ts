'use server';

import { requireAdmin } from '@/lib/auth';
import {
  updateMatchResult,
  calculatePointsForMatch,
  lockPredictionsForMatch,
  adminUpdatePrediction,
  adminDeletePrediction,
  adminDeleteAllPredictions,
} from '@/db/queries';
import { matchResultSchema, updatePredictionAdminSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';

export async function updateMatchResultAction(
  matchId: number,
  homeScore: number,
  awayScore: number,
  status: 'live' | 'finished'
) {
  try {
    await requireAdmin();

    // Validate input with Zod
    const validation = matchResultSchema.safeParse({ matchId, homeScore, awayScore, status });
    if (!validation.success) {
      return {
        success: false,
        error: 'Invalid input',
        issues: validation.error.issues,
      };
    }

    const { matchId: validMatchId, homeScore: validHomeScore, awayScore: validAwayScore, status: validStatus } = validation.data;

    // Update match result
    await updateMatchResult(validMatchId, validHomeScore, validAwayScore, validStatus);

    // Lock predictions for this match
    await lockPredictionsForMatch(validMatchId);

    // Calculate points if match is finished
    if (validStatus === 'finished') {
      await calculatePointsForMatch(validMatchId);
    }

    // Revalidate relevant pages
    revalidatePath(`/matches/${validMatchId}`);
    revalidatePath('/admin/matches');
    revalidatePath(`/admin/matches/${validMatchId}`);
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

export async function updatePredictionAction(
  predictionId: number,
  updates: {
    homeScore?: number;
    awayScore?: number;
    pointsEarned?: number | null;
    isLocked?: boolean;
  }
) {
  try {
    await requireAdmin();

    // Validate input with Zod
    const validation = updatePredictionAdminSchema.safeParse({ predictionId, ...updates });
    if (!validation.success) {
      return {
        success: false,
        error: 'Invalid input',
        issues: validation.error.issues,
      };
    }

    const validData = validation.data;

    // Update prediction
    const updated = await adminUpdatePrediction(validData.predictionId, {
      homeScore: validData.homeScore,
      awayScore: validData.awayScore,
      pointsEarned: validData.pointsEarned,
      isLocked: validData.isLocked,
    });

    // Revalidate relevant pages
    revalidatePath('/admin/matches');
    revalidatePath(`/admin/matches/${updated.matchId}`);
    revalidatePath(`/admin/matches/${updated.matchId}/predictions`);
    revalidatePath('/leaderboard');

    return { success: true, prediction: updated };
  } catch (error) {
    console.error('Error updating prediction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update prediction',
    };
  }
}

export async function deletePredictionAction(predictionId: number) {
  try {
    await requireAdmin();

    const result = await adminDeletePrediction(predictionId);

    // Revalidate relevant pages
    revalidatePath('/admin/matches');
    revalidatePath(`/admin/matches/${result.deletedPrediction.matchId}`);
    revalidatePath(`/admin/matches/${result.deletedPrediction.matchId}/predictions`);
    revalidatePath('/leaderboard');

    return { success: true };
  } catch (error) {
    console.error('Error deleting prediction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete prediction',
    };
  }
}

export async function deleteAllPredictionsAction(options: {
  clearLeaderboard?: boolean;
  resetMatchResults?: boolean;
  confirmationText?: string;
}) {
  try {
    // Admin authorization
    await requireAdmin();

    // Safety check: require explicit confirmation
    if (options.confirmationText !== 'DELETE ALL PREDICTIONS') {
      return {
        success: false,
        error: 'Confirmation text does not match. Please type exactly: DELETE ALL PREDICTIONS',
      };
    }

    // Execute the deletion
    const result = await adminDeleteAllPredictions({
      clearLeaderboard: options.clearLeaderboard ?? true,
      resetMatchResults: options.resetMatchResults ?? false,
    });

    // Comprehensive cache revalidation
    revalidatePath('/matches');
    revalidatePath('/matches/[id]', 'page');
    revalidatePath('/my-predictions');
    revalidatePath('/leaderboard');
    revalidatePath('/admin');
    revalidatePath('/admin/matches');
    revalidatePath('/admin/matches/[id]', 'page');
    revalidatePath('/admin/matches/[id]/predictions', 'page');
    revalidatePath('/admin/users/[userId]/predictions', 'page');
    revalidatePath('/predictions-matrix');
    revalidatePath('/groups');

    // Build success message
    let message = `Successfully deleted ${result.stats.predictionsDeleted} predictions from ${result.stats.usersAffected} users`;
    if (result.stats.matchesReset > 0) {
      message += ` and reset ${result.stats.matchesReset} match results`;
    }

    return {
      success: true,
      message,
      stats: result.stats,
    };
  } catch (error) {
    console.error('Error in deleteAllPredictionsAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete all predictions',
    };
  }
}

