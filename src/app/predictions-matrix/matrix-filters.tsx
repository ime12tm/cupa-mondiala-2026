'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { TournamentStage } from '@/db/schema';

interface MatrixFiltersProps {
  stages: TournamentStage[];
  currentStage?: number;
  finishedOnly: boolean;
}

export function MatrixFilters({
  stages,
  currentStage,
  finishedOnly
}: MatrixFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilters = (updates: { stage?: string; finished?: string }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.stage !== undefined) {
      if (updates.stage === 'all') {
        params.delete('stage');
      } else {
        params.set('stage', updates.stage);
      }
    }

    if (updates.finished !== undefined) {
      if (updates.finished === 'false') {
        params.delete('finished');
      } else {
        params.set('finished', updates.finished);
      }
    }

    router.push(`/predictions-matrix?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push('/predictions-matrix');
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Stage Filter */}
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="stage-filter" className="text-sm font-medium mb-2 block">
              Filter by Stage
            </label>
            <select
              id="stage-filter"
              value={currentStage?.toString() || 'all'}
              onChange={(e) => updateFilters({ stage: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-foreground/20 bg-background text-foreground"
            >
              <option value="all">All Stages</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id.toString()}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>

          {/* Finished Only Toggle */}
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="finished-filter" className="text-sm font-medium mb-2 block">
              Show Only
            </label>
            <select
              id="finished-filter"
              value={finishedOnly ? 'finished' : 'all'}
              onChange={(e) =>
                updateFilters({ finished: e.target.value === 'finished' ? 'true' : 'false' })
              }
              className="w-full h-10 px-3 rounded-md border border-foreground/20 bg-background text-foreground"
            >
              <option value="all">All Matches</option>
              <option value="finished">Finished Only</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {(currentStage || finishedOnly) && (
            <Button
              variant="secondary"
              onClick={clearFilters}
              className="whitespace-nowrap"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
