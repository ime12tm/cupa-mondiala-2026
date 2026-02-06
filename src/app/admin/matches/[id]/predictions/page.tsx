import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import { predictions, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getMatchById } from '@/db/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatMatchDate } from '@/lib/date-utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AdminPredictionsPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminPredictionsPage({
  params,
}: AdminPredictionsPageProps) {
  const { id } = await params;
  const matchId = parseInt(id);

  if (isNaN(matchId)) {
    notFound();
  }

  const match = await getMatchById(matchId);

  if (!match) {
    notFound();
  }

  // Get all predictions for this match
  const allPredictions = await db.query.predictions.findMany({
    where: eq(predictions.matchId, matchId),
    with: {
      user: true,
    },
    orderBy: (predictions, { desc }) => [desc(predictions.createdAt)],
  });

  const resultLabels: Record<string, string> = {
    '1': 'Home Win',
    'X': 'Draw',
    '2': 'Away Win',
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link href={`/admin/matches/${matchId}`}>
            <Button variant="ghost">← Back to Match</Button>
          </Link>
        </div>

        {/* Match Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              Predictions for Match #{matchId}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {match.homeTeam?.name || 'TBD'} vs {match.awayTeam?.name || 'TBD'}
            </div>
            <div className="text-sm text-foreground/60 mt-1">
              {match.stage.name} •{' '}
              {formatMatchDate(new Date(match.scheduledAt))}
            </div>
            {match.status === 'finished' && match.homeScore !== null && (
              <div className="mt-3">
                <Badge variant="success">
                  Final Score: {match.homeScore} - {match.awayScore}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Predictions Table */}
        {allPredictions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-foreground/60">
              No predictions have been made for this match yet.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Predictions ({allPredictions.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="text-center">Home Score</TableHead>
                      <TableHead className="text-center">Away Score</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allPredictions.map((prediction) => (
                      <TableRow key={prediction.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {prediction.user.displayName || prediction.user.username || 'Anonymous'}
                            </div>
                            <div className="text-xs text-foreground/60">
                              {prediction.user.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-xl font-bold">
                            {prediction.homeScore}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-xl font-bold">
                            {prediction.awayScore}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">
                            {resultLabels[prediction.result]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {prediction.pointsEarned !== null ? (
                            <span className="text-lg font-bold text-green-600 dark:text-green-400">
                              {prediction.pointsEarned}
                            </span>
                          ) : (
                            <span className="text-foreground/40">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {prediction.isLocked ? (
                            <Badge variant="default">Locked</Badge>
                          ) : (
                            <Badge variant="info">Open</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-foreground/60">
                            {formatMatchDate(new Date(prediction.createdAt))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Note */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <p className="text-sm text-foreground/60">
              <strong>Note:</strong> Individual prediction editing will be
              implemented in the next phase. For now, you can view all
              predictions and verify points calculation.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
