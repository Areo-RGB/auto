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
  browser: import("playwright").Browser;
  context: import("playwright").BrowserContext;
  page: import("playwright").Page;
  upcomingGames: UpcomingGame[];
  selectedTeamCategory: TeamCategoryKey | null;
  selectedCompetitionKeys: CompetitionKey[];
}

import type { COMPETITION_TYPES, TEAM_CATEGORIES } from "../constants/catalogs";
import { CONTEXT_KEYS } from "../constants/catalogs";

export type CompetitionKey = keyof typeof COMPETITION_TYPES;
export type TeamCategoryKey = keyof typeof TEAM_CATEGORIES;

export type ContextKey = (typeof CONTEXT_KEYS)[number];

export type MatchContext = Record<ContextKey, string>;

export interface RefereeEntry {
  Vorname: string;
  Nachname: string;
}

export interface RefereeGroup {
  context: MatchContext;
  referees: RefereeEntry[];
}

export interface RefereeRecord {
  [key: string]: string | undefined;
  Saison?: string;
  Mannschaftsart?: string;
  Spielklasse?: string;
  Gebiet?: string;
  Wettkampf?: string;
  Staffel?: string;
  Runde?: string;
  Vorname?: string;
  Nachname?: string;
}

export type RefereeName = [string, string];

export interface CsvConversionOptions {
  csvPath?: string;
  jsonPath?: string;
  overwrite?: boolean;
}
