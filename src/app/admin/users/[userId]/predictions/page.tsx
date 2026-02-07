import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getUserPredictions } from '@/db/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PredictionsTable } from '@/app/admin/matches/[id]/predictions/predictions-table';

interface UserPredictionsPageProps {
  params: Promise<{ userId: string }>;
}

export default async function UserPredictionsPage({
  params,
}: UserPredictionsPageProps) {
  const { userId } = await params;

  // Get user info
  const user = await db.query.users.findFirst({
    where: eq(users.userId, userId),
  });

  if (!user) {
    notFound();
  }

  // Get all user predictions
  const predictions = await getUserPredictions(userId);

  // Calculate user rank
  const allUsers = await db
    .select({ totalPoints: users.totalPoints })
    .from(users)
    .orderBy(desc(users.totalPoints));
  const rank = allUsers.findIndex((u) => u.totalPoints <= user.totalPoints) + 1;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/admin">
            <Button variant="ghost">← Back to Admin Dashboard</Button>
          </Link>
        </div>

        {/* User Info Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              Predictions for {user.displayName || user.username || 'User'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-foreground/60">Email</div>
                <div className="font-medium">{user.email}</div>
              </div>
              <div>
                <div className="text-sm text-foreground/60">Total Points</div>
                <div className="font-medium text-lg">{user.totalPoints}</div>
              </div>
              <div>
                <div className="text-sm text-foreground/60">Rank</div>
                <div className="font-medium text-lg">#{rank}</div>
              </div>
              <div>
                <div className="text-sm text-foreground/60">Predictions</div>
                <div className="font-medium text-lg">{predictions.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Predictions Table */}
        {predictions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-foreground/60">
              This user hasn't made any predictions yet.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Predictions ({predictions.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <PredictionsTable predictions={predictions} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
