'use client';

import { useEffect, useState } from 'react';
import {
  differenceInSeconds,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
} from 'date-fns';

export function GroupStageCountdown({ deadline }: { deadline: string }) {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const target = new Date(deadline);
      const seconds = differenceInSeconds(target, now);

      if (seconds <= 0) {
        setTimeRemaining('Deadline passed');
        return;
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

      setTimeRemaining(parts.join(' ') + ' remaining');
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [deadline]);

  return <span className="font-mono text-sm">{timeRemaining}</span>;
}
