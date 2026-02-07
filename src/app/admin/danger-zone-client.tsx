'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteAllPredictionsAction } from '@/app/actions/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function DangerZoneClient() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [clearLeaderboard, setClearLeaderboard] = useState(true);
  const [resetMatchResults, setResetMatchResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    predictionsDeleted: number;
    usersAffected: number;
    pointsReset: number;
    matchesReset?: number;
    leaderboardCleared?: boolean;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleInitialClick = () => {
    setShowConfirm(true);
    setError(null);
    setSuccess(null);
    setStats(null);
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setConfirmText('');
    setError(null);
  };

  const handleConfirmDelete = () => {
    startTransition(async () => {
      setError(null);
      setSuccess(null);

      const result = await deleteAllPredictionsAction({
        clearLeaderboard,
        resetMatchResults,
        confirmationText: confirmText,
      });

      if (result.success) {
        setSuccess(result.message || 'All predictions deleted successfully');
        setStats(result.stats || null);
        setShowConfirm(false);
        setConfirmText('');
        setResetMatchResults(false);
        router.refresh();
      } else {
        setError(result.error || 'Failed to delete predictions');
      }
    });
  };

  if (!showConfirm) {
    return (
      <Card className="border-red-600 dark:border-red-400">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">
            Danger Zone - Reset Tournament
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-foreground/80">
              <strong>Reset All Tournament Data</strong>
            </p>
            <p className="text-sm text-foreground/60">
              This will permanently delete all predictions from all users and reset
              all user points to zero. You can optionally reset match results
              (scores and status) and clear leaderboard snapshots. This action cannot be undone.
            </p>
          </div>

          {success && stats && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md p-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                {success}
              </p>
              <div className="text-xs text-green-700 dark:text-green-300 space-y-1">
                <p>• Predictions deleted: {stats.predictionsDeleted}</p>
                <p>• Users affected: {stats.usersAffected}</p>
                <p>• Points reset: {stats.pointsReset}</p>
                {stats.matchesReset !== undefined && stats.matchesReset > 0 && (
                  <p>• Matches reset: {stats.matchesReset}</p>
                )}
                <p>
                  • Leaderboard cleared:{' '}
                  {stats.leaderboardCleared ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <Button
            variant="danger"
            onClick={handleInitialClick}
            className="w-full"
          >
            Delete All Predictions
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-600 dark:border-red-400">
      <CardHeader>
        <CardTitle className="text-red-600 dark:text-red-400">
          Confirm Deletion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
            Warning: This action cannot be undone!
          </p>
          <p className="text-sm text-red-700 dark:text-red-300">
            This will permanently delete all predictions and reset all user points
            to zero. You can optionally reset match results and clear leaderboard data.
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={resetMatchResults}
              onChange={(e) => setResetMatchResults(e.target.checked)}
              className="w-4 h-4 rounded border-foreground/20"
            />
            <span className="text-sm text-foreground/80">
              Also reset all match results (scores and status)
            </span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={clearLeaderboard}
              onChange={(e) => setClearLeaderboard(e.target.checked)}
              className="w-4 h-4 rounded border-foreground/20"
            />
            <span className="text-sm text-foreground/80">
              Also clear leaderboard snapshots (recommended)
            </span>
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80 block">
            Type <code className="text-red-600 dark:text-red-400">DELETE ALL PREDICTIONS</code> to
            confirm:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE ALL PREDICTIONS"
            className="w-full px-3 py-2 border border-foreground/20 rounded-md bg-background text-foreground"
            disabled={isPending}
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={isPending}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmDelete}
            disabled={isPending || confirmText !== 'DELETE ALL PREDICTIONS'}
            className="flex-1"
          >
            {isPending ? 'Deleting...' : 'Confirm Delete All'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
