import { getCurrentUserIdAndSync } from '@/lib/auth';
import { getLeaderboard } from '@/db/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { db } from '@/db';
import { predictions } from '@/db/schema';
import { eq, count, and, gte, isNotNull } from 'drizzle-orm';

export default async function LeaderboardPage() {
  // Ensure user exists in database if logged in
  const userId = await getCurrentUserIdAndSync();
  const users = await getLeaderboard(100); // Top 100 users

  // Calculate rankings with rank numbers and stats
  const rankings = await Promise.all(
    users.map(async (user, index) => {
      // Get prediction stats for each user
      const userPredictions = await db.query.predictions.findMany({
        where: eq(predictions.userId, user.userId),
      });

      const totalPredictions = userPredictions.length;
      const completedPredictions = userPredictions.filter(
        (p) => p.pointsEarned !== null
      );
      const exactScores = completedPredictions.filter(
        (p) => p.pointsEarned! >= 3
      ).length;
      const correctResults = completedPredictions.filter(
        (p) => p.pointsEarned! >= 1 && p.pointsEarned! < 3
      ).length;

      return {
        ...user,
        rank: index + 1,
        totalPredictions,
        exactScores,
        correctResults,
      };
    })
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
          <p className="text-foreground/60">
            See how you rank against other predictors
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">How to Earn Points</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-foreground/60">
              <div className="space-y-1">
                <div>• Exact score: 3 points</div>
                <div>• Correct result: 1 point</div>
                <div>• Points multiplied by stage</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Stage Multipliers</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-foreground/60">
              <div className="space-y-1">
                <div>• Group Stage: 1.0x</div>
                <div>• Round of 16: 1.5x</div>
                <div>• Quarter Finals: 2.0x</div>
                <div>• Semi Finals: 2.5x</div>
                <div>• Final: 3.0x</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Competition Stats</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-foreground/60">Total Players:</span>
                  <span className="font-medium">{rankings.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/60">Total Matches:</span>
                  <span className="font-medium">104</span>
                </div>
                {rankings[0] && (
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Highest Score:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {rankings[0].totalPoints}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard Table */}
        {rankings.length === 0 ? (
          <div className="text-center py-12 text-foreground/60">
            No rankings available yet. Be the first to make predictions!
          </div>
        ) : (
          <div className="rounded-lg border border-foreground/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Rank</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="text-right hidden md:table-cell">
                    Exact Scores
                  </TableHead>
                  <TableHead className="text-right hidden md:table-cell">
                    Correct Results
                  </TableHead>
                  <TableHead className="text-right hidden sm:table-cell">
                    Total Predictions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankings.map((entry) => {
                  const isCurrentUser = entry.userId === userId;

                  return (
                    <TableRow
                      key={entry.userId}
                      className={isCurrentUser ? 'bg-foreground/5' : ''}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">#{entry.rank}</span>
                          {entry.rank === 1 && <span className="text-xl">🥇</span>}
                          {entry.rank === 2 && <span className="text-xl">🥈</span>}
                          {entry.rank === 3 && <span className="text-xl">🥉</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">
                              {entry.displayName || entry.username || 'Anonymous User'}
                            </div>
                            {isCurrentUser && (
                              <Badge variant="info" className="mt-1">
                                You
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xl font-bold text-green-600 dark:text-green-400">
                          {entry.totalPoints}
                        </span>
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        <span className="font-medium">{entry.exactScores}</span>
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        <span className="font-medium">{entry.correctResults}</span>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        <span className="text-foreground/60">
                          {entry.totalPredictions}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
