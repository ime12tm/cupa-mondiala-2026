'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updatePredictionAction, deletePredictionAction } from '@/app/actions/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Prediction } from '@/db/schema';

interface EditPredictionFormProps {
  prediction: Prediction & {
    user: {
      displayName: string | null;
      username: string | null;
      email: string;
    };
  };
  onCancel: () => void;
}

export function EditPredictionForm({ prediction, onCancel }: EditPredictionFormProps) {
  const router = useRouter();
  const [homeScore, setHomeScore] = useState(prediction.homeScore);
  const [awayScore, setAwayScore] = useState(prediction.awayScore);
  const [pointsEarned, setPointsEarned] = useState<number | null>(prediction.pointsEarned);
  const [isLocked, setIsLocked] = useState(prediction.isLocked);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await updatePredictionAction(prediction.id, {
        homeScore,
        awayScore,
        pointsEarned,
        isLocked,
      });

      if (result.success) {
        setSuccess('Prediction updated successfully!');
        setTimeout(() => {
          router.refresh();
          onCancel();
        }, 1000);
      } else {
        setError(result.error || 'Failed to update prediction');
      }
    });
  };

  const handleDelete = async () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await deletePredictionAction(prediction.id);

      if (result.success) {
        setSuccess('Prediction deleted successfully!');
        setTimeout(() => {
          router.refresh();
          onCancel();
        }, 1000);
      } else {
        setError(result.error || 'Failed to delete prediction');
      }
    });
  };

  const handleScoreChange = (value: string, setter: (val: number) => void) => {
    const num = parseInt(value) || 0;
    if (num >= 0 && num <= 99) {
      setter(num);
    }
  };

  const handlePointsChange = (value: string) => {
    if (value === '') {
      setPointsEarned(null);
    } else {
      const num = parseInt(value) || 0;
      if (num >= 0 && num <= 99) {
        setPointsEarned(num);
      }
    }
  };

  const userName = prediction.user.displayName || prediction.user.username || 'Anonymous';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Prediction for {userName}</CardTitle>
      </CardHeader>
      <CardContent>
        {!showDeleteConfirm ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Predicted Scores */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Predicted Scores</h4>
                <div className="flex items-center justify-center gap-6">
                  <div className="flex-1 max-w-[120px]">
                    <label
                      htmlFor="edit-home-score"
                      className="block text-sm font-medium mb-2 text-center"
                    >
                      Home Score
                    </label>
                    <Input
                      id="edit-home-score"
                      type="number"
                      min="0"
                      max="99"
                      value={homeScore}
                      onChange={(e) => handleScoreChange(e.target.value, setHomeScore)}
                      disabled={isPending}
                      className="text-center text-2xl font-bold h-16"
                    />
                  </div>

                  <div className="text-3xl font-bold text-foreground/40 pt-6">-</div>

                  <div className="flex-1 max-w-[120px]">
                    <label
                      htmlFor="edit-away-score"
                      className="block text-sm font-medium mb-2 text-center"
                    >
                      Away Score
                    </label>
                    <Input
                      id="edit-away-score"
                      type="number"
                      min="0"
                      max="99"
                      value={awayScore}
                      onChange={(e) => handleScoreChange(e.target.value, setAwayScore)}
                      disabled={isPending}
                      className="text-center text-2xl font-bold h-16"
                    />
                  </div>
                </div>
              </div>

              {/* Points Earned */}
              <div>
                <label htmlFor="points-earned" className="block text-sm font-medium mb-2">
                  Points Earned
                </label>
                <Input
                  id="points-earned"
                  type="number"
                  min="0"
                  max="99"
                  value={pointsEarned ?? ''}
                  onChange={(e) => handlePointsChange(e.target.value)}
                  disabled={isPending}
                  placeholder="Not calculated yet"
                  className="max-w-[200px]"
                />
                <p className="text-xs text-foreground/60 mt-1">
                  Leave empty if points haven't been calculated yet. Changing this will adjust the user's total points.
                </p>
              </div>

              {/* Lock Status */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is-locked"
                  checked={isLocked}
                  onChange={(e) => setIsLocked(e.target.checked)}
                  disabled={isPending}
                  className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
                />
                <label htmlFor="is-locked" className="text-sm font-medium">
                  Lock prediction (prevent user edits)
                </label>
              </div>
            </div>

            {error && (
              <Alert variant="danger">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert variant="success">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
                disabled={isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

            <div className="border-t pt-4">
              <Button
                type="button"
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isPending}
                className="w-full"
              >
                Delete Prediction
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <Alert variant="danger">
              <AlertDescription>
                <strong>Are you sure?</strong> This will permanently delete this prediction
                and adjust the user's total points. This action cannot be undone.
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="danger">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert variant="success">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1"
              >
                {isPending ? 'Deleting...' : 'Yes, Delete'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
