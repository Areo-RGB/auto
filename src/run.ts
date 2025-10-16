import { chromium } from "playwright";

import { DFBNET_PASSWORD, DFBNET_USERNAME } from "./constants/credentials";
import { login } from "./dfb/auth";
import { navigateToSpielsuche } from "./dfb/navigation";
import {
  extractUpcomingGames,
  logUpcomingGames,
  selectDateAndSearch,
} from "./dfb/search";
import { openMatchReport } from "./dfb/matchReport";
import {
  filterGamesByTeam,
  promptForTeamFilter,
} from "./filters/gameFilters";
import { promptForMatchEdit } from "./prompts/matchSelection";
import type { RunOptions, RunResult, UpcomingGame } from "./types/dfb";

export async function run(options: RunOptions = {}): Promise<RunResult> {
  const {
    username = DFBNET_USERNAME,
    password = DFBNET_PASSWORD,
  headless = false,
  interactive = true,
  teamCategoryKey: initialTeamCategoryKey = null,
  competitionKeys: initialCompetitionKeys = [],
  date,
  teamFilterTeam = null,
  matchSelectionIndex = null,
} = options;

  const resolvedDate = (() => {
    if (!date) {
      return undefined;
    }
    const candidate = date instanceof Date ? date : new Date(date);
    return Number.isNaN(candidate.getTime()) ? undefined : candidate;
  })();

  if (!username || !password) {
    console.error("run() invoked without credentials", {
      username,
      passwordPresent: Boolean(password),
    });
  }

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
    date: resolvedDate,
  });

  const upcomingGames = await extractUpcomingGames(page);
  if (interactive) {
    logUpcomingGames(upcomingGames);
  }

  let gamesForFollowUp: UpcomingGame[];
  if (!interactive && teamFilterTeam) {
    const filtered = filterGamesByTeam(upcomingGames, teamFilterTeam);
    gamesForFollowUp = filtered.length > 0 ? filtered : upcomingGames;
  } else if (interactive) {
    gamesForFollowUp = await promptForTeamFilter(upcomingGames);
  } else {
    gamesForFollowUp = upcomingGames;
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
      } catch (err) {
        console.warn(`Could not open match report automatically (${err}).`);
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
