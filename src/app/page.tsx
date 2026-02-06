import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { Badge } from '@/components/ui/badge';
import { formatMatchDate, formatMatchTime } from '@/lib/date-utils';

export default async function HomePage() {
  const { userId } = await auth();

  // Get all matches ordered by scheduled date
  const allMatches = await db.query.matches.findMany({
    orderBy: (matches, { asc }) => [asc(matches.scheduledAt)],
    with: {
      homeTeam: true,
      awayTeam: true,
      venue: true,
      stage: true,
    },
  });

  const getStatusBadge = (status: 'scheduled' | 'live' | 'finished') => {
    const variants = {
      scheduled: { variant: 'default' as const, label: 'Scheduled' },
      live: { variant: 'danger' as const, label: 'Live' },
      finished: { variant: 'success' as const, label: 'Finished' },
    };
    const { variant, label } = variants[status];
    return <Badge variant={variant} className="text-xs">{label}</Badge>;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            FIFA World Cup 2026
          </h1>
          <p className="text-lg text-foreground/60 mb-6">
            Predict match results, earn points, and compete with fans worldwide
          </p>
          <div className="flex gap-3 justify-center text-sm">
            <div className="bg-foreground/5 px-4 py-2 rounded-lg">
              <span className="font-semibold">3 points</span> for exact scores
            </div>
            <div className="bg-foreground/5 px-4 py-2 rounded-lg">
              <span className="font-semibold">1 point</span> for correct results
            </div>
          </div>
        </div>

        {/* All Matches List */}
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-bold">All Matches ({allMatches.length})</h2>
          </div>

          {/* Compact matches table */}
          <div className="space-y-1">
            {allMatches.map((match) => (
              <Link key={match.id} href={`/matches/${match.id}`}>
                <div className="hover:bg-foreground/5 transition-colors cursor-pointer border border-foreground/10 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    {/* Status Badge */}
                    <div className="w-20 flex-shrink-0">
                      {getStatusBadge(match.status as 'scheduled' | 'live' | 'finished')}
                    </div>

                    {/* Date */}
                    <div className="w-24 flex-shrink-0 text-xs text-foreground/60">
                      {formatMatchDate(new Date(match.scheduledAt))}
                    </div>

                    {/* Time */}
                    <div className="w-16 flex-shrink-0 text-xs font-medium">
                      {formatMatchTime(new Date(match.scheduledAt), match.venue.timezone)}
                    </div>

                    {/* Teams */}
                    <div className="flex-1 flex items-center justify-center gap-3">
                      <div className="text-right flex-1 text-sm font-medium truncate">
                        {match.homeTeam?.name || 'TBD'}
                      </div>
                      {match.status === 'finished' && match.homeScore !== null ? (
                        <div className="flex items-center gap-2 text-sm font-bold">
                          <span>{match.homeScore}</span>
                          <span className="text-foreground/40">-</span>
                          <span>{match.awayScore}</span>
                        </div>
                      ) : (
                        <div className="text-sm text-foreground/40">vs</div>
                      )}
                      <div className="text-left flex-1 text-sm font-medium truncate">
                        {match.awayTeam?.name || 'TBD'}
                      </div>
                    </div>

                    {/* Stage & Venue */}
                    <div className="w-48 flex-shrink-0 text-xs text-foreground/60 truncate">
                      {match.stage.name} • {match.venue.city}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
