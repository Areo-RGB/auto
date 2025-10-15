import type { Browser, BrowserContext, Page } from "playwright";

import type { CompetitionKey, TeamCategoryKey } from "./filters";

export interface UpcomingGame {
  match_number: string;
  kickoff: string;
  matchday: string;
  home_team: string;
  away_team: string;
  result: string;
  status: string;
  report_link: string;
  report_link_text: string;
}

export interface RunOptions {
  username?: string;
  password?: string;
  headless?: boolean;
  interactive?: boolean;
  teamCategoryKey?: TeamCategoryKey | null;
  competitionKeys?: CompetitionKey[];
  teamFilterTeam?: string | null;
  matchSelectionIndex?: number | null;
}

export interface RunResult {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  upcomingGames: UpcomingGame[];
  selectedTeamCategory: TeamCategoryKey | null;
  selectedCompetitionKeys: CompetitionKey[];
}

