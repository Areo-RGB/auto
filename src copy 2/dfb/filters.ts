import type { UpcomingGame } from "../types/dfb";

export function filterGamesByTeam(
  games: UpcomingGame[],
  team: string
): UpcomingGame[] {
  return games.filter(
    (game) => game.home_team === team || game.away_team === team
  );
}

