import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Get ordinal suffix for a day (1st, 2nd, 3rd, 4th, etc.)
 */
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/**
 * Format match date with ordinal suffix
 * @param date - Date to format
 * @returns Formatted string like "1st Sep 2025", "2nd Aug 2025", "3rd Jan 2026"
 *
 * @example
 * formatMatchDate(new Date('2025-09-01')) // "1st Sep 2025"
 * formatMatchDate(new Date('2025-08-02')) // "2nd Aug 2025"
 * formatMatchDate(new Date('2026-01-03')) // "3rd Jan 2026"
 */
export function formatMatchDate(date: Date): string {
  const day = format(date, 'd');
  const month = format(date, 'MMM');
  const year = format(date, 'yyyy');
  const suffix = getOrdinalSuffix(parseInt(day));

  return `${day}${suffix} ${month} ${year}`;
}

/**
 * Format match time with timezone
 * @param date - Date to format
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns Formatted string like "7:00 PM EDT", "3:30 PM PST"
 *
 * @example
 * formatMatchTime(new Date('2025-09-01T19:00:00'), 'America/New_York') // "7:00 PM EDT"
 * formatMatchTime(new Date('2025-09-01T15:30:00'), 'America/Los_Angeles') // "3:30 PM PDT"
 */
export function formatMatchTime(date: Date, timezone: string): string {
  // Format time in the specified timezone
  const time = formatInTimeZone(date, timezone, 'h:mm a');
  const tz = formatInTimeZone(date, timezone, 'zzz');

  return `${time} ${tz}`;
}

/**
 * Format full date with day name and ordinal suffix
 * @param date - Date to format
 * @returns Formatted string like "Monday, 1st September 2025"
 *
 * @example
 * formatFullDate(new Date('2025-09-01')) // "Monday, 1st September 2025"
 * formatFullDate(new Date('2025-12-25')) // "Thursday, 25th December 2025"
 */
export function formatFullDate(date: Date): string {
  const dayName = format(date, 'EEEE');
  const day = format(date, 'd');
  const month = format(date, 'MMMM');
  const year = format(date, 'yyyy');
  const suffix = getOrdinalSuffix(parseInt(day));

  return `${dayName}, ${day}${suffix} ${month} ${year}`;
}

/**
 * Format short date for compact displays
 * @param date - Date to format
 * @returns Formatted string like "1 Sep", "25 Dec"
 *
 * @example
 * formatShortDate(new Date('2025-09-01')) // "1 Sep"
 * formatShortDate(new Date('2025-12-25')) // "25 Dec"
 */
export function formatShortDate(date: Date): string {
  return format(date, 'd MMM');
}

/**
 * Format time without timezone
 * @param date - Date to format
 * @returns Formatted string like "7:00 PM", "3:30 PM"
 *
 * @example
 * formatTime(new Date('2025-09-01T19:00:00')) // "7:00 PM"
 * formatTime(new Date('2025-09-01T15:30:00')) // "3:30 PM"
 */
export function formatTime(date: Date): string {
  return format(date, 'h:mm a');
}
