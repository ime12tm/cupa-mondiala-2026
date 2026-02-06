import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { getMatchesWithUserPredictions } from '@/db/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatMatchDate, formatMatchTime } from '@/lib/date-utils';
import { StageFilterClient } from './stage-filter-client';

interface MatchesPageProps {
  searchParams: Promise<{ stage?: string }>;
}

export default async function MatchesPage({ searchParams }: MatchesPageProps) {
  const { userId } = await auth();
  const params = await searchParams;

  // Convert null to undefined for type compatibility
  const stage = (params.stage || undefined) as string | undefined;

  const matches = await getMatchesWithUserPredictions(userId, stage);

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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Matches</h1>
          <p className="text-foreground/60">
            View all matches and make your predictions
          </p>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <StageFilterClient currentStage={stage} />
        </div>

        {/* Match Grid */}
        {matches.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-foreground/60">No matches found</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {matches.map((match) => (
              <Link key={match.id} href={`/matches/${match.id}`}>
                <Card className="hover:bg-foreground/5 transition-colors cursor-pointer h-full">
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
                      {/* Home Team */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
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

                      {/* Away Team */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
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
                    <div className="border-t border-foreground/10 pt-3 space-y-1">
                      <div className="text-sm text-foreground/60">
                        {match.venue.name}, {match.venue.city}
                      </div>
                      <div className="text-sm font-medium">
                        {formatMatchDate(new Date(match.scheduledAt))}
                        {' • '}
                        {formatMatchTime(new Date(match.scheduledAt), match.venue.timezone)}
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
