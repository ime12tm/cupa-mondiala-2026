import { redirect } from 'next/navigation';
import { getCurrentUserIdAndSync } from '@/lib/auth';
import { getUserPredictions, getUserStats } from '@/db/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatMatchDate } from '@/lib/date-utils';
import { db } from '@/db';
import { users } from '@/db/schema';
import { desc, gt } from 'drizzle-orm';
import Link from 'next/link';

export default async function MyPredictionsPage() {
  // Ensure user exists in database before querying
  const userId = await getCurrentUserIdAndSync();

  if (!userId) {
    redirect('/');
  }

  const [predictions, statsData] = await Promise.all([
    getUserPredictions(userId),
    getUserStats(userId),
  ]);

  // Calculate user rank
  const allUsers = await db
    .select({ totalPoints: users.totalPoints })
    .from(users)
    .orderBy(desc(users.totalPoints));

  const rank = allUsers.findIndex((u) => u.totalPoints <= statsData.totalPoints) + 1 || allUsers.length + 1;

  const stats = {
    ...statsData,
    rank,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Predictions</h1>
          <p className="text-foreground/60">
            Track your predictions and see how well you're doing
          </p>
        </div>

        {/* Stats Card */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Your Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {stats.totalPoints}
                  </div>
                  <div className="text-sm text-foreground/60 mt-1">Total Points</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    {stats.rank ? `#${stats.rank}` : '-'}
                  </div>
                  <div className="text-sm text-foreground/60 mt-1">Rank</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{stats.exactScores}</div>
                  <div className="text-sm text-foreground/60 mt-1">Exact Scores</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{stats.correctResults}</div>
                  <div className="text-sm text-foreground/60 mt-1">Correct Results</div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-foreground/10">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-foreground/60">Accuracy Rate</span>
                  <span className="text-xl font-bold">
                    {stats.totalPredictions > 0
                      ? Math.round(
                          ((stats.exactScores + stats.correctResults) / stats.totalPredictions) *
                            100
                        )
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-foreground/10 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-600 dark:bg-green-400 h-2 rounded-full transition-all"
                    style={{
                      width: `${stats.totalPredictions > 0
                        ? Math.round(
                            ((stats.exactScores + stats.correctResults) / stats.totalPredictions) *
                              100
                          )
                        : 0}%`
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Predictions List */}
        {predictions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-foreground/60 mb-4">
                You haven't made any predictions yet
              </p>
              <Link
                href="/matches"
                className="text-foreground hover:underline font-medium"
              >
                View Matches →
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-4">
              All Predictions ({predictions.length})
            </h2>
            {predictions.map((prediction) => (
              <Link
                key={prediction.id}
                href={`/matches/${prediction.match.id}`}
              >
                <Card className="hover:bg-foreground/5 transition-colors cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      {/* Match Info */}
                      <div className="flex-1 min-w-[300px]">
                        <div className="text-sm text-foreground/60 mb-2">
                          {prediction.match.stage.name} •{' '}
                          {formatMatchDate(new Date(prediction.match.scheduledAt))}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="font-semibold">
                            {prediction.match.homeTeam?.name || 'TBD'}
                          </div>
                          <div className="text-xl font-bold">
                            {prediction.homeScore}
                          </div>
                          <div className="text-foreground/40">-</div>
                          <div className="text-xl font-bold">
                            {prediction.awayScore}
                          </div>
                          <div className="font-semibold">
                            {prediction.match.awayTeam?.name || 'TBD'}
                          </div>
                        </div>
                      </div>

                      {/* Status and Points */}
                      <div className="flex items-center gap-4">
                        {prediction.match.status === 'finished' ? (
                          <>
                            <div className="text-center">
                              <div className="text-sm text-foreground/60 mb-1">
                                Result
                              </div>
                              <div className="text-lg font-bold">
                                {prediction.match.homeScore} -{' '}
                                {prediction.match.awayScore}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm text-foreground/60 mb-1">
                                Points
                              </div>
                              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {prediction.pointsEarned || 0}
                              </div>
                            </div>
                          </>
                        ) : (
                          <Badge
                            variant={
                              prediction.match.status === 'live'
                                ? 'warning'
                                : 'default'
                            }
                          >
                            {prediction.match.status === 'live'
                              ? 'In Progress'
                              : 'Pending'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
