import type { BrowserContext } from "playwright";

import { askQuestion } from "./prompts/selection";
import {
  ensureRefereeJson,
  findRefereesForDetails,
  loadRefereeGroups,
} from "./referees/store";
import { run as runAutomation } from "./run";

export type {
  CompetitionKey,
  ContextKey,
  MatchContext,
  RefereeEntry,
  RefereeGroup,
  RefereeName,
  RefereeRecord,
  RunOptions,
  RunResult,
  TeamCategoryKey,
  UpcomingGame,
} from "./types/dfb";

export { COMPETITION_TYPES, TEAM_CATEGORIES } from "./constants/catalogs";
export { ensureRefereeJson, findRefereesForDetails, loadRefereeGroups };
export { loadRefereeGroups as loadRefereeRecords } from "./referees/store";
export { filterGamesByTeam } from "./filters/gameFilters";
export { openMatchReport } from "./dfb/matchReport";
export { runAutomation as run };

async function main(): Promise<void> {
  ensureRefereeJson();
  let context: BrowserContext | undefined;
  try {
    const result = await runAutomation({ headless: false });
    context = result.context;
    await askQuestion("Press Enter to close browser...");
  } catch (err) {
    console.error(err);
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
