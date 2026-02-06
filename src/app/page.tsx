import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { matches } from '@/db/schema';
import { and, eq, gt } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMatchDate, formatMatchTime } from '@/lib/date-utils';

export default async function HomePage() {
  const { userId } = await auth();

  // Get next 5 upcoming matches
  const upcomingMatches = await db.query.matches.findMany({
    where: eq(matches.status, 'scheduled'),
    orderBy: (matches, { asc }) => [asc(matches.scheduledAt)],
    limit: 5,
    with: {
      homeTeam: true,
      awayTeam: true,
      venue: true,
      stage: true,
    },
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            FIFA World Cup 2026
          </h1>
          <p className="text-xl text-foreground/60 mb-8">
            Predict match results, earn points, and compete with fans worldwide
          </p>
          {!userId && (
            <div className="flex gap-4 justify-center">
              <Link href="/matches">
                <Button size="lg">View Matches</Button>
              </Link>
              <Link href="/leaderboard">
                <Button size="lg" variant="secondary">
                  Leaderboard
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* How It Works */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Make Predictions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-foreground/60">
              Predict the score for every match before kickoff
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. Earn Points</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-foreground/60">
              Get 3 points for exact scores, 1 point for correct results
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. Climb the Ranks</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-foreground/60">
              Compete on the leaderboard and prove your football knowledge
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Matches */}
        {upcomingMatches.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Upcoming Matches</h2>
              <Link href="/matches">
                <Button variant="ghost">View All</Button>
              </Link>
            </div>
            <div className="space-y-4">
              {upcomingMatches.map((match) => (
                <Link key={match.id} href={`/matches/${match.id}`}>
                  <Card className="hover:bg-foreground/5 transition-colors cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-sm text-foreground/60 mb-2">
                            {match.stage.name} • {match.venue.city}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right flex-1">
                              <div className="font-semibold">
                                {match.homeTeam?.name || 'TBD'}
                              </div>
                            </div>
                            <div className="text-2xl font-bold text-foreground/40">
                              vs
                            </div>
                            <div className="text-left flex-1">
                              <div className="font-semibold">
                                {match.awayTeam?.name || 'TBD'}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-foreground/60">
                            {formatMatchDate(new Date(match.scheduledAt))}
                          </div>
                          <div className="text-sm font-medium">
                            {formatMatchTime(new Date(match.scheduledAt), match.venue.timezone)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA for logged in users */}
        {userId && upcomingMatches.length > 0 && (
          <div className="mt-8 text-center">
            <Link href="/matches">
              <Button size="lg">Make Your Predictions</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
