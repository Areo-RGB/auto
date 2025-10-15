import { chromium } from "playwright";
import { login } from "../dfb/auth";
import { navigateToSpielsuche, selectDateAndSearch } from "../dfb/navigation";
import { extractUpcomingGames, logUpcomingGames } from "../dfb/extract";
import { filterGamesByTeam } from "../dfb/filters";
import { openMatchReport } from "../dfb/report";
import { promptForMatchEdit, promptForTeamFilter } from "../cli/prompts";
import { TEAM_FILTER_PREFIX } from "../constants/catalogs";
import type { RunOptions, RunResult, UpcomingGame } from "../types/dfb";

export async function run(options: RunOptions = {}): Promise<RunResult> {
  const {
    username = process.env.DFBNET_USERNAME ?? "",
    password = process.env.DFBNET_PASSWORD ?? "",
    headless = false,
    interactive = true,
    teamCategoryKey: initialTeamCategoryKey = null,
    competitionKeys: initialCompetitionKeys = [],
    teamFilterTeam = null,
    matchSelectionIndex = null,
  } = options;

  if (!username || !password) {
    throw new Error(
      "Username and password must be provided either via options or DFBNET_USERNAME/DFBNET_PASSWORD env vars."
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

  let gamesForFollowUp: UpcomingGame[];
  if (!interactive && teamFilterTeam) {
    const filtered = filterGamesByTeam(upcomingGames, teamFilterTeam);
    gamesForFollowUp = filtered.length > 0 ? filtered : upcomingGames;
  } else if (interactive) {
    gamesForFollowUp = await promptForTeamFilter(
      upcomingGames,
      TEAM_FILTER_PREFIX
    );
  } else {
    gamesForFollowUp = upcomingGames;
  }

  if (interactive) {
    await promptForMatchEdit(async (index: number) => {
      const game = gamesForFollowUp[index]!;
      const displayUrl = game.report_link.startsWith("http")
        ? game.report_link
        : `https://www.dfbnet.org${game.report_link}`;
      try {
        await openMatchReport(page.context(), game);
      } catch (err) {
        console.log(
          `Could not open match report automatically (${err}). Please open manually:\n  ${displayUrl}`
        );
      }
    }, gamesForFollowUp);
  } else if (
    matchSelectionIndex !== null &&
    matchSelectionIndex !== undefined
  ) {
    const selectedGame = gamesForFollowUp[matchSelectionIndex] ?? null;
    if (selectedGame) {
      try {
        await openMatchReport(context, selectedGame);
      } catch {}
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

