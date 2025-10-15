export {
  ensureRefereeJson,
  convertRefereeCsvToJson,
  loadRefereeGroups,
  findRefereesForDetails,
  DEFAULT_REFEREE_GROUPS,
  TARGET_MATCH_CONTEXT,
  TEAM_FILTER_PREFIX,
  CONTEXT_KEYS,
  EXPECTED_DETAIL_TEXT,
  contextToDetailText,
  parseCsvLine,
  type ContextKey,
  type MatchContext,
  type RefereeGroup,
  type RefereeEntry,
  type RefereeRecord,
  type RefereeName,
} from "./refereeData";

export {
  COMPETITION_TYPES,
  TEAM_CATEGORIES,
  isCompetitionKey,
  isTeamCategoryKey,
  promptForCompetitionTypes,
  promptForTeamCategory,
  selectCompetitionTypes,
  selectDefaultDropdownOption,
  selectTeamCategory,
  type CompetitionKey,
  type TeamCategoryKey,
} from "./filters";

export {
  extractUpcomingGames,
  filterGamesByTeam,
  logUpcomingGames,
  promptForMatchEdit,
  promptForTeamFilter,
} from "./games";

export {
  handlePrivacyPopup,
  openMatchReport,
  processMatchReportPage,
} from "./matchReports";

export { selectDateAndSearch } from "./search";
export { login, navigateToSpielsuche } from "./sessions";
export { run, main } from "./runAutomation";
export type { RunOptions, RunResult, UpcomingGame } from "./types";

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
