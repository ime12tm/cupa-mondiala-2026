import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getMatchById } from '@/db/queries';
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

  const match = await getMatchById(matchId, userId || undefined);

  if (!match) {
    notFound();
  }

  return <MatchDetailClient match={match} userId={userId} />;
}
