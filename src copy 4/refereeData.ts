import fs from "fs";
import path from "path";

const ROOT_DIR = path.resolve(__dirname, "..");
const REFEREE_JSON_PATH = path.join(ROOT_DIR, "referees.json");
const REFEREE_CSV_PATH = path.join(ROOT_DIR, "referees.csv");

export const CONTEXT_KEYS = [
  "Saison",
  "Mannschaftsart",
  "Spielklasse",
  "Gebiet",
  "Wettkampf",
  "Staffel",
  "Runde",
] as const;

const CONTEXT_KEY_SEPARATOR = "::";

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

export interface CsvConversionOptions {
  csvPath?: string;
  jsonPath?: string;
  overwrite?: boolean;
}

export const TARGET_MATCH_CONTEXT: MatchContext = {
  Saison: "Saison25/26",
  Mannschaftsart: "MannschaftsartD-Junioren",
  Spielklasse: "SpielklasseKreisklasse C",
  Gebiet: "GebietKreis Berlin",
  Wettkampf: "WettkampfMeisterschaft",
  Staffel: "Staffelunt. D-Junioren Kreisklasse C St.1 Hin",
  Runde: "RundeRunde 1",
};

export const DEFAULT_REFEREE_GROUPS: RefereeGroup[] = [
  {
    context: { ...TARGET_MATCH_CONTEXT },
    referees: [
      { Vorname: "Paul", Nachname: "Ziske" },
      { Vorname: "Gregor", Nachname: "Aschenbroich" },
    ],
  },
];

export const TEAM_FILTER_PREFIX = "FC Hertha 03";

export const EXPECTED_DETAIL_TEXT = contextToDetailText(TARGET_MATCH_CONTEXT);

export function ensureRefereeJson(): void {
  if (fs.existsSync(REFEREE_JSON_PATH)) {
    return;
  }

  if (fs.existsSync(REFEREE_CSV_PATH)) {
    try {
      convertRefereeCsvToJson({ overwrite: true });
      return;
    } catch (error) {
      console.warn(
        `Failed to convert ${REFEREE_CSV_PATH} to JSON. Falling back to defaults.`,
        error
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

export function loadRefereeGroups(
  jsonPath: string = REFEREE_JSON_PATH
): RefereeGroup[] {
  if (jsonPath === REFEREE_JSON_PATH) {
    ensureRefereeJson();
  }

  let content = "";
  try {
    content = fs.readFileSync(jsonPath, "utf-8").trim();
  } catch (error) {
    if (jsonPath !== REFEREE_JSON_PATH) {
      throw error;
    }
    return cloneDefaultRefereeGroups();
  }

  if (!content) {
    return [];
  }

  try {
    const data = JSON.parse(content) as unknown;
    if (!Array.isArray(data)) {
      return [];
    }
    return data.map((entry) => normalizeRefereeGroup(entry));
  } catch (error) {
    console.warn(
      `Could not parse referee data at ${jsonPath}. Falling back to defaults.`,
      error
    );
    return cloneDefaultRefereeGroups();
  }
}

export function findRefereesForDetails(
  context: MatchContext = TARGET_MATCH_CONTEXT,
  jsonPath: string = REFEREE_JSON_PATH
): RefereeName[] {
  const matches: RefereeName[] = [];
  const groups = loadRefereeGroups(jsonPath);

  for (const group of groups) {
    if (!contextsEqual(group.context, context)) {
      continue;
    }

    for (const referee of group.referees) {
      matches.push([referee.Vorname, referee.Nachname]);
    }
  }

  return matches;
}

export function contextToDetailText(context: MatchContext): string {
  return CONTEXT_KEYS.map((key) => context[key]).join("");
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
  return CONTEXT_KEYS.map((key) => context[key] ?? "").join(
    CONTEXT_KEY_SEPARATOR
  );
}

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === "\\" && inQuotes && line[i + 1] === '"') {
      current += '"';
      i += 1;
      continue;
    }

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
  const source = (entry ?? {}) as Record<string, unknown>;

  const context = {} as MatchContext;
  const contextFromNested =
    typeof source.context === "object" && source.context !== null
      ? (source.context as Record<string, unknown>)
      : undefined;

  for (const key of CONTEXT_KEYS) {
    let value: unknown;
    if (contextFromNested && typeof contextFromNested[key] === "string") {
      value = contextFromNested[key];
    } else if (typeof source[key] === "string") {
      value = source[key];
    } else {
      value = "";
    }

    context[key] = value as string;
  }

  const refereesSource = Array.isArray(source.referees)
    ? source.referees
    : source.referee
      ? [source.referee]
      : undefined;

  const referees: RefereeEntry[] = Array.isArray(refereesSource)
    ? refereesSource
        .map((ref) => {
          if (!ref || typeof ref !== "object") {
            return { Vorname: "", Nachname: "" };
          }
          const refRecord = ref as Record<string, unknown>;
          const firstName =
            typeof refRecord.Vorname === "string" ? refRecord.Vorname : "";
          const lastName =
            typeof refRecord.Nachname === "string" ? refRecord.Nachname : "";
          return { Vorname: firstName, Nachname: lastName };
        })
        .filter((ref) => ref.Vorname !== "" || ref.Nachname !== "")
    : [];

  if (!referees.length) {
    const legacyFirst =
      typeof source.Vorname === "string" ? source.Vorname : "";
    const legacyLast =
      typeof source.Nachname === "string" ? source.Nachname : "";
    if (legacyFirst || legacyLast) {
      referees.push({ Vorname: legacyFirst, Nachname: legacyLast });
    }
  }

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
