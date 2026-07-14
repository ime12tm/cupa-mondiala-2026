'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setPredictionForUserAction } from '@/app/actions/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { User } from '@/db/schema';

interface AddPredictionFormProps {
  matchId: number;
  users: User[];
  existingPredictionsByUserId: Record<string, { homeScore: number; awayScore: number }>;
}

export function AddPredictionForm({
  matchId,
  users,
  existingPredictionsByUserId,
}: AddPredictionFormProps) {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const getUserDisplayName = (user: User) =>
    user.displayName || user.username || user.email.split('@')[0];

  const willOverwrite = useMemo(
    () => userId !== '' && userId in existingPredictionsByUserId,
    [userId, existingPredictionsByUserId]
  );

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextUserId = e.target.value;
    setUserId(nextUserId);

    const existing = existingPredictionsByUserId[nextUserId];
    setHomeScore(existing?.homeScore ?? 0);
    setAwayScore(existing?.awayScore ?? 0);
  };

  const handleScoreChange = (value: string, setter: (val: number) => void) => {
    const num = parseInt(value) || 0;
    if (num >= 0 && num <= 99) {
      setter(num);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!userId) {
      setError('Select a user first');
      return;
    }

    startTransition(async () => {
      const result = await setPredictionForUserAction({
        matchId,
        userId,
        homeScore,
        awayScore,
      });

      if (result.success) {
        setSuccess('Prediction saved successfully!');
        router.refresh();
      } else {
        setError(result.error || 'Failed to save prediction');
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add / Overwrite Prediction (Admin)</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="add-prediction-user" className="block text-sm font-medium mb-2">
              User
            </label>
            <Select
              id="add-prediction-user"
              value={userId}
              onChange={handleUserChange}
              disabled={isPending}
            >
              <option value="">Select a user...</option>
              {users.map((user) => (
                <option key={user.userId} value={user.userId}>
                  {getUserDisplayName(user)}
                  {user.userId in existingPredictionsByUserId ? ' (already predicted)' : ''}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center justify-center gap-6">
            <div className="flex-1 max-w-[120px]">
              <label
                htmlFor="add-home-score"
                className="block text-sm font-medium mb-2 text-center"
              >
                Home Score
              </label>
              <Input
                id="add-home-score"
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
                htmlFor="add-away-score"
                className="block text-sm font-medium mb-2 text-center"
              >
                Away Score
              </label>
              <Input
                id="add-away-score"
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

          {willOverwrite && (
            <Alert variant="default">
              <AlertDescription>
                This user already has a prediction for this match. Submitting will overwrite it.
              </AlertDescription>
            </Alert>
          )}

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

          <Button type="submit" disabled={isPending || !userId} className="w-full">
            {isPending ? 'Saving...' : willOverwrite ? 'Overwrite Prediction' : 'Add Prediction'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
