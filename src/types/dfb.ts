import type { Browser, BrowserContext, Page } from "playwright";

import {
  COMPETITION_TYPES,
  CONTEXT_KEYS,
  TEAM_CATEGORIES,
} from "../constants/catalogs";

export type ContextKey = (typeof CONTEXT_KEYS)[number];

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

export type MatchContext = Record<ContextKey, string>;

export interface RefereeEntry {
  Vorname: string;
  Nachname: string;
}

export interface RefereeGroup {
  context: MatchContext;
  referees: RefereeEntry[];
}

export type RefereeName = [string, string];

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

export type CompetitionKey = keyof typeof COMPETITION_TYPES;
export type TeamCategoryKey = keyof typeof TEAM_CATEGORIES;

export interface RunOptions {
  username?: string;
  password?: string;
  headless?: boolean;
  interactive?: boolean;
  teamCategoryKey?: TeamCategoryKey | null;
  competitionKeys?: CompetitionKey[];
  date?: Date;
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
