import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import {
  adminUpdatePrediction,
  adminDeletePrediction,
  adminGetPrediction,
} from '@/db/queries';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/predictions/[id]
 * Get prediction details (admin only)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;
    const predictionId = parseInt(id);

    if (isNaN(predictionId)) {
      return NextResponse.json(
        { error: 'Invalid prediction ID' },
        { status: 400 }
      );
    }

    const prediction = await adminGetPrediction(predictionId);

    if (!prediction) {
      return NextResponse.json(
        { error: 'Prediction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('Error fetching prediction:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/predictions/[id]
 * Update prediction (admin only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;
    const predictionId = parseInt(id);

    if (isNaN(predictionId)) {
      return NextResponse.json(
        { error: 'Invalid prediction ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { homeScore, awayScore, pointsEarned, isLocked } = body;

    // Validate input
    if (homeScore !== undefined && (typeof homeScore !== 'number' || homeScore < 0)) {
      return NextResponse.json(
        { error: 'Home score must be a non-negative number' },
        { status: 400 }
      );
    }

    if (awayScore !== undefined && (typeof awayScore !== 'number' || awayScore < 0)) {
      return NextResponse.json(
        { error: 'Away score must be a non-negative number' },
        { status: 400 }
      );
    }

    if (
      pointsEarned !== undefined &&
      pointsEarned !== null &&
      (typeof pointsEarned !== 'number' || pointsEarned < 0)
    ) {
      return NextResponse.json(
        { error: 'Points earned must be a non-negative number or null' },
        { status: 400 }
      );
    }

    if (isLocked !== undefined && typeof isLocked !== 'boolean') {
      return NextResponse.json(
        { error: 'isLocked must be a boolean' },
        { status: 400 }
      );
    }

    const updated = await adminUpdatePrediction(predictionId, {
      homeScore,
      awayScore,
      pointsEarned,
      isLocked,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating prediction:', error);
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Prediction not found' },
          { status: 404 }
        );
      }
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/predictions/[id]
 * Delete prediction (admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;
    const predictionId = parseInt(id);

    if (isNaN(predictionId)) {
      return NextResponse.json(
        { error: 'Invalid prediction ID' },
        { status: 400 }
      );
    }

    const result = await adminDeletePrediction(predictionId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting prediction:', error);
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Prediction not found' },
          { status: 404 }
        );
      }
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
