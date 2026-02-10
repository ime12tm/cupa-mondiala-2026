import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@clerk/nextjs/server';
import { Badge } from '@/components/ui/badge';
import { formatMatchDate, formatMatchTime } from '@/lib/date-utils';
import heroImage from '@/img/hero-img.jpg';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getMatches } from '@/data/matches';
import { getUser } from '@/data/users';
import {
  getFirstGroupStageMatch,
  getUserGroupStagePredictionCount,
} from '@/db/queries';
import { GroupStageCountdown } from './matches/group-stage-countdown';

export default async function HomePage() {
  const { userId } = await auth();

  // Get all matches ordered by scheduled date
  const allMatches = await getMatches();

  // Filter for featured matches (Phase 2)
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const featuredMatches = allMatches.filter((match) => {
    const matchDate = new Date(match.scheduledAt);
    return (
      (match.status === 'scheduled' && matchDate <= sevenDaysFromNow) ||
      (match.status === 'live') ||
      (match.status === 'finished' && matchDate >= threeDaysAgo)
    );
  });

  // Show featured matches, or first 20 if no featured matches
  const displayMatches = featuredMatches.length > 0
    ? featuredMatches
    : allMatches.slice(0, 20);

  const getStatusBadge = (status: 'scheduled' | 'live' | 'finished') => {
    const variants = {
      scheduled: { variant: 'default' as const, label: 'Scheduled' },
      live: { variant: 'danger' as const, label: 'Live' },
      finished: { variant: 'success' as const, label: 'Finished' },
    };
    const { variant, label } = variants[status];
    return <Badge variant={variant} className="text-xs">{label}</Badge>;
  };

  // Widget logic for group stage deadline
  let widget = null;
  if (userId) {
    const user = await getUser(userId);

    if (user && !user.groupStageDeadlinePassed) {
      const firstMatch = await getFirstGroupStageMatch();
      const deadlinePassed = new Date() >= new Date(firstMatch.scheduledAt);

      if (!deadlinePassed) {
        const count = await getUserGroupStagePredictionCount(userId);
        const progressPercent = (count.completed / 72) * 100;

        widget = (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Group Stage Predictions</CardTitle>
              <CardDescription>
                Complete all 72 predictions before{' '}
                {formatMatchDate(firstMatch.scheduledAt)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress bar */}
                <div className="w-full bg-foreground/10 rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Stats */}
                <div className="flex justify-between text-sm">
                  <span>
                    {count.completed}/72 completed
                  </span>
                  <span>{72 - count.completed} remaining</span>
                </div>

                {/* Countdown */}
                <div className="text-sm text-foreground/60">
                  <GroupStageCountdown
                    deadline={firstMatch.scheduledAt.toString()}
                  />
                </div>

                {/* Action */}
                <Link href="/matches">
                  <Button className="w-full">
                    {count.completed === 0
                      ? 'Start Predictions'
                      : 'Continue Predictions'}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        );
      }
    }
  }

  return (
    <>
      {/* Hero Image - Full Width */}
      <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden">
        <Image
          src={heroImage}
          alt="FIFA World Cup 2026"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay text on image */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="text-center text-white px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              FIFA World Cup 2026
            </h1>
            <p className="text-lg md:text-xl opacity-90 mb-6">
              Predict match results, earn points, and compete with fans worldwide
            </p>
            <div className="flex flex-wrap gap-3 justify-center text-sm">
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <span className="font-semibold">3 points</span> for exact scores
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <span className="font-semibold">1 point</span> for correct results
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Group Stage Widget */}
          {widget}

          {/* All Matches List */}
          <div>
            <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xl font-bold">
                {featuredMatches.length > 0 ? 'Upcoming Matches' : 'Recent Matches'}
                {' '}({displayMatches.length})
              </h2>
              <Link href="/matches">
                <Button variant="secondary" size="sm">
                  View All {allMatches.length} Matches →
                </Button>
              </Link>
            </div>

            {/* Compact matches table */}
            <div className="space-y-1">
              {displayMatches.map((match) => (
                <Link key={match.id} href={`/matches/${match.id}`}>
                  <div className="hover:bg-foreground/5 transition-colors cursor-pointer border border-foreground/10 rounded-lg p-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                      {/* Status Badge - hidden on mobile, visible on desktop */}
                      <div className="hidden md:flex md:w-20 md:flex-shrink-0">
                        {getStatusBadge(match.status as 'scheduled' | 'live' | 'finished')}
                      </div>

                      {/* Date - always visible, simplified on mobile */}
                      <div className="text-xs text-foreground/60 md:w-24 md:flex-shrink-0">
                        {formatMatchDate(new Date(match.scheduledAt))}
                      </div>

                      {/* Time - hidden on mobile, visible on desktop */}
                      <div className="hidden md:block md:w-16 md:flex-shrink-0 text-xs font-medium">
                        {formatMatchTime(new Date(match.scheduledAt), match.venue.timezone)}
                      </div>

                      {/* Teams - always visible, full width on mobile */}
                      <div className="flex-1 flex items-center justify-center gap-3">
                        <div className="flex items-center justify-end gap-2 flex-1">
                          <div className="text-right text-sm font-medium truncate">
                            {match.homeTeam?.name || 'TBD'}
                          </div>
                          {match.homeTeam?.flagUrl && (
                            <div className="relative w-5 h-5 flex-shrink-0 rounded-full overflow-hidden border border-foreground/10">
                              <Image
                                src={match.homeTeam.flagUrl}
                                alt={`${match.homeTeam.name} flag`}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
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
                        <div className="flex items-center justify-start gap-2 flex-1">
                          {match.awayTeam?.flagUrl && (
                            <div className="relative w-5 h-5 flex-shrink-0 rounded-full overflow-hidden border border-foreground/10">
                              <Image
                                src={match.awayTeam.flagUrl}
                                alt={`${match.awayTeam.name} flag`}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className="text-left text-sm font-medium truncate">
                            {match.awayTeam?.name || 'TBD'}
                          </div>
                        </div>
                      </div>

                      {/* Stage & Venue - hidden on mobile, visible on desktop */}
                      <div className="hidden md:block md:w-48 md:flex-shrink-0 text-xs text-foreground/60 truncate">
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
    </>
  );
}
