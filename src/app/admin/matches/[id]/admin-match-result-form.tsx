'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateMatchResultAction } from '@/app/actions/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Match } from '@/db/schema';

interface AdminMatchResultFormProps {
  match: Match;
}

export function AdminMatchResultForm({ match }: AdminMatchResultFormProps) {
  const router = useRouter();
  const [homeScore, setHomeScore] = useState(match.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState(match.awayScore ?? 0);
  const [status, setStatus] = useState<'live' | 'finished'>(
    match.status === 'scheduled' ? 'finished' : (match.status as 'live' | 'finished')
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await updateMatchResultAction(
        match.id,
        homeScore,
        awayScore,
        status
      );

      if (result.success) {
        setSuccess(
          `Match result ${match.homeScore === null ? 'saved' : 'updated'} successfully! ${
            status === 'finished' ? 'Points have been calculated.' : ''
          }`
        );
        setTimeout(() => {
          router.refresh();
        }, 1500);
      } else {
        setError(result.error || 'Failed to save result');
      }
    });
  };

  const handleScoreChange = (value: string, setter: (val: number) => void) => {
    const num = parseInt(value) || 0;
    if (num >= 0 && num <= 99) {
      setter(num);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {match.homeScore === null ? 'Enter Match Result' : 'Update Match Result'}
        </h3>

        <div className="space-y-4">
          {/* Scores */}
          <div className="flex items-center justify-center gap-6">
            <div className="flex-1 max-w-[120px]">
              <label
                htmlFor="admin-home-score"
                className="block text-sm font-medium mb-2 text-center"
              >
                Home Score
              </label>
              <Input
                id="admin-home-score"
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
                htmlFor="admin-away-score"
                className="block text-sm font-medium mb-2 text-center"
              >
                Away Score
              </label>
              <Input
                id="admin-away-score"
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

          {/* Status */}
          <div>
            <label htmlFor="match-status" className="block text-sm font-medium mb-2">
              Match Status
            </label>
            <select
              id="match-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'live' | 'finished')}
              disabled={isPending}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="live">Live (In Progress)</option>
              <option value="finished">Finished</option>
            </select>
            <p className="text-xs text-foreground/60 mt-1">
              {status === 'live'
                ? 'Match is in progress. You can update the score later.'
                : 'Match is finished. Points will be calculated automatically.'}
            </p>
          </div>
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
        <Button type="submit" disabled={isPending} className="flex-1" size="lg">
          {isPending
            ? 'Saving...'
            : match.homeScore === null
            ? 'Save Result'
            : 'Update Result'}
        </Button>
      </div>

      {match.homeScore === null && (
        <Alert variant="warning">
          <AlertDescription>
            <strong>Important:</strong> Saving the result will lock all user
            predictions for this match. This action cannot be undone automatically.
          </AlertDescription>
        </Alert>
      )}
    </form>
  );
}
