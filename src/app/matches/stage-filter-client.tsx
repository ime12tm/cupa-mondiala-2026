'use client';

import { useRouter } from 'next/navigation';

const stages = [
  { value: '', label: 'All Stages' },
  { value: 'group_stage', label: 'Group Stage' },
  { value: 'round_of_16', label: 'Round of 16' },
  { value: 'quarter_finals', label: 'Quarter Finals' },
  { value: 'semi_finals', label: 'Semi Finals' },
  { value: 'third_place', label: 'Third Place' },
  { value: 'final', label: 'Final' },
];

interface StageFilterClientProps {
  currentStage?: string;
}

export function StageFilterClient({ currentStage = '' }: StageFilterClientProps) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const params = new URLSearchParams();

    if (value) {
      params.set('stage', value);
    }

    const query = params.toString();
    router.push(`/matches${query ? `?${query}` : ''}`);
  };

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="stage-filter" className="text-sm font-medium">
        Filter by Stage:
      </label>
      <select
        id="stage-filter"
        value={currentStage}
        onChange={handleChange}
        className="w-48 h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {stages.map((stage) => (
          <option key={stage.value} value={stage.value}>
            {stage.label}
          </option>
        ))}
      </select>
    </div>
  );
}
