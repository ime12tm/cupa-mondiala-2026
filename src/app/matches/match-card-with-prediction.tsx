'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { submitPrediction } from '@/app/actions/predictions';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatMatchDate, formatMatchTime } from '@/lib/date-utils';
import type { Match, Team, Venue, TournamentStage, Prediction } from '@/db/schema';

interface MatchCardWithPredictionProps {
  match: Match & {
    homeTeam: Team | null;
    awayTeam: Team | null;
    venue: Venue;
    stage: TournamentStage;
    userPrediction?: Prediction | null;
  };
  userId: string | null;
}

export function MatchCardWithPrediction({ match, userId }: MatchCardWithPredictionProps) {
  const router = useRouter();
  const [firstScore, setFirstScore] = useState(match.userPrediction?.homeScore ?? 0);
  const [secondScore, setSecondScore] = useState(match.userPrediction?.awayScore ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const getStatusBadge = (status: 'scheduled' | 'live' | 'finished') => {
    const variants = {
      scheduled: { variant: 'default' as const, label: 'Scheduled' },
      live: { variant: 'danger' as const, label: 'Live' },
      finished: { variant: 'success' as const, label: 'Finished' },
    };
    const { variant, label } = variants[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const isLocked =
    match.status !== 'scheduled' ||
    match.userPrediction?.isLocked ||
    new Date() >= new Date(match.scheduledAt);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await submitPrediction(match.id, firstScore, secondScore);

      if (result.success) {
        setSuccess('Prediction saved!');
        setTimeout(() => {
          setSuccess(null);
          router.refresh();
        }, 2000);
      } else {
        setError(result.error || 'Failed to save prediction');
      }
    });
  };

  const handleScoreChange = (
    value: string,
    setter: (val: number) => void
  ) => {
    const num = parseInt(value) || 0;
    if (num >= 0 && num <= 99) {
      setter(num);
    }
  };

  // Get predicted result with team name
  const getPredictedResultText = (first: number, second: number) => {
    const firstTeamName = match.homeTeam?.name || 'TBD';
    const secondTeamName = match.awayTeam?.name || 'TBD';

    if (first > second) {
      return `${firstTeamName} win [1]`;
    } else if (first < second) {
      return `${secondTeamName} win [2]`;
    } else {
      return 'Draw [X]';
    }
  };

  // Get result from prediction
  const getResultFromPrediction = (pred: Prediction) => {
    const firstTeamName = match.homeTeam?.name || 'TBD';
    const secondTeamName = match.awayTeam?.name || 'TBD';

    if (pred.result === '1') {
      return `${firstTeamName} win [1]`;
    } else if (pred.result === '2') {
      return `${secondTeamName} win [2]`;
    } else {
      return 'Draw [X]';
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // If click is inside form, do nothing (let form handle it)
    const target = e.target as HTMLElement;
    if (target.closest('form')) {
      return;
    }
    // Otherwise, navigate to match detail page
    router.push(`/matches/${match.id}`);
  };

  return (
    <Card
      className="h-full hover:bg-foreground/5 transition-colors cursor-pointer"
      onClick={handleCardClick}
    >
      <CardContent className="p-6">
        {/* Header with stage and status */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-foreground/60">
            {match.stage.name}
          </div>
          <div className="flex gap-2">
            {getStatusBadge(match.status as 'scheduled' | 'live' | 'finished')}
            {match.userPrediction && <Badge variant="info">Predicted</Badge>}
          </div>
        </div>

        {/* Teams */}
        <div className="space-y-3 mb-4">
          {/* First Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              {match.homeTeam?.flagUrl && (
                <div className="relative w-8 h-8 flex-shrink-0 rounded-full overflow-hidden border border-foreground/10">
                  <Image
                    src={match.homeTeam.flagUrl}
                    alt={`${match.homeTeam.name} flag`}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="font-semibold text-lg">
                {match.homeTeam?.name || 'TBD'}
              </div>
              {match.homeTeam?.groupLetter && (
                <Badge variant="default" className="text-xs">
                  Group {match.homeTeam.groupLetter}
                </Badge>
              )}
            </div>
            {match.status === 'finished' && match.homeScore !== null && (
              <div className="text-2xl font-bold ml-4">{match.homeScore}</div>
            )}
          </div>

          {/* Second Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              {match.awayTeam?.flagUrl && (
                <div className="relative w-8 h-8 flex-shrink-0 rounded-full overflow-hidden border border-foreground/10">
                  <Image
                    src={match.awayTeam.flagUrl}
                    alt={`${match.awayTeam.name} flag`}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="font-semibold text-lg">
                {match.awayTeam?.name || 'TBD'}
              </div>
              {match.awayTeam?.groupLetter && (
                <Badge variant="default" className="text-xs">
                  Group {match.awayTeam.groupLetter}
                </Badge>
              )}
            </div>
            {match.status === 'finished' && match.awayScore !== null && (
              <div className="text-2xl font-bold ml-4">{match.awayScore}</div>
            )}
          </div>
        </div>

        {/* Venue and Time */}
        <div className="border-t border-foreground/10 pt-3 space-y-1 mb-4">
          <div className="text-sm text-foreground/60">
            {match.venue.name}, {match.venue.city}
          </div>
          <div className="text-sm font-medium">
            {formatMatchDate(new Date(match.scheduledAt))}
            {' • '}
            {formatMatchTime(new Date(match.scheduledAt), match.venue.timezone)}
          </div>
        </div>

        {/* Prediction Section */}
        {!userId ? (
          <div className="text-center text-sm text-foreground/60 py-3 border-t border-foreground/10">
            Sign in to make predictions
          </div>
        ) : isLocked ? (
          // Display locked prediction
          match.userPrediction ? (
            <div className="border-t border-foreground/10 pt-4 space-y-3">
              <div className="text-sm font-medium text-foreground/60">Your Prediction</div>
              <div className="flex items-center justify-center gap-4">
                <div className="text-2xl font-bold">{match.userPrediction.homeScore}</div>
                <div className="text-foreground/40">-</div>
                <div className="text-2xl font-bold">{match.userPrediction.awayScore}</div>
              </div>
              <div className="text-center text-sm">
                {getResultFromPrediction(match.userPrediction)}
              </div>
              {match.userPrediction.pointsEarned !== null && (
                <div className="text-center pt-2 border-t border-foreground/10">
                  <div className="text-xs text-foreground/60">Points Earned</div>
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    {match.userPrediction.pointsEarned}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-sm text-foreground/60 py-3 border-t border-foreground/10">
              No prediction made
            </div>
          )
        ) : (
          // Prediction form
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="border-t border-foreground/10 pt-4 space-y-3"
          >
            <div className="text-sm font-medium text-foreground/60">
              {match.userPrediction ? 'Update Prediction' : 'Make Prediction'}
            </div>

            <div className="flex items-center justify-center gap-4">
              {/* First Team Score */}
              <div className="flex-1 max-w-[80px]">
                <Input
                  type="number"
                  min="0"
                  max="99"
                  value={firstScore}
                  onChange={(e) => handleScoreChange(e.target.value, setFirstScore)}
                  onClick={(e) => e.stopPropagation()}
                  disabled={isPending}
                  className="text-center text-xl font-bold h-12"
                />
              </div>

              <div className="text-xl font-bold text-foreground/40">-</div>

              {/* Second Team Score */}
              <div className="flex-1 max-w-[80px]">
                <Input
                  type="number"
                  min="0"
                  max="99"
                  value={secondScore}
                  onChange={(e) => handleScoreChange(e.target.value, setSecondScore)}
                  onClick={(e) => e.stopPropagation()}
                  disabled={isPending}
                  className="text-center text-xl font-bold h-12"
                />
              </div>
            </div>

            {/* Predicted Result */}
            <div className="text-center text-sm text-foreground/60">
              {getPredictedResultText(firstScore, secondScore)}
            </div>

            {error && (
              <Alert variant="danger">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert variant="success">
                <AlertDescription className="text-xs">{success}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isPending}
              onClick={(e) => e.stopPropagation()}
              className="w-full"
              size="sm"
            >
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
