import { describe, expect, it } from "vitest";

import { filterGamesByTeam, type UpcomingGame } from "../src copy 4/automation";

const baseGame: UpcomingGame = {
  match_number: "1",
  kickoff: "2024-10-10",
  matchday: "5",
  home_team: "FC Hertha 03 Blau",
  away_team: "Gast Team",
  result: "",
  status: "geplant",
  report_link: "/match-report",
  report_link_text: "Bericht",
};

describe("filterGamesByTeam", () => {
  it("returns games where the team appears as home or away", () => {
    const games: UpcomingGame[] = [
      baseGame,
      { ...baseGame, match_number: "2", home_team: "Anderer Club", away_team: "FC Hertha 03 Blau" },
      { ...baseGame, match_number: "3", home_team: "Neutral Club", away_team: "Neutral Guest" },
    ];

    const filtered = filterGamesByTeam(games, "FC Hertha 03 Blau");
    expect(filtered.map((game) => game.match_number)).toEqual(["1", "2"]);
  });
});

