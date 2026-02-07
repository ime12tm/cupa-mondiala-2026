import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import { predictions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getMatchById } from '@/db/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatMatchDate } from '@/lib/date-utils';
import { PredictionsTable } from './predictions-table';

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
              <PredictionsTable predictions={allPredictions} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
