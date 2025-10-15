import fs from "fs";
import { REFEREE_JSON_PATH } from "../constants/paths";
import {
  DEFAULT_REFEREE_GROUPS,
  TARGET_MATCH_CONTEXT,
} from "../constants/defaults";
import { CONTEXT_KEYS, CONTEXT_KEY_SEPARATOR } from "../constants/catalogs";
import type {
  MatchContext,
  RefereeEntry,
  RefereeGroup,
  RefereeName,
  RefereeRecord,
} from "../types/dfb";
import { convertRefereeCsvToJson } from "./csv";

export function ensureRefereeJson(): void {
  if (fs.existsSync(REFEREE_JSON_PATH)) {
    return;
  }
  try {
    convertRefereeCsvToJson({ overwrite: true });
    return;
  } catch (err) {
    // fall back to defaults when CSV missing or conversion fails
  }
  fs.writeFileSync(
    REFEREE_JSON_PATH,
    JSON.stringify(DEFAULT_REFEREE_GROUPS, null, 2),
    "utf-8"
  );
}

export function groupRefereeRecords(records: RefereeRecord[]): RefereeGroup[] {
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

export function createContextFromRecord(record: RefereeRecord): MatchContext {
  const context = {} as MatchContext;
  for (const key of CONTEXT_KEYS) {
    const value = record[key];
    context[key] = typeof value === "string" ? value : "";
  }
  return context;
}

export function buildContextKey(context: MatchContext): string {
  return CONTEXT_KEYS.map((key) => context[key] ?? "").join(
    CONTEXT_KEY_SEPARATOR
  );
}

export function contextToDetailText(context: MatchContext): string {
  return CONTEXT_KEYS.map((key) => context[key]).join("");
}

function normalizeRefereeGroup(entry: unknown): RefereeGroup {
  const contextSource =
    entry &&
    typeof entry === "object" &&
    entry !== null &&
    "context" in (entry as Record<string, unknown>)
      ? ((entry as Record<string, unknown>).context as
          | Record<string, unknown>
          | undefined)
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
          const firstName =
            typeof source.Vorname === "string" ? source.Vorname : "";
          const lastName =
            typeof source.Nachname === "string" ? source.Nachname : "";
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

