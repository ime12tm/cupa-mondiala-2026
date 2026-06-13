'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { recalculateAllPointsAction } from '@/app/actions/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function RecalculatePointsClient() {
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    matchesProcessed: number;
    predictionsProcessed: number;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRecalculate = () => {
    startTransition(async () => {
      setError(null);
      setResult(null);

      const res = await recalculateAllPointsAction();

      if (res.success) {
        setResult({
          matchesProcessed: res.matchesProcessed ?? 0,
          predictionsProcessed: res.predictionsProcessed ?? 0,
        });
        router.refresh();
      } else {
        setError(res.error || 'Failed to recalculate points');
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recalculate Leaderboard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-foreground/60">
          Resets all user points to zero and recomputes them from scratch using
          the actual match results vs each user&apos;s predictions. Run this if
          the leaderboard looks incorrect after entering or correcting match
          results.
        </p>

        {result && (
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md p-3">
            <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
              Recalculation complete
            </p>
            <div className="text-xs text-green-700 dark:text-green-300 space-y-1">
              <p>• Matches processed: {result.matchesProcessed}</p>
              <p>• Predictions recalculated: {result.predictionsProcessed}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <Button
          variant="secondary"
          onClick={handleRecalculate}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? 'Recalculating...' : 'Recalculate All Points'}
        </Button>
      </CardContent>
    </Card>
  );
}
