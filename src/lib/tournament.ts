export const TOURNAMENT_START_DATE = new Date('2026-06-11T00:00:00Z');

export function isTournamentStarted(): boolean {
  return new Date() >= TOURNAMENT_START_DATE;
}
