'use client';

import { useEffect, useState } from 'react';
import {
  differenceInSeconds,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
} from 'date-fns';

function calculateTimeRemaining(deadline: string): string {
  const now = new Date();
  const target = new Date(deadline);
  const seconds = differenceInSeconds(target, now);

  if (seconds <= 0) {
    return 'Deadline passed';
  }

  // Calculate total differences
  const totalDays = differenceInDays(target, now);
  const totalHours = differenceInHours(target, now);
  const totalMinutes = differenceInMinutes(target, now);

  // Calculate remaining hours and minutes after days
  const remainingHours = totalHours - totalDays * 24;
  const remainingMinutes = totalMinutes - totalHours * 60;

  const parts = [];

  if (totalDays > 0) parts.push(`${totalDays}d`);
  if (remainingHours > 0) parts.push(`${remainingHours}h`);
  if (remainingMinutes > 0) parts.push(`${remainingMinutes}m`);

  return parts.join(' ') + ' remaining';
}

export function GroupStageCountdown({ deadline }: { deadline: string }) {
  const [timeRemaining, setTimeRemaining] = useState(() =>
    calculateTimeRemaining(deadline)
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateCountdown = () => {
      setTimeRemaining(calculateTimeRemaining(deadline));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [deadline]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <span className="font-mono text-sm">{timeRemaining}</span>;
  }

  return <span className="font-mono text-sm">{timeRemaining}</span>;
}
