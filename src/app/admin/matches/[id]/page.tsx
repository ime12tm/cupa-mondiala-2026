import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getMatchById } from '@/db/queries';
import { db } from '@/db';
import { predictions } from '@/db/schema';
import { eq, count } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatFullDate, formatMatchTime } from '@/lib/date-utils';
import { AdminMatchResultForm } from './admin-match-result-form';

interface AdminMatchDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminMatchDetailPage({
  params,
}: AdminMatchDetailPageProps) {
  const { id } = await params;
  const matchId = parseInt(id);

  if (isNaN(matchId)) {
    notFound();
  }

  const match = await getMatchById(matchId);

  if (!match) {
    notFound();
  }

  // Get prediction statistics
  const [predictionStats] = await db
    .select({
      total: count(),
    })
    .from(predictions)
    .where(eq(predictions.matchId, matchId));

  // Status badge function
  const getStatusBadge = (status: 'scheduled' | 'live' | 'finished') => {
    const variants = {
      scheduled: { variant: 'default' as const, label: 'Scheduled' },
      live: { variant: 'danger' as const, label: 'Live' },
      finished: { variant: 'success' as const, label: 'Finished' },
    };
    const { variant, label } = variants[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/admin/matches">
            <Button variant="ghost">← Back to Matches</Button>
          </Link>
        </div>

        {/* Match Info */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Match #{match.id}</CardTitle>
              {getStatusBadge(match.status as 'scheduled' | 'live' | 'finished')}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Teams */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold">
                    {match.homeTeam?.name || 'TBD'}
                  </div>
                  {match.homeTeam?.groupLetter && (
                    <Badge variant="default">Group {match.homeTeam.groupLetter}</Badge>
                  )}
                </div>
                {match.homeScore !== null && (
                  <div className="text-4xl font-bold">{match.homeScore}</div>
                )}
              </div>

              <div className="text-center text-2xl text-foreground/40 font-bold">
                vs
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold">
                    {match.awayTeam?.name || 'TBD'}
                  </div>
                  {match.awayTeam?.groupLetter && (
                    <Badge variant="default">Group {match.awayTeam.groupLetter}</Badge>
                  )}
                </div>
                {match.awayScore !== null && (
                  <div className="text-4xl font-bold">{match.awayScore}</div>
                )}
              </div>
            </div>

            {/* Match Details */}
            <div className="border-t border-foreground/10 pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-foreground/60">Stage:</span>
                <span className="font-medium">{match.stage.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Venue:</span>
                <span className="font-medium">
                  {match.venue.name}, {match.venue.city}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Date:</span>
                <span className="font-medium">
                  {formatFullDate(new Date(match.scheduledAt))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Kickoff:</span>
                <span className="font-medium">
                  {formatMatchTime(new Date(match.scheduledAt), match.venue.timezone)}{' '}
                  ({match.venue.timezone})
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Result Entry Form */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <AdminMatchResultForm match={match} />
          </CardContent>
        </Card>

        {/* Prediction Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Prediction Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-3xl font-bold">{predictionStats.total}</div>
                <div className="text-sm text-foreground/60 mt-1">
                  Total Predictions
                </div>
              </div>
              <div className="flex items-center">
                <Link href={`/admin/matches/${match.id}/predictions`}>
                  <Button variant="secondary">View All Predictions</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
