import type { Page } from "playwright";

import { openMatchReport } from "../dfb/matchReport";
import type { UpcomingGame } from "../types/dfb";
import { askQuestion } from "./selection";

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
      ` ${idx + 1}. ${game.kickoff} | ${game.home_team} vs ${game.away_team} | ${game.status}`
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
        } catch (err) {
          console.log(
            `Could not open match report automatically (${err}). Please open manually:\n  ${displayUrl}`
          );
        }
        return;
      }
    }
    console.log("Invalid selection. Please enter a valid number.");
  }
}
