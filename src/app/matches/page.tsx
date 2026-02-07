import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { getMatchesWithUserPredictions } from '@/db/queries';
import { StageFilterClient } from './stage-filter-client';
import { MatchCardWithPrediction } from './match-card-with-prediction';

interface MatchesPageProps {
  searchParams: Promise<{ stage?: string }>;
}

export default async function MatchesPage({ searchParams }: MatchesPageProps) {
  const { userId } = await auth();
  const params = await searchParams;

  // Convert null to undefined for type compatibility
  const stage = (params.stage || undefined) as string | undefined;

  const matches = await getMatchesWithUserPredictions(userId, stage);

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
