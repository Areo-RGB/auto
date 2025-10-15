import { chromium } from "playwright";
import type { BrowserContext } from "playwright";

import { askQuestion } from "./cli";
import {
  extractUpcomingGames,
  filterGamesByTeam,
  logUpcomingGames,
  promptForMatchEdit,
  promptForTeamFilter,
} from "./games";
import { openMatchReport } from "./matchReports";
import { selectDateAndSearch } from "./search";
import { login, navigateToSpielsuche } from "./sessions";
import { ensureRefereeJson } from "./refereeData";
import type { RunOptions, RunResult } from "./types";

const DFBNET_USERNAME = "66.paul.ziske";
const DFBNET_PASSWORD = "-HpQ#@+pXcG%33?";

export async function run(options: RunOptions = {}): Promise<RunResult> {
  const {
    username = DFBNET_USERNAME,
    password = DFBNET_PASSWORD,
    headless = false,
    interactive = true,
    teamCategoryKey: initialTeamCategoryKey = null,
    competitionKeys: initialCompetitionKeys = [],
    teamFilterTeam = null,
    matchSelectionIndex = null,
  } = options;

  if (!username || !password) {
    throw new Error(
      "Username and password must be provided either as options or in the script configuration."
    );
  }

  const browser = await chromium.launch({
    headless,
    args: headless ? [] : ["--start-maximized"],
  });

  const context = headless
    ? await browser.newContext()
    : await browser.newContext({ viewport: null });

  const page = await context.newPage();
  if (!headless) {
    const session = await context.newCDPSession(page);
    const { windowId } = await session.send("Browser.getWindowForTarget");
    await session.send("Browser.setWindowBounds", {
      windowId,
      bounds: { windowState: "maximized" },
    });
  }

  await page.goto("https://portal.dfbnet.org/de/startseite.html");

  await login(page, username, password);
  await navigateToSpielsuche(page);
  const { teamCategoryKey, competitionKeys } = await selectDateAndSearch(page, {
    teamCategoryKey: initialTeamCategoryKey,
    competitionKeys: initialCompetitionKeys,
    interactive,
  });

  const upcomingGames = await extractUpcomingGames(page);
  if (interactive) {
    logUpcomingGames(upcomingGames);
  }

  let gamesForFollowUp: ReturnType<typeof filterGamesByTeam> = upcomingGames;
  if (!interactive && teamFilterTeam) {
    const filtered = filterGamesByTeam(upcomingGames, teamFilterTeam);
    gamesForFollowUp = filtered.length > 0 ? filtered : upcomingGames;
  } else if (interactive) {
    gamesForFollowUp = await promptForTeamFilter(upcomingGames);
  }

  if (interactive) {
    await promptForMatchEdit(page, gamesForFollowUp);
  } else if (
    matchSelectionIndex !== null &&
    matchSelectionIndex !== undefined
  ) {
    const selectedGame = gamesForFollowUp[matchSelectionIndex] ?? null;
    if (!selectedGame) {
      console.warn("No game found for the provided match selection index.");
    } else {
      try {
        await openMatchReport(context, selectedGame);
      } catch (error) {
        console.warn(`Could not open match report automatically (${error}).`);
      }
    }
  }

  return {
    browser,
    context,
    page,
    upcomingGames,
    selectedTeamCategory: teamCategoryKey,
    selectedCompetitionKeys: competitionKeys,
  };
}

export async function main(): Promise<void> {
  ensureRefereeJson();
  let context: BrowserContext | undefined;
  try {
    const result = await run({ headless: false });
    context = result.context;
    await askQuestion("Press Enter to close browser...");
  } catch (error) {
    console.error(error);
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
  }
}
