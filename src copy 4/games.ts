import type { Page } from "playwright";

import { askQuestion } from "./cli";
import { TEAM_FILTER_PREFIX } from "./refereeData";
import { openMatchReport } from "./matchReports";
import type { UpcomingGame } from "./types";

export async function extractUpcomingGames(page: Page): Promise<UpcomingGame[]> {
  const table = page.locator("#dfb-Content-view table");
  if ((await table.count()) === 0) {
    return [];
  }

  const rows = table.locator("tr");
  const rowCount = await rows.count();
  const upcoming: UpcomingGame[] = [];

  for (let i = 0; i < rowCount; i += 1) {
    const row = rows.nth(i);
    const cellTexts = await row.locator("th, td").allInnerTexts();
    const normalized = cellTexts.map((text) => text.replace(/\s+/g, " ").trim());
    if (normalized.length < 10) continue;
    if (normalized[2] === "Spiel") continue;

    const statusText = normalized[normalized.length - 1] || "";
    if (
      statusText &&
      !["geplant", "planung"].some((key) => statusText.toLowerCase().includes(key))
    ) {
      continue;
    }

    const linkLocator = row.locator('a[href*="match-report"]').first();
    let linkHref = "";
    let linkText = "";
    try {
      if ((await linkLocator.count()) > 0) {
        linkHref = (await linkLocator.getAttribute("href")) || "";
        linkText = (await linkLocator.innerText()).trim();
      }
    } catch {
      // ignore link extraction issues
    }

    upcoming.push({
      match_number: normalized[2] ?? "",
      kickoff: normalized[3] ?? "",
      matchday: normalized[4] ?? "",
      home_team: normalized[5] ?? "",
      away_team: normalized[7] ?? "",
      result: normalized[8] ?? "",
      status: statusText,
      report_link: linkHref,
      report_link_text: linkText,
    });
  }

  return upcoming;
}

export function logUpcomingGames(
  games: UpcomingGame[],
  title = "Upcoming games"
): void {
  if (!games.length) {
    console.log("No upcoming games found.");
    return;
  }

  console.log(`${title}:`);
  for (const game of games) {
    const parts = [] as string[];
    if (game.match_number) parts.push(`Match #${game.match_number}`);
    if (game.kickoff) parts.push(game.kickoff);
    if (game.matchday) parts.push(`ST ${game.matchday}`);
    parts.push(`${game.home_team} vs ${game.away_team}`);
    if (game.result) parts.push(`Result ${game.result}`);
    if (game.status) parts.push(game.status);
    console.log(` - ${parts.join(" | ")}`);
    if (game.report_link) {
      const linkText = game.report_link_text
        ? ` (${game.report_link_text})`
        : "";
      console.log(`   Report: ${game.report_link}${linkText}`);
    }
  }
}

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
    if (game.home_team.startsWith(TEAM_FILTER_PREFIX)) teams.add(game.home_team);
    if (game.away_team.startsWith(TEAM_FILTER_PREFIX)) teams.add(game.away_team);
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

export async function promptForMatchEdit(
  page: Page,
  games: UpcomingGame[]
): Promise<void> {
  if (!games.length) {
    console.log("No games available for edit selection.");
    return;
  }

  console.log("\nSelect a match to edit:");
  games.forEach((game, idx) => {
    console.log(
      ` ${idx + 1}. ${game.kickoff} | ${game.home_team} vs ${
        game.away_team
      } | ${game.status}`
    );
  });
  console.log(" 0. Skip selection");

  while (true) {
    const selection = (
      await askQuestion("Enter the number of the match to edit (0 to skip): ")
    ).trim();

    if (/^\d+$/.test(selection)) {
      const choice = Number(selection);
      if (choice === 0) {
        console.log("Skipping match edit selection.");
        return;
      }
      if (choice >= 1 && choice <= games.length) {
        const game = games[choice - 1]!;
        const displayUrl = game.report_link.startsWith("http")
          ? game.report_link
          : `https://www.dfbnet.org${game.report_link}`;
        console.log(`Opening edit link for selected match:\n  ${displayUrl}`);
        try {
          await openMatchReport(page.context(), game);
        } catch (error) {
          console.log(
            `Could not open match report automatically (${error}). Please open manually:\n  ${displayUrl}`
          );
        }
        return;
      }
    }

    console.log("Invalid selection. Please enter a valid number.");
  }
}

