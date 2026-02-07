'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitPrediction } from '@/app/actions/predictions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatMatchTime, formatFullDate } from '@/lib/date-utils';
import Link from 'next/link';
import type { Match, Team, Venue, TournamentStage, Prediction } from '@/db/schema';

interface MatchDetailClientProps {
  match: Match & {
    homeTeam: Team | null;
    awayTeam: Team | null;
    venue: Venue;
    stage: TournamentStage;
    userPrediction?: Prediction | null;
  };
  userId: string | null;
}

export function MatchDetailClient({ match, userId }: MatchDetailClientProps) {
  const router = useRouter();
  const [firstScore, setFirstScore] = useState(match.userPrediction?.homeScore ?? 0);
  const [secondScore, setSecondScore] = useState(match.userPrediction?.awayScore ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Status badge variants
  const getStatusBadge = (status: 'scheduled' | 'live' | 'finished') => {
    const variants = {
      scheduled: { variant: 'default' as const, label: 'Scheduled' },
      live: { variant: 'danger' as const, label: 'Live' },
      finished: { variant: 'success' as const, label: 'Finished' },
    };
    const { variant, label } = variants[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  // Check if prediction is locked
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
        setSuccess('Prediction saved successfully!');
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

  // Calculate predicted result for display with team name
  const getPredictedResult = (first: number, second: number) => {
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

  // Match result calculation
  const getMatchResult = () => {
    if (match.homeScore === null || match.awayScore === null) return null;
    const firstTeamName = match.homeTeam?.name || 'TBD';
    const secondTeamName = match.awayTeam?.name || 'TBD';

    if (match.homeScore > match.awayScore) {
      return `${firstTeamName} win [1]`;
    } else if (match.homeScore < match.awayScore) {
      return `${secondTeamName} win [2]`;
    } else {
      return 'Draw [X]';
    }
  };

  // Get result text from prediction
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/matches">
            <Button variant="ghost">← Back to Matches</Button>
          </Link>
        </div>

        {/* Match Info Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{match.stage.name}</CardTitle>
              {getStatusBadge(match.status as 'scheduled' | 'live' | 'finished')}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Teams */}
            <div className="space-y-4">
              {/* First Team */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold">
                    {match.homeTeam?.name || 'TBD'}
                  </div>
                  {match.homeTeam?.groupLetter && (
                    <Badge variant="default">Group {match.homeTeam.groupLetter}</Badge>
                  )}
                </div>
                {match.status === 'finished' && match.homeScore !== null && (
                  <div className="text-4xl font-bold">{match.homeScore}</div>
                )}
              </div>

              <div className="text-center text-2xl text-foreground/40 font-bold">
                vs
              </div>

              {/* Second Team */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold">
                    {match.awayTeam?.name || 'TBD'}
                  </div>
                  {match.awayTeam?.groupLetter && (
                    <Badge variant="default">Group {match.awayTeam.groupLetter}</Badge>
                  )}
                </div>
                {match.status === 'finished' && match.awayScore !== null && (
                  <div className="text-4xl font-bold">{match.awayScore}</div>
                )}
              </div>
            </div>

            {/* Match Details */}
            <div className="border-t border-foreground/10 pt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground/60">Venue:</span>
                <span className="font-medium">
                  {match.venue.name}, {match.venue.city}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground/60">Date:</span>
                <span className="font-medium">
                  {formatFullDate(new Date(match.scheduledAt))}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground/60">Kickoff Time:</span>
                <span className="font-medium">
                  {formatMatchTime(new Date(match.scheduledAt), match.venue.timezone)}{' '}
                  ({match.venue.timezone})
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prediction Section */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Prediction Form or Display */}
          <div>
            {!userId ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-foreground/60 mb-4">
                    Sign in to make predictions
                  </p>
                  <Link href="/matches">
                    <Button>Sign In</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : isLocked ? (
              // Display locked prediction
              match.userPrediction ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Your Prediction</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Score */}
                    <div className="flex items-center justify-center gap-6">
                      <div className="text-4xl font-bold">{match.userPrediction.homeScore}</div>
                      <div className="text-2xl text-foreground/40">-</div>
                      <div className="text-4xl font-bold">{match.userPrediction.awayScore}</div>
                    </div>

                    {/* Result */}
                    <div className="text-center">
                      <div className="text-sm text-foreground/60 mb-1">Predicted Result</div>
                      <Badge variant="info">{getResultFromPrediction(match.userPrediction)}</Badge>
                    </div>

                    {/* Points Earned */}
                    {match.userPrediction.pointsEarned !== null && (
                      <div className="text-center pt-4 border-t border-foreground/10">
                        <div className="text-sm text-foreground/60 mb-1">Points Earned</div>
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                          {match.userPrediction.pointsEarned}
                        </div>
                      </div>
                    )}

                    {/* Lock Status */}
                    {match.userPrediction.isLocked && (
                      <div className="text-center text-sm text-foreground/60">
                        <Badge variant="default">Locked</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center text-foreground/60">
                    No prediction made for this match
                  </CardContent>
                </Card>
              )
            ) : (
              // Prediction form
              <Card>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">
                        {match.userPrediction ? 'Update Your Prediction' : 'Make Your Prediction'}
                      </h3>

                      <div className="flex items-center justify-center gap-6">
                        {/* First Team Score */}
                        <div className="flex-1 max-w-[120px]">
                          <label
                            htmlFor="first-score"
                            className="block text-sm font-medium mb-2 text-center"
                          >
                            First Team Score
                          </label>
                          <Input
                            id="first-score"
                            type="number"
                            min="0"
                            max="99"
                            value={firstScore}
                            onChange={(e) => handleScoreChange(e.target.value, setFirstScore)}
                            disabled={isPending}
                            className="text-center text-2xl font-bold h-16"
                          />
                        </div>

                        <div className="text-3xl font-bold text-foreground/40 pt-6">-</div>

                        {/* Second Team Score */}
                        <div className="flex-1 max-w-[120px]">
                          <label
                            htmlFor="second-score"
                            className="block text-sm font-medium mb-2 text-center"
                          >
                            Second Team Score
                          </label>
                          <Input
                            id="second-score"
                            type="number"
                            min="0"
                            max="99"
                            value={secondScore}
                            onChange={(e) => handleScoreChange(e.target.value, setSecondScore)}
                            disabled={isPending}
                            className="text-center text-2xl font-bold h-16"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Predicted Result */}
                    <div className="text-center">
                      <div className="text-sm text-foreground/60 mb-1">Predicted Result</div>
                      <div className="text-lg font-semibold">
                        {getPredictedResult(firstScore, secondScore)}
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

                    <Button
                      type="submit"
                      disabled={isPending}
                      className="w-full"
                      size="lg"
                    >
                      {isPending
                        ? 'Saving...'
                        : match.userPrediction
                        ? 'Update Prediction'
                        : 'Submit Prediction'}
                    </Button>

                    <div className="text-xs text-center text-foreground/60">
                      You can change your prediction until the match starts
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Match Result */}
          <div>
            {match.status === 'finished' && match.homeScore !== null && match.awayScore !== null && (
              <Card>
                <CardHeader>
                  <CardTitle>Final Result</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Score */}
                  <div className="flex items-center justify-center gap-6">
                    <div className="text-5xl font-bold">{match.homeScore}</div>
                    <div className="text-3xl text-foreground/40">-</div>
                    <div className="text-5xl font-bold">{match.awayScore}</div>
                  </div>

                  {/* Result */}
                  <div className="text-center">
                    <Badge variant="success" className="text-base px-4 py-2">
                      {getMatchResult()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
            {match.status === 'live' && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Badge variant="warning" className="mb-4">
                    Match in Progress
                  </Badge>
                  <p className="text-foreground/60">
                    Final result will be available after the match ends
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Scoring Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How Points Are Calculated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-foreground/60">Exact score match:</span>
              <span className="font-medium">3 points</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/60">Correct result only:</span>
              <span className="font-medium">1 point</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/60">Wrong prediction:</span>
              <span className="font-medium">0 points</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
