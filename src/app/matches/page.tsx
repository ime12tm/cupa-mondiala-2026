import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import {
  getMatchesWithUserPredictions,
  getFirstGroupStageMatch,
  getUserGroupStagePredictionCount,
} from '@/db/queries';
import { StageFilterClient } from './stage-filter-client';
import { MatchCardWithPrediction } from './match-card-with-prediction';
import { GroupStageCountdown } from './group-stage-countdown';
import { formatMatchDate, formatMatchTime } from '@/lib/date-utils';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface MatchesPageProps {
  searchParams: Promise<{ stage?: string }>;
}

export default async function MatchesPage({ searchParams }: MatchesPageProps) {
  const { userId } = await auth();
  const params = await searchParams;

  // Convert null to undefined for type compatibility
  const stage = (params.stage || undefined) as string | undefined;

  const matches = await getMatchesWithUserPredictions(userId, stage);

  // Banner logic (only for logged-in users)
  let banner = null;
  if (userId) {
    const user = await db.query.users.findFirst({
      where: eq(users.userId, userId),
    });

    if (user && !user.groupStageDeadlinePassed) {
      const firstMatch = await getFirstGroupStageMatch();
      const deadlinePassed = new Date() >= new Date(firstMatch.scheduledAt);
      const count = await getUserGroupStagePredictionCount(userId);

      if (deadlinePassed && count.completed < 72) {
        // Locked banner
        banner = (
          <Alert variant="danger" className="mb-6">
            <AlertTitle>Group Stage Predictions Locked</AlertTitle>
            <AlertDescription>
              You completed {count.completed}/72 group stage predictions before
              the deadline. You can still predict knockout matches.
            </AlertDescription>
          </Alert>
        );
      } else if (!deadlinePassed) {
        // Progress banner
        banner = (
          <Alert
            variant={count.completed === 72 ? 'success' : 'default'}
            className="mb-6"
          >
            <AlertTitle>
              {count.completed === 72
                ? '✓ All Group Stage Predictions Complete!'
                : 'Complete Your Group Stage Predictions'}
            </AlertTitle>
            <AlertDescription>
              <div>
                Progress: {count.completed}/72 predictions
              </div>
              <div className="mt-2">
                Deadline: {formatMatchDate(firstMatch.scheduledAt)} at{' '}
                {formatMatchTime(
                  firstMatch.scheduledAt,
                  firstMatch.venue.timezone
                )}
              </div>
              <div className="mt-1">
                <GroupStageCountdown
                  deadline={firstMatch.scheduledAt.toString()}
                />
              </div>
            </AlertDescription>
          </Alert>
        );
      }
    }
  }

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

        {/* Group Stage Banner */}
        {banner}

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
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="block transition-transform hover:scale-[1.02]"
              >
                <MatchCardWithPrediction
                  match={match}
                  userId={userId}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
