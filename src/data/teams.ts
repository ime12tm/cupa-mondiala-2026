/**
 * Teams and Group Standings Data Layer
 *
 * SECURITY: Functions in this file return PUBLIC data (teams, standings).
 * No userId filtering needed since team data is visible to all users.
 *
 * See docs/data-fetching.md for data fetching patterns.
 */

import { db } from '@/db';
import { teams, matches, tournamentStages } from '@/db/schema';
import { eq, and, sql, asc } from 'drizzle-orm';

/**
 * Get all teams in a specific group
 * PUBLIC DATA - No authentication required
 *
 * @param groupLetter - Group letter (A-L)
 * @returns Teams in the group, ordered by name
 */
export async function getTeamsByGroup(groupLetter: string) {
  return db.query.teams.findMany({
    where: eq(teams.groupLetter, groupLetter),
    orderBy: [asc(teams.name)],
  });
}

/**
 * Calculate standings for a specific group
 * PUBLIC DATA - Returns teams sorted by Points DESC, Goal Difference DESC, Goals For DESC
 *
 * @param groupLetter - Group letter (A-L)
 * @returns Group standings with stats (played, won, drawn, lost, goals, points)
 */
export async function getGroupStandings(groupLetter: string) {
  // Get all teams in the group
  const groupTeams = await getTeamsByGroup(groupLetter);

  // Get all finished matches for this group
  const groupStage = await db.query.tournamentStages.findFirst({
    where: eq(tournamentStages.slug, 'group_stage'),
  });

  if (!groupStage) {
    return [];
  }

  const teamIds = groupTeams.map((t) => t.id);

  const groupMatches = await db.query.matches.findMany({
    where: and(
      eq(matches.stageId, groupStage.id),
      eq(matches.status, 'finished'),
      sql`(${matches.homeTeamId} IN (${sql.join(teamIds, sql`, `)}) OR ${matches.awayTeamId} IN (${sql.join(teamIds, sql`, `)}))`
    ),
    with: {
      homeTeam: true,
      awayTeam: true,
    },
  });

  // Calculate stats for each team
  const standings = groupTeams.map((team) => {
    let played = 0;
    let won = 0;
    let drawn = 0;
    let lost = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    groupMatches.forEach((match) => {
      // Only process if both scores are set
      if (match.homeScore === null || match.awayScore === null) return;

      const isHome = match.homeTeamId === team.id;
      const isAway = match.awayTeamId === team.id;

      if (!isHome && !isAway) return; // Team not in this match

      played++;

      if (isHome) {
        goalsFor += match.homeScore;
        goalsAgainst += match.awayScore;

        if (match.homeScore > match.awayScore) {
          won++;
        } else if (match.homeScore === match.awayScore) {
          drawn++;
        } else {
          lost++;
        }
      } else {
        goalsFor += match.awayScore;
        goalsAgainst += match.homeScore;

        if (match.awayScore > match.homeScore) {
          won++;
        } else if (match.awayScore === match.homeScore) {
          drawn++;
        } else {
          lost++;
        }
      }
    });

    const goalDifference = goalsFor - goalsAgainst;
    const points = won * 3 + drawn * 1;

    return {
      team,
      played,
      won,
      drawn,
      lost,
      goalsFor,
      goalsAgainst,
      goalDifference,
      points,
    };
  });

  // Sort by: Points DESC, Goal Difference DESC, Goals For DESC
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference)
      return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  return standings;
}

/**
 * Get standings for all 12 groups (A-L)
 * PUBLIC DATA - Returns all group standings
 *
 * @returns Array of { groupLetter, standings } for all 12 groups
 */
export async function getAllGroupsStandings() {
  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  const allStandings = await Promise.all(
    groups.map(async (groupLetter) => ({
      groupLetter,
      standings: await getGroupStandings(groupLetter),
    }))
  );

  return allStandings;
}
