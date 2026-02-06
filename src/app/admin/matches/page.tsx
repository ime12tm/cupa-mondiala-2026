import Link from 'next/link';
import { db } from '@/db';
import { matches } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatMatchDate, formatMatchTime } from '@/lib/date-utils';

interface AdminMatchesPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminMatchesPage({
  searchParams,
}: AdminMatchesPageProps) {
  const params = await searchParams;
  const statusFilter = params.status as 'scheduled' | 'live' | 'finished' | undefined;

  // Get all matches with optional status filter
  const allMatches = await db.query.matches.findMany({
    where: statusFilter ? eq(matches.status, statusFilter) : undefined,
    orderBy: (matches, { asc }) => [asc(matches.scheduledAt)],
    with: {
      homeTeam: true,
      awayTeam: true,
      venue: true,
      stage: true,
    },
  });

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
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Manage Matches</h1>
          <p className="text-foreground/60">
            Enter results and manage match data
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-3 mb-6">
          <Link href="/admin/matches">
            <Button variant={!statusFilter ? 'primary' : 'secondary'} size="sm">
              All
            </Button>
          </Link>
          <Link href="/admin/matches?status=scheduled">
            <Button
              variant={statusFilter === 'scheduled' ? 'primary' : 'secondary'}
              size="sm"
            >
              Scheduled
            </Button>
          </Link>
          <Link href="/admin/matches?status=live">
            <Button
              variant={statusFilter === 'live' ? 'primary' : 'secondary'}
              size="sm"
            >
              Live
            </Button>
          </Link>
          <Link href="/admin/matches?status=finished">
            <Button
              variant={statusFilter === 'finished' ? 'primary' : 'secondary'}
              size="sm"
            >
              Finished
            </Button>
          </Link>
        </div>

        {/* Matches List */}
        {allMatches.length === 0 ? (
          <div className="text-center py-12 text-foreground/60">
            No matches found
          </div>
        ) : (
          <div className="space-y-4">
            {allMatches.map((match) => (
              <Link key={match.id} href={`/admin/matches/${match.id}`}>
                <Card className="hover:bg-foreground/5 transition-colors cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      {/* Match Info */}
                      <div className="flex-1 min-w-[300px]">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="default" className="text-xs">
                            Match #{match.id}
                          </Badge>
                          <span className="text-sm text-foreground/60">
                            {match.stage.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="font-semibold">
                            {match.homeTeam?.name || 'TBD'}
                          </div>
                          {match.status === 'finished' &&
                          match.homeScore !== null ? (
                            <>
                              <div className="text-xl font-bold">
                                {match.homeScore}
                              </div>
                              <div className="text-foreground/40">-</div>
                              <div className="text-xl font-bold">
                                {match.awayScore}
                              </div>
                            </>
                          ) : (
                            <div className="text-foreground/40">vs</div>
                          )}
                          <div className="font-semibold">
                            {match.awayTeam?.name || 'TBD'}
                          </div>
                        </div>
                        <div className="text-sm text-foreground/60 mt-2">
                          {formatMatchDate(new Date(match.scheduledAt))}{' '}
                          •{' '}
                          {formatMatchTime(new Date(match.scheduledAt), match.venue.timezone)}
                        </div>
                      </div>

                      {/* Status and Actions */}
                      <div className="flex items-center gap-4">
                        {getStatusBadge(match.status as 'scheduled' | 'live' | 'finished')}
                        <Button variant="secondary" size="sm">
                          {match.status === 'finished'
                            ? 'View/Edit'
                            : 'Enter Result'}
                        </Button>
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
