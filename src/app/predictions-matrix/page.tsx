import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { tournamentStages } from '@/db/schema';
import { asc } from 'drizzle-orm';
import { getPredictionsMatrix } from '@/db/queries';
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
import { formatShortDate } from '@/lib/date-utils';
import { MatrixFilters } from './matrix-filters';

interface PredictionsMatrixPageProps {
  searchParams: Promise<{
    stage?: string;
    finished?: string;
  }>;
}

export default async function PredictionsMatrixPage({
  searchParams,
}: PredictionsMatrixPageProps) {
  // Require authentication
  const { userId } = await auth();

  if (!userId) {
    redirect('/');
  }

  const params = await searchParams;
  const stageId = params.stage ? parseInt(params.stage) : undefined;
  const finishedOnly = params.finished === 'true';

  // Fetch data
  const { matches, users, predictionLookup } = await getPredictionsMatrix({
    stageId,
    finishedOnly,
  });

  // Get all stages for filter dropdown
  const stages = await db.query.tournamentStages.findMany({
    orderBy: [asc(tournamentStages.sortOrder)],
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Predictions Matrix</h1>
        <p className="text-foreground/60">
          View all predictions from all users for every match
        </p>
      </div>

      {/* Filters */}
      <MatrixFilters
        stages={stages}
        currentStage={stageId}
        finishedOnly={finishedOnly}
      />

      {/* Legend Card */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Color Legend</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-6 sm:w-12 sm:h-8 bg-green-100 dark:bg-green-950 border border-green-300 dark:border-green-700 rounded flex-shrink-0"></div>
            <span className="text-xs sm:text-sm">Exact Score (3 pts)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-6 sm:w-12 sm:h-8 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded flex-shrink-0"></div>
            <span className="text-xs sm:text-sm">Correct Result (1 pt)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-6 sm:w-12 sm:h-8 bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-700 rounded flex-shrink-0"></div>
            <span className="text-xs sm:text-sm">Wrong (0 pts)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-6 sm:w-12 sm:h-8 bg-foreground/5 border border-foreground/20 rounded flex-shrink-0"></div>
            <span className="text-xs sm:text-sm">No Prediction</span>
          </div>
        </CardContent>
      </Card>

      {/* Matrix Table */}
      {matches.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-foreground/60">
            No matches found with selected filters.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Scrollable container with sticky headers */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    {/* First column: Match info - sticky left */}
                    <TableHead
                      className="sticky left-0 bg-background z-20 min-w-[200px] sm:min-w-[240px] border-r border-foreground/10"
                    >
                      Match
                    </TableHead>

                    {/* User columns */}
                    {users.map((user) => (
                      <TableHead
                        key={user.userId}
                        className="text-center min-w-[80px] sm:min-w-[100px] px-1 sm:px-2"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <div className="font-medium text-xs truncate max-w-[70px] sm:max-w-[90px]">
                            {user.displayName || user.username || 'Anonymous'}
                          </div>
                          <Badge variant="default" className="text-xs px-1">
                            {user.totalPoints} pts
                          </Badge>
                        </div>
                      </TableHead>
                    ))}

                    {/* Last column: Final result - sticky right */}
                    <TableHead
                      className="sticky right-0 bg-background z-20 text-center min-w-[80px] sm:min-w-[100px] border-l border-foreground/10"
                    >
                      Final Result
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {matches.map((match) => {
                    const matchPredictions = predictionLookup.get(match.id);

                    return (
                      <TableRow key={match.id}>
                        {/* Match info cell - sticky left */}
                        <TableCell
                          className="sticky left-0 bg-background z-10 border-r border-foreground/10 font-medium"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="text-xs sm:text-sm">
                              {match.homeTeam?.name || match.homeTeamPlaceholder || 'TBD'}
                              {' vs '}
                              {match.awayTeam?.name || match.awayTeamPlaceholder || 'TBD'}
                            </div>
                            <div className="text-xs text-foreground/60">
                              {match.stage.name} • {formatShortDate(new Date(match.scheduledAt))}
                            </div>
                          </div>
                        </TableCell>

                        {/* User prediction cells */}
                        {users.map((user) => {
                          const prediction = matchPredictions?.get(user.userId);

                          if (!prediction) {
                            // No prediction made
                            return (
                              <TableCell
                                key={user.userId}
                                className="text-center bg-foreground/5"
                              >
                                <span className="text-foreground/40">-</span>
                              </TableCell>
                            );
                          }

                          // Determine cell color based on points
                          let cellClasses = 'text-center font-medium ';

                          if (prediction.pointsEarned === null) {
                            // Match not finished yet
                            cellClasses += 'bg-foreground/5';
                          } else if (prediction.pointsEarned === 3) {
                            // Exact score - GREEN
                            cellClasses += 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200';
                          } else if (prediction.pointsEarned === 1) {
                            // Correct result only - GRAY
                            cellClasses += 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
                          } else {
                            // Wrong prediction - RED
                            cellClasses += 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200';
                          }

                          return (
                            <TableCell
                              key={user.userId}
                              className={cellClasses}
                            >
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-bold">
                                  {prediction.homeScore}-{prediction.awayScore}
                                </span>
                                {prediction.pointsEarned !== null && (
                                  <Badge
                                    variant="default"
                                    className="text-xs mt-1"
                                  >
                                    {prediction.pointsEarned}pt
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}

                        {/* Final result cell - sticky right */}
                        <TableCell
                          className="sticky right-0 bg-background z-10 text-center border-l border-foreground/10 font-bold"
                        >
                          {match.status === 'finished' &&
                           match.homeScore !== null &&
                           match.awayScore !== null ? (
                            <div className="flex flex-col items-center">
                              <span className="text-lg">
                                {match.homeScore}-{match.awayScore}
                              </span>
                              <Badge variant="default" className="mt-1 text-xs">
                                Final
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-foreground/40">TBD</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Summary */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Matrix Statistics</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-foreground/60">Total Matches</div>
              <div className="text-2xl font-bold">{matches.length}</div>
            </div>
            <div>
              <div className="text-foreground/60">Total Users</div>
              <div className="text-2xl font-bold">{users.length}</div>
            </div>
            <div>
              <div className="text-foreground/60">Total Predictions</div>
              <div className="text-2xl font-bold">
                {Array.from(predictionLookup.values()).reduce(
                  (sum, userMap) => sum + userMap.size,
                  0
                )}
              </div>
            </div>
            <div>
              <div className="text-foreground/60">Coverage</div>
              <div className="text-2xl font-bold">
                {matches.length > 0 && users.length > 0
                  ? ((Array.from(predictionLookup.values()).reduce(
                      (sum, userMap) => sum + userMap.size,
                      0
                    ) / (matches.length * users.length)) * 100).toFixed(1)
                  : '0.0'}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
