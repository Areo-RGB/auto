// Step 0: Dependency setup and credentials
import fs from "fs";
import path from "path";
import readline from "readline";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Frame,
  type Page,
} from "playwright";

const DFBNET_USERNAME = "66.paul.ziske";
const DFBNET_PASSWORD = "-HpQ#@+pXcG%33?";

const ROOT_DIR = path.resolve(__dirname, "..");

// Step 1: Referee data management
const REFEREE_JSON_PATH = path.join(ROOT_DIR, "referees.json");
const REFEREE_CSV_PATH = path.join(ROOT_DIR, "referees.csv");

const CONTEXT_KEYS = [
  "Saison",
  "Mannschaftsart",
  "Spielklasse",
  "Gebiet",
  "Wettkampf",
  "Staffel",
  "Runde",
] as const;

const CONTEXT_KEY_SEPARATOR = "::";

type ContextKey = (typeof CONTEXT_KEYS)[number];

interface RefereeRecord {
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

type MatchContext = Record<ContextKey, string>;

interface RefereeEntry {
  Vorname: string;
  Nachname: string;
}

interface RefereeGroup {
  context: MatchContext;
  referees: RefereeEntry[];
}

type RefereeName = [string, string];

interface CsvConversionOptions {
  csvPath?: string;
  jsonPath?: string;
  overwrite?: boolean;
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
const TARGET_MATCH_CONTEXT: MatchContext = {
  Saison: "Saison25/26",
  Mannschaftsart: "MannschaftsartD-Junioren",
  Spielklasse: "SpielklasseKreisklasse C",
  Gebiet: "GebietKreis Berlin",
  Wettkampf: "WettkampfMeisterschaft",
  Staffel: "Staffelunt. D-Junioren Kreisklasse C St.1 Hin",
  Runde: "RundeRunde 1",
};

const DEFAULT_REFEREE_GROUPS: RefereeGroup[] = [
  {
    context: { ...TARGET_MATCH_CONTEXT },
    referees: [
      { Vorname: "Paul", Nachname: "Ziske" },
      { Vorname: "Gregor", Nachname: "Aschenbroich" },
    ],
  },
];

const EXPECTED_DETAIL_TEXT = contextToDetailText(TARGET_MATCH_CONTEXT);

const TEAM_FILTER_PREFIX = "FC Hertha 03";

export function ensureRefereeJson(): void {
  if (fs.existsSync(REFEREE_JSON_PATH)) {
    return;
  }
  if (fs.existsSync(REFEREE_CSV_PATH)) {
    try {
      convertRefereeCsvToJson({ overwrite: true });
      return;
    } catch (err) {
      console.warn(
        `Failed to convert ${REFEREE_CSV_PATH} to JSON. Falling back to defaults.`,
        err
      );
    }
  }
  fs.writeFileSync(
    REFEREE_JSON_PATH,
    JSON.stringify(DEFAULT_REFEREE_GROUPS, null, 2),
    "utf-8"
  );
}

export function convertRefereeCsvToJson(
  options: CsvConversionOptions = {}
): RefereeGroup[] {
  const {
    csvPath = REFEREE_CSV_PATH,
    jsonPath = REFEREE_JSON_PATH,
    overwrite = false,
  } = options;
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found at ${csvPath}`);
  }
  if (!overwrite && fs.existsSync(jsonPath)) {
    throw new Error(
      `JSON file already exists at ${jsonPath}. Pass { overwrite: true } to replace it.`
    );
  }
  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    fs.writeFileSync(jsonPath, JSON.stringify([], null, 2), "utf-8");
    return [];
  }

  const headers = parseCsvLine(lines[0]!);
  if (!headers.length) {
    throw new Error(`CSV header row at ${csvPath} is empty.`);
  }

  const records: RefereeRecord[] = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record: RefereeRecord = {};
    headers.forEach((key, idx) => {
      const value = values[idx] ?? "";
      record[key] = value;
    });
    return record;
  });
  const groups = groupRefereeRecords(records);
  fs.writeFileSync(jsonPath, JSON.stringify(groups, null, 2), "utf-8");
  return groups;
}

function groupRefereeRecords(records: RefereeRecord[]): RefereeGroup[] {
  const grouped = new Map<string, RefereeGroup>();
  for (const record of records) {
    const context = createContextFromRecord(record);
    const key = buildContextKey(context);
    const firstName = record.Vorname ?? "";
    const lastName = record.Nachname ?? "";

    if (!firstName && !lastName) {
      continue;
    }

    let entry = grouped.get(key);
    if (!entry) {
      entry = { context, referees: [] };
      grouped.set(key, entry);
    }
    entry.referees.push({ Vorname: firstName, Nachname: lastName });
  }
  return Array.from(grouped.values());
}

function createContextFromRecord(record: RefereeRecord): MatchContext {
  const context = {} as MatchContext;
  for (const key of CONTEXT_KEYS) {
    const value = record[key];
    context[key] = typeof value === "string" ? value : "";
  }
  return context;
}

function buildContextKey(context: MatchContext): string {
  return CONTEXT_KEYS.map((key) => context[key] ?? "").join(CONTEXT_KEY_SEPARATOR);
}

function contextToDetailText(context: MatchContext): string {
  return CONTEXT_KEYS.map((key) => context[key]).join("");
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current);
  return result;
}

function normalizeRefereeGroup(entry: unknown): RefereeGroup {
  const contextSource =
    entry &&
    typeof entry === "object" &&
    entry !== null &&
    "context" in (entry as Record<string, unknown>)
      ? ((entry as Record<string, unknown>).context as Record<string, unknown> | undefined)
      : undefined;

  const context = {} as MatchContext;
  for (const key of CONTEXT_KEYS) {
    const value = contextSource?.[key];
    context[key] = typeof value === "string" ? value : "";
  }

  const refereesSource =
    entry &&
    typeof entry === "object" &&
    entry !== null &&
    "referees" in (entry as Record<string, unknown>)
      ? ((entry as Record<string, unknown>).referees as unknown[] | undefined)
      : undefined;

  const referees: RefereeEntry[] = Array.isArray(refereesSource)
    ? refereesSource
        .map((ref) => {
          if (!ref || typeof ref !== "object") {
            return { Vorname: "", Nachname: "" };
          }
          const source = ref as Record<string, unknown>;
          const firstName = typeof source.Vorname === "string" ? source.Vorname : "";
          const lastName = typeof source.Nachname === "string" ? source.Nachname : "";
          return { Vorname: firstName, Nachname: lastName };
        })
        .filter((ref) => ref.Vorname !== "" || ref.Nachname !== "")
    : [];

  return { context, referees };
}

function cloneDefaultRefereeGroups(): RefereeGroup[] {
  return DEFAULT_REFEREE_GROUPS.map((group) => ({
    context: { ...group.context },
    referees: group.referees.map((ref) => ({ ...ref })),
  }));
}

function contextsEqual(a: MatchContext, b: MatchContext): boolean {
  return CONTEXT_KEYS.every((key) => a[key] === b[key]);
}

export function loadRefereeGroups(): RefereeGroup[] {
  ensureRefereeJson();
  const content = fs.readFileSync(REFEREE_JSON_PATH, "utf-8").trim();
  if (!content) {
    return [];
  }
  try {
    const data = JSON.parse(content) as unknown;
    if (!Array.isArray(data)) {
      return [];
    }
    return data.map((entry) => normalizeRefereeGroup(entry));
  } catch (err) {
    console.warn(
      `Could not parse referee data at ${REFEREE_JSON_PATH}. Falling back to defaults.`,
      err
    );
    return cloneDefaultRefereeGroups();
  }
}

export function findRefereesForDetails(): RefereeName[] {
  const matches: RefereeName[] = [];
  const groups = loadRefereeGroups();
  for (const group of groups) {
    if (!contextsEqual(group.context, TARGET_MATCH_CONTEXT)) {
      continue;
    }
    for (const referee of group.referees) {
      matches.push([referee.Vorname, referee.Nachname]);
    }
  }
  return matches;
}

// Step 2: Lookup tables for filters
export const COMPETITION_TYPES = {
  meisterschaft: "Meisterschaft",
  spielnachmittag: "Spielnachmittag",
  pokal: "Pokal",
  turnier: "Turnier",
  freundschaftsspiel: "Freundschaftsspiel",
  futsal: "Futsal-Ligabetrieb",
  hallenturnier: "Hallenturnier",
  beachsoccer: "Beachsoccer-Meisterschaft",
  auswahlspiel: "Auswahlspiel",
  auswahl_freundschaftsspiel: "Auswahl-Freundschaftsspiel",
  auswahlturnier: "Auswahlturnier",
  auswahl_trainingsspiel: "Auswahl-Trainingsspiel",
} as const;

export const TEAM_CATEGORIES = {
  herren_u70: "Herren Ü70",
  herren_u60: "Herren Ü60",
  herren_u60_freizeit: "Herren Ü60 Freizeit/Betrieb",
  herren_u50: "Herren Ü50",
  herren_u50_freizeit: "Herren Ü50 Freizeit/Betrieb",
  herren_u40: "Herren Ü40",
  herren_u40_11er: "Herren Ü40 (11er)",
  herren_u40_freizeit: "Herren Ü40 Freizeit/Betrieb",
  herren_u32: "Herren Ü32",
  herren_u32_freizeit: "Herren Ü32 Freizeit/Betrieb",
  herren: "Herren",
  herren_freizeit: "Herren Freizeit/Betrieb",
  herren_handicap: "Herren Handicap-Fußball",
  a_junioren: "A-Junioren",
  b_junioren: "B-Junioren",
  c_junioren: "C-Junioren",
  d_junioren: "D-Junioren",
  e_junioren: "E-Junioren",
  f_junioren: "F-Junioren",
  g_junioren: "G-Junioren",
  frauen_u32: "Frauen Ü32",
  frauen: "Frauen",
  a_juniorinnen: "A-Juniorinnen",
  b_juniorinnen: "B-Juniorinnen",
  c_juniorinnen: "C-Juniorinnen",
  d_juniorinnen: "D-Juniorinnen",
  e_juniorinnen: "E-Juniorinnen",
  f_juniorinnen: "F-Juniorinnen",
  g_juniorinnen: "G-Juniorinnen",
  freizeitsport: "Freizeitsport",
} as const;

export type CompetitionKey = keyof typeof COMPETITION_TYPES;
export type TeamCategoryKey = keyof typeof TEAM_CATEGORIES;

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

// Step 3: General browser helpers
async function handlePrivacyPopup(page: Page): Promise<void> {
  try {
    const button = page.getByTestId("uc-accept-all-button");
    await button.waitFor({ state: "visible", timeout: 5000 });
    await button.click();
  } catch (err) {
    // popup not shown
  }
}

async function findFrameWithText(
  page: Page,
  text: string,
  timeoutMs = 5000
): Promise<Frame | null> {
  const step = 250;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    for (const frame of page.frames()) {
      try {
        const locator = frame.getByText(text);
        const count = await locator.count();
        if (count > 0) {
          return frame;
        }
      } catch (err) {
        // ignore
      }
    }
    await page.waitForTimeout(step);
  }
  return null;
}

// Step 4: Match-report specific automation
async function processMatchReportPage(page: Page): Promise<void> {
  try {
    await page.waitForLoadState("domcontentloaded", { timeout: 15000 });
  } catch {
    console.log("Match report page did not finish loading in time.");
    return;
  }

  const frame = await findFrameWithText(page, "Schiedsrichter hinzufügen");
  if (!frame) {
    console.log(
      "Could not locate frame containing 'Schiedsrichter hinzufügen'."
    );
    return;
  }

  try {
    await frame
      .getByText("Saison25/26MannschaftsartD-", { exact: false })
      .waitFor({ timeout: 5000 });
  } catch {
    console.log(
      "Expected match detail text not found in frame; skipping referee autofill."
    );
    return;
  }

  const referees = findRefereesForDetails();
  if (referees.length === 0) {
    console.log("No referee entry found in CSV for this match context.");
    return;
  }

  for (const [firstName, lastName] of referees) {
    try {
      await frame
        .getByText("Schiedsrichter hinzufügen")
        .click({ timeout: 5000 });
      await frame.waitForTimeout(500);
    } catch {
      console.log(
        `Could not click 'Schiedsrichter hinzufügen' for ${firstName} ${lastName}.`
      );
      continue;
    }

    try {
      await frame.getByRole("textbox", { name: /Vorname/i }).fill(firstName);
      await frame.waitForTimeout(200);
      await frame.getByRole("textbox", { name: /Nachname/i }).fill(lastName);
      console.log(`Referee information filled: ${firstName} ${lastName}`);
      await frame.waitForTimeout(200);
      await frame.getByText("Hinzufügen").click();
      await frame.waitForTimeout(200);
      await frame.getByText("Speichern", { exact: true }).click();
      await frame.waitForTimeout(200);
      await frame.getByRole("button", { name: "OK" }).click();
      await frame.waitForTimeout(200);
    } catch (err) {
      console.log(
        `Could not complete referee entry for ${firstName} ${lastName} (${err}).`
      );
      continue;
    }
  }

  try {
    await frame.getByText("Mannschaften").click({ timeout: 5000 });
    await frame.waitForTimeout(300);
    await frame.getByTitle("Öffnen").click({ timeout: 5000 });
    await frame.waitForTimeout(300);
    await frame.getByText("Laden", { exact: true }).click({ timeout: 5000 });
    await frame.waitForTimeout(500);
  } catch (err) {
    console.log(`Could not complete Mannschaften sequence (${err}).`);
  }
}

// Step 5: Portal navigation helpers
async function login(
  page: Page,
  username: string,
  password: string
): Promise<void> {
  await page.getByTestId("uc-accept-all-button").click();
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.getByTestId("uc-accept-all-button").click();
  await page.getByRole("link", { name: "Anmelden" }).nth(1).click();
  await page.getByRole("textbox", { name: "Benutzerkennung" }).click();
  await page.getByRole("textbox", { name: "Benutzerkennung" }).fill(username);
  await page.getByRole("textbox", { name: "Benutzerkennung" }).press("Tab");
  await page.getByRole("textbox", { name: "Passwort" }).click();
  await page.getByRole("textbox", { name: "Passwort" }).fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
}

async function navigateToSpielsuche(page: Page): Promise<void> {
  await page.goto(
    "https://www.dfbnet.org/spielplus/mod_sbo/webflow.do?event=START&dmg_menu=102"
  );
}

async function selectDefaultDropdownOption(
  page: Page,
  comboboxIndex: number,
  optionIndex = 0
): Promise<void> {
  try {
    await page
      .getByRole("combobox", { name: "Wettkampftyp" })
      .nth(comboboxIndex)
      .click();
  } catch {
    return;
  }

  const options = page.locator("div").filter({ hasText: /^Keine Auswahl$/i });
  const count = await options.count();
  if (count > optionIndex) {
    await options.nth(optionIndex).click();
  } else if (count > 0) {
    await options.first().click();
  } else {
    const fallback = page.getByRole("option", { name: "Keine Auswahl" });
    const fallbackCount = await fallback.count();
    if (fallbackCount > optionIndex) {
      await fallback.nth(optionIndex).click();
    } else if (fallbackCount > 0) {
      await fallback.first().click();
    }
  }
  try {
    await page.keyboard.press("Escape");
  } catch {
    // ignore
  }
}

async function selectTeamCategory(
  page: Page,
  categoryKey: TeamCategoryKey
): Promise<void> {
  const label = TEAM_CATEGORIES[categoryKey] ?? null;
  if (!label) {
    console.log(`Warning: Unknown team category '${categoryKey}'`);
    return;
  }

  try {
    await page.getByRole("combobox", { name: "Wettkampftyp" }).nth(2).click();
  } catch {
    console.log("Could not open team category dropdown.");
    return;
  }

  const option = page.getByRole("option", { name: label, exact: true });
  const count = await option.count();
  if (count > 0) {
    await option.first().locator("div, span").first().click();
  } else {
    await option
      .first()
      .click()
      .catch(() => {
        console.log(`Could not select team category: ${label}`);
      });
  }
  try {
    await page.keyboard.press("Escape");
  } catch {
    // ignore
  }
}

async function selectCompetitionTypes(
  page: Page,
  types: CompetitionKey[]
): Promise<void> {
  for (const type of types) {
    const label = COMPETITION_TYPES[type];
    if (!label) {
      console.log(`Warning: Unknown competition type '${type}'`);
      continue;
    }
    try {
      await page
        .getByRole("combobox", { name: "Wettkampftyp" })
        .first()
        .click();
    } catch {
      console.log("Could not open competition type dropdown.");
      return;
    }
    const option = page.getByRole("option", { name: label, exact: true });
    const count = await option.count();
    if (count > 0) {
      await option.first().locator("div, span").first().click();
    } else {
      await page
        .getByRole("option", { name: label })
        .first()
        .click()
        .catch(() => {
          console.log(`Could not select competition type: ${label}`);
        });
    }
    try {
      await page.keyboard.press("Escape");
    } catch {
      // ignore
    }
  }
}

async function selectDateAndSearch(
  page: Page,
  options: {
    teamCategoryKey?: TeamCategoryKey | null;
    competitionKeys?: CompetitionKey[];
    interactive: boolean;
  }
): Promise<{
  teamCategoryKey: TeamCategoryKey | null;
  competitionKeys: CompetitionKey[];
}> {
  await page.locator("#dfb-Content-insert").getByRole("img").nth(1).click();
  const yearSpinner = page.getByRole("spinbutton", { name: "Year" });
  await yearSpinner.click();
  await yearSpinner.fill("2030");
  await yearSpinner.press("Enter");
  await page.getByLabel("Oktober 1, 2030").click();

  let selectedTeamCategory = options.teamCategoryKey ?? null;
  let selectedCompetitionKeys = options.competitionKeys ?? [];

  if (selectedTeamCategory === null && options.interactive) {
    selectedTeamCategory = await promptForTeamCategory(page);
  }
  if (selectedCompetitionKeys.length === 0 && options.interactive) {
    selectedCompetitionKeys = await promptForCompetitionTypes(page);
  }
  if (selectedTeamCategory) {
    await selectTeamCategory(page, selectedTeamCategory);
  }
  if (selectedCompetitionKeys.length > 0) {
    await selectCompetitionTypes(page, selectedCompetitionKeys);
  }

  await page.getByRole("button", { name: "Suchen" }).click();
  const resultsTable = page.locator("#dfb-Content-view table");
  await resultsTable.waitFor({ state: "visible" });
  await resultsTable.locator("tr").nth(1).waitFor({ state: "visible" });

  return {
    teamCategoryKey: selectedTeamCategory,
    competitionKeys: selectedCompetitionKeys,
  };
}

// Step 6: Match table extraction and logging
async function extractUpcomingGames(page: Page): Promise<UpcomingGame[]> {
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

function logUpcomingGames(
  games: UpcomingGame[],
  title = "Upcoming games"
): void {
  if (!games.length) {
    console.log("No upcoming games found.");
    return;
  }
  console.log(`${title}:`);
  for (const game of games) {
    const parts = [];
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

// Step 7: CLI prompt helpers
function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function promptForTeamCategory(
  page: Page
): Promise<TeamCategoryKey | null> {
  console.log("\nAvailable team categories:");
  const keys = Object.keys(TEAM_CATEGORIES) as TeamCategoryKey[];
  keys.forEach((key, idx) => {
    console.log(` ${idx + 1}. ${TEAM_CATEGORIES[key]} (${key})`);
  });
  console.log(" 0. Skip team category filter");

  while (true) {
    const selection = (
      await askQuestion("Select team category (0 to skip): ")
    ).trim();
    if (!selection) {
      console.log("Selecting default team category 'Keine Auswahl'.");
      await selectDefaultDropdownOption(page, 2, 1);
      return null;
    }
    if (/^\d+$/.test(selection)) {
      const choice = Number(selection);
      if (choice === 0) {
        console.log("Skipping team category filter.");
        return null;
      }
      if (choice >= 1 && choice <= keys.length) {
        const key = keys[choice - 1]!;
        console.log(`Selected team category: ${TEAM_CATEGORIES[key]}`);
        return key;
      }
    }
    console.log("Invalid selection. Please enter a valid number.");
  }
}

async function promptForCompetitionTypes(
  page: Page
): Promise<CompetitionKey[]> {
  console.log("\nAvailable competition types:");
  const keys = Object.keys(COMPETITION_TYPES) as CompetitionKey[];
  keys.forEach((key, idx) => {
    console.log(` ${idx + 1}. ${COMPETITION_TYPES[key]} (${key})`);
  });
  console.log(
    "Enter numbers separated by commas (e.g., 1,3,5). Leave blank to skip."
  );

  while (true) {
    const selection = (await askQuestion("Select competition types: ")).trim();
    if (!selection) {
      console.log("Selecting default competition type 'Keine Auswahl'.");
      await selectDefaultDropdownOption(page, 0, 0);
      return [];
    }

    const parts = selection
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const resolved: CompetitionKey[] = [];
    let valid = true;
    for (const part of parts) {
      if (!/^\d+$/.test(part)) {
        valid = false;
        break;
      }
      const idx = Number(part);
      if (idx < 1 || idx > keys.length) {
        valid = false;
        break;
      }
      const selectedKey = keys[idx - 1]!;
      resolved.push(selectedKey);
    }
    if (valid && resolved.length) {
      console.log(
        `Selected competition types: ${resolved
          .map((key) => COMPETITION_TYPES[key])
          .join(", ")}`
      );
      return resolved;
    }
    console.log(
      "Invalid selection. Please enter valid numbers separated by commas."
    );
  }
}

// Step 8: Post-search filtering and editing
export function filterGamesByTeam(
  games: UpcomingGame[],
  team: string
): UpcomingGame[] {
  return games.filter(
    (game) => game.home_team === team || game.away_team === team
  );
}

async function promptForTeamFilter(
  games: UpcomingGame[]
): Promise<UpcomingGame[]> {
  const teams = new Set<string>();
  for (const game of games) {
    if (game.home_team.startsWith(TEAM_FILTER_PREFIX))
      teams.add(game.home_team);
    if (game.away_team.startsWith(TEAM_FILTER_PREFIX))
      teams.add(game.away_team);
  }
  if (teams.size === 0) {
    console.log(
      `No teams starting with '${TEAM_FILTER_PREFIX}' found in the results.`
    );
    return games;
  }
  const sorted = Array.from(teams).sort();
  console.log(`\nTeams starting with '${TEAM_FILTER_PREFIX}':`);
  sorted.forEach((team, idx) => console.log(` ${idx + 1}. ${team}`));

  const answer = (
    await askQuestion(
      "Enter the number of the team to filter (press Enter to skip): "
    )
  ).trim();
  if (!answer) {
    console.log("Skipping team filter.");
    return games;
  }
  if (/^\d+$/.test(answer)) {
    const choice = Number(answer);
    if (choice >= 1 && choice <= sorted.length) {
      const team = sorted[choice - 1]!;
      const filtered = filterGamesByTeam(games, team);
      if (filtered.length) {
        console.log();
        logUpcomingGames(filtered, `Upcoming games for ${team}`);
        return filtered;
      }
      console.log(`No games found for ${team}.`);
    }
  }
  console.log("Invalid selection. Returning unfiltered games.");
  return games;
}

export async function openMatchReport(
  context: BrowserContext,
  game: UpcomingGame
): Promise<Page> {
  if (!game.report_link) {
    throw new Error("Selected match does not have an edit link available.");
  }
  const fullUrl = game.report_link.startsWith("http")
    ? game.report_link
    : `https://www.dfbnet.org${game.report_link}`;
  const matchPage = await context.newPage();
  try {
    await matchPage.goto(fullUrl);
    await handlePrivacyPopup(matchPage);
    await processMatchReportPage(matchPage);
    return matchPage;
  } catch (err) {
    await matchPage.close().catch(() => {});
    throw err;
  }
}

async function promptForMatchEdit(
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
      ` ${idx + 1}. ${game.kickoff} | ${game.home_team} vs ${
        game.away_team
      } | ${game.status}`
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

// Step 9: Main workflow orchestration
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

async function main(): Promise<void> {
  ensureRefereeJson();
  let context: BrowserContext | undefined;
  try {
    const result = await run({ headless: false });
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
