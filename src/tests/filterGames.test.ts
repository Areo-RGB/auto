import { describe, expect, it } from "vitest";

import { filterGamesByTeam } from "../filters/gameFilters";
import type { UpcomingGame } from "../types/dfb";

describe("filterGamesByTeam (copy3)", () => {
  const games: UpcomingGame[] = [
    {
      match_number: "1",
      kickoff: "2025-01-01",
      matchday: "1",
      home_team: "FC Hertha 03 Alpha",
      away_team: "Opponent",
      result: "",
      status: "geplant",
      report_link: "",
      report_link_text: "",
    },
    {
      match_number: "2",
      kickoff: "2025-01-02",
      matchday: "2",
      home_team: "Other Club",
      away_team: "FC Hertha 03 Alpha",
      result: "",
      status: "geplant",
      report_link: "",
      report_link_text: "",
    },
    {
      match_number: "3",
      kickoff: "2025-01-03",
      matchday: "3",
      home_team: "Unrelated",
      away_team: "Opponent",
      result: "",
      status: "abgesagt",
      report_link: "",
      report_link_text: "",
    },
  ];

  it("returns games where the specified team appears as home or away", () => {
    const filtered = filterGamesByTeam(games, "FC Hertha 03 Alpha");
    expect(filtered.map((game) => game.match_number)).toEqual(["1", "2"]);
  });

  it("returns an empty array when the team is not present", () => {
    expect(filterGamesByTeam(games, "Missing")).toEqual([]);
  });
});
