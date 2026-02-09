import { getAllGroupsStandings } from "@/db/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function GroupsPage() {
  const allGroups = await getAllGroupsStandings();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Group Standings</h1>
          <p className="text-foreground/60">
            View the current standings for all 12 groups in the tournament
          </p>
        </div>

        {/* Info Card */}
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">How Standings Work</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-foreground/60">
            <div className="space-y-1">
              <div>• Win: 3 points</div>
              <div>• Draw: 1 point</div>
              <div>• Loss: 0 points</div>
              <div>
                • Tiebreakers: Points → Goal Difference → Goals Scored
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Groups Grid (3 columns max) */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {allGroups.map(({ groupLetter, standings }) => (
            <Card key={groupLetter}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Group {groupLetter}</CardTitle>
              </CardHeader>
              <CardContent>
                {standings.length === 0 ? (
                  <div className="text-center py-4 text-sm text-foreground/60">
                    No matches played yet
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8 p-2">#</TableHead>
                          <TableHead className="p-2">Team</TableHead>
                          <TableHead className="text-center w-8 p-2">
                            P
                          </TableHead>
                          <TableHead className="text-center w-8 p-2">
                            W
                          </TableHead>
                          <TableHead className="text-center w-8 p-2">
                            D
                          </TableHead>
                          <TableHead className="text-center w-8 p-2">
                            L
                          </TableHead>
                          <TableHead className="text-center w-10 p-2">
                            GD
                          </TableHead>
                          <TableHead className="text-center w-10 p-2 font-bold">
                            Pts
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {standings.map((entry, index) => (
                          <TableRow
                            key={entry.team.id}
                            className={index < 2 ? "bg-green-500/10" : ""}
                          >
                            <TableCell className="p-2 text-center font-medium">
                              {index + 1}
                            </TableCell>
                            <TableCell className="p-2">
                              <div className="flex items-center gap-2">
                                {entry.team.flagUrl && (
                                  <img
                                    src={entry.team.flagUrl}
                                    alt={entry.team.name}
                                    className="w-5 h-3 object-cover rounded-sm"
                                  />
                                )}
                                <span className="text-sm font-medium truncate">
                                  {entry.team.code}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="p-2 text-center text-sm">
                              {entry.played}
                            </TableCell>
                            <TableCell className="p-2 text-center text-sm">
                              {entry.won}
                            </TableCell>
                            <TableCell className="p-2 text-center text-sm">
                              {entry.drawn}
                            </TableCell>
                            <TableCell className="p-2 text-center text-sm">
                              {entry.lost}
                            </TableCell>
                            <TableCell className="p-2 text-center text-sm">
                              <span
                                className={
                                  entry.goalDifference > 0
                                    ? "text-green-600 dark:text-green-400"
                                    : entry.goalDifference < 0
                                      ? "text-red-600 dark:text-red-400"
                                      : ""
                                }
                              >
                                {entry.goalDifference > 0 ? "+" : ""}
                                {entry.goalDifference}
                              </span>
                            </TableCell>
                            <TableCell className="p-2 text-center text-sm font-bold">
                              {entry.points}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 text-sm text-foreground/60">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500/10 rounded"></div>
            <span>Top 2 qualify</span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span>P: Played</span>
            <span>W: Won</span>
            <span>D: Drawn</span>
            <span>L: Lost</span>
            <span>GD: Goal Difference</span>
            <span>Pts: Points</span>
          </div>
        </div>
      </div>
    </div>
  );
}
