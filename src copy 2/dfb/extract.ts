import type { Page } from "playwright";
import type { UpcomingGame } from "../types/dfb";

export async function extractUpcomingGames(
  page: Page
): Promise<UpcomingGame[]> {
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
    const normalized = cellTexts.map((txt) => txt.replace(/\s+/g, " ").trim());
    if (normalized.length < 10) continue;
    if (normalized[2] === "Spiel") continue;

    const statusText = normalized[normalized.length - 1] || "";
    if (
      statusText &&
      !["geplant", "planung"].some((key) =>
        statusText.toLowerCase().includes(key)
      )
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
      // ignore
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

