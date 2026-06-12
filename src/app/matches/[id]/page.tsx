import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getMatch, hasGroupStageDeadlinePassed } from '@/data/matches';
import { getUserPrediction } from '@/data/predictions';
import { MatchDetailClient } from './match-detail-client';

interface MatchDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchDetailPage({ params }: MatchDetailPageProps) {
  const { userId } = await auth();
  const { id } = await params;
  const matchId = parseInt(id);

  if (isNaN(matchId)) {
    notFound();
  }

  const match = await getMatch(matchId);

  if (!match) {
    notFound();
  }

  // Get user's prediction if authenticated
  const userPrediction = userId
    ? await getUserPrediction(userId, matchId)
    : null;

  const groupStageLocked = await hasGroupStageDeadlinePassed();

  return <MatchDetailClient match={{ ...match, userPrediction }} userId={userId} groupStageLocked={groupStageLocked} />;
}
