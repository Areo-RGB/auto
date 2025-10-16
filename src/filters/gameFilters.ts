import { TEAM_FILTER_PREFIX } from "../constants/catalogs";
import type { UpcomingGame } from "../types/dfb";
import { logUpcomingGames } from "../dfb/search";
import { askQuestion } from "../prompts/selection";

export function filterGamesByTeam(
  games: UpcomingGame[],
  team: string
): UpcomingGame[] {
  return games.filter(
    (game) => game.home_team === team || game.away_team === team
  );
}

export async function promptForTeamFilter(
  games: UpcomingGame[]
): Promise<UpcomingGame[]> {
  const teams = new Set<string>();
  for (const game of games) {
    if (game.home_team.startsWith(TEAM_FILTER_PREFIX)) {
      teams.add(game.home_team);
    }
    if (game.away_team.startsWith(TEAM_FILTER_PREFIX)) {
      teams.add(game.away_team);
    }
  }
  if (teams.size === 0) {
    console.log(
      `No teams starting with '${TEAM_FILTER_PREFIX}' found in the results.`
    );
    return games;
  }

  const sorted = Array.from(teams).sort();
  console.log(`\nTeams starting with '${TEAM_FILTER_PREFIX}':`);
  sorted.forEach((team, idx) => console.log(` ${idx + 1}. ${team}`));

  const answer = (
    await askQuestion(
      "Enter the number of the team to filter (press Enter to skip): "
    )
  ).trim();
  if (!answer) {
    console.log("Skipping team filter.");
    return games;
  }
  if (/^\d+$/.test(answer)) {
    const choice = Number(answer);
    if (choice >= 1 && choice <= sorted.length) {
      const team = sorted[choice - 1]!;
      const filtered = filterGamesByTeam(games, team);
      if (filtered.length) {
        console.log();
        logUpcomingGames(filtered, `Upcoming games for ${team}`);
        return filtered;
      }
      console.log(`No games found for ${team}.`);
    }
  }
  console.log("Invalid selection. Returning unfiltered games.");
  return games;
}
