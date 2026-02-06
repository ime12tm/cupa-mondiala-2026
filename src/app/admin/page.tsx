import Link from 'next/link';
import { db } from '@/db';
import { matches } from '@/db/schema';
import { eq, count, sql } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatMatchDate } from '@/lib/date-utils';

export default async function AdminDashboardPage() {
  // Get match statistics
  const [matchStats] = await db
    .select({
      total: count(),
      scheduled: sql<number>`count(*) filter (where status = 'scheduled')`,
      live: sql<number>`count(*) filter (where status = 'live')`,
      finished: sql<number>`count(*) filter (where status = 'finished')`,
    })
    .from(matches);

  // Get recent matches that need results
  const recentMatches = await db.query.matches.findMany({
    where: eq(matches.status, 'scheduled'),
    orderBy: (matches, { asc }) => [asc(matches.scheduledAt)],
    limit: 5,
    with: {
      homeTeam: true,
      awayTeam: true,
      stage: true,
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-foreground/60">
            Manage matches, results, and predictions
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-foreground/60">
                Total Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{matchStats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-foreground/60">
                Scheduled
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{matchStats.scheduled}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-foreground/60">
                Live
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {matchStats.live}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-foreground/60">
                Finished
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {matchStats.finished}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/matches" className="block">
                <Button variant="secondary" className="w-full justify-start">
                  View All Matches
                </Button>
              </Link>
              <Link href="/admin/matches?status=scheduled" className="block">
                <Button variant="secondary" className="w-full justify-start">
                  Matches Needing Results
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Scheduled Matches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentMatches.length === 0 ? (
                <p className="text-sm text-foreground/60">
                  No scheduled matches
                </p>
              ) : (
                recentMatches.slice(0, 3).map((match) => (
                  <Link
                    key={match.id}
                    href={`/admin/matches/${match.id}`}
                    className="block"
                  >
                    <div className="text-sm hover:bg-foreground/5 p-2 rounded transition-colors">
                      <div className="font-medium">
                        {match.homeTeam?.name || 'TBD'} vs{' '}
                        {match.awayTeam?.name || 'TBD'}
                      </div>
                      <div className="text-foreground/60 text-xs">
                        {formatMatchDate(new Date(match.scheduledAt))}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-foreground/60">
            <p>
              <strong>Entering Match Results:</strong> Navigate to a match and
              enter the final score. This will automatically lock all
              predictions and calculate points for users.
            </p>
            <p>
              <strong>Editing Predictions:</strong> You can view and edit any
              user's predictions from the match detail page. Use this for error
              corrections only.
            </p>
            <p>
              <strong>Points Calculation:</strong> Points are automatically
              recalculated when you update a match result or edit a prediction.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
