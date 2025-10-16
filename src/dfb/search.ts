import type { Locator, Page } from "playwright";

import type {
  CompetitionKey,
  TeamCategoryKey,
  UpcomingGame,
} from "../types/dfb";
import {
  selectCompetitionTypes,
  selectTeamCategory,
} from "./navigation";
import {
  promptForCompetitionTypes,
  promptForTeamCategory,
} from "../prompts/selection";

const DEFAULT_SEARCH_DATE = { year: 2050, month: 9, day: 1 } as const;
const GERMAN_MONTH_LABELS = [
  "Januar",
  "Februar",
  "M\u00e4rz",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;
const SPIELSUCH_URL =
  "https://www.dfbnet.org/spielplus/mod_sbo/webflow.do?event=START&dmg_menu=102";
const SPIELSUCH_PANEL_SELECTOR =
  "#panel-f26e1116-1b80-4558-91e8-776cd43989fa";

export async function selectDateAndSearch(
  page: Page,
  options: {
    teamCategoryKey?: TeamCategoryKey | null;
    competitionKeys?: CompetitionKey[];
    interactive: boolean;
    date?: Date;
  }
): Promise<{
  teamCategoryKey: TeamCategoryKey | null;
  competitionKeys: CompetitionKey[];
}> {
  const targetDate = options.date ?? getDefaultSearchDate();
  const formattedDate = formatDateToDfb(targetDate);

  const calendarDateSelected = await trySetCalendarDate(page, targetDate);

  const dateInputs = page
    .locator("#dfb-Content-insert")
    .getByRole("textbox", { name: /datum/i });
  const inputCount = await dateInputs.count();
  if (inputCount > 0 && !calendarDateSelected) {
    const count = await dateInputs.count();
    for (let i = 0; i < count; i += 1) {
      const input = dateInputs.nth(i);
      await input.click({ clickCount: 3 });
      await input.fill(formattedDate);
      await input.press("Enter").catch(() => {});
    }
  } else if (inputCount === 0 && !calendarDateSelected) {
    console.warn(
      "Could not locate a date input in the Spielsuche form; continuing with existing filter date.",
      {
        selector: "#dfb-Content-insert",
        role: "textbox",
        namePattern: "/datum/i",
        calendarSelected: calendarDateSelected,
      }
    );
  }

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
  let resultsTable = page.locator("#dfb-Content-view table.listtable").first();
  if ((await resultsTable.count()) === 0) {
    resultsTable = page.locator("#dfb-Content-view table").first();
  }
  await resultsTable.waitFor({ state: "visible" });
  await resultsTable.locator("tr").nth(1).waitFor({ state: "visible" });

  return {
    teamCategoryKey: selectedTeamCategory,
    competitionKeys: selectedCompetitionKeys,
  };
}

export async function extractUpcomingGames(page: Page): Promise<UpcomingGame[]> {
  let table = page.locator("#dfb-Content-view table.listtable").first();
  if ((await table.count()) === 0) {
    table = page.locator("#dfb-Content-view table").first();
  }
  if ((await table.count()) === 0) {
    return [];
  }

  const rows = table.locator("tr");
  const rowCount = await rows.count();
  const upcoming: UpcomingGame[] = [];
  const headerCells = await rows.first().locator("th").allInnerTexts();
  const headerMap = new Map<string, number>();
  headerCells.forEach((text, idx) => {
    headerMap.set(normalizeHeader(text), idx);
  });
  if (headerMap.size === 0) {
    console.warn(
      "Spielsuche results table header could not be determined; falling back to legacy column positions."
    );
  }

  const missingColumns = new Set<string>();
  const columnIndex = (
    name: string,
    variants: string[],
    fallback?: number
  ): number | undefined => {
    for (const variant of variants) {
      const index = headerMap.get(normalizeHeader(variant));
      if (index !== undefined) {
        return index;
      }
    }
    if (!missingColumns.has(name)) {
      missingColumns.add(name);
      if (fallback === undefined) {
        console.warn(
          `Spielsuche results header did not contain an expected column for '${name}'.`
        );
      } else {
        console.warn(
          `Spielsuche results header did not contain an expected column for '${name}'; falling back to index ${fallback}.`
        );
      }
    }
    return fallback;
  };

  const columns = {
    matchNumber: columnIndex("matchNumber", ["Spiel", "Spiel-Nr."], 2),
    kickoff: columnIndex(
      "kickoff",
      ["Anstoß", "Anstoss", "Datum/Uhrzeit", "Datum"],
      3
    ),
    matchday: columnIndex("matchday", ["Spieltag", "ST"], 4),
    home: columnIndex("homeTeam", ["Heim", "Heimmannschaft"], 5),
    away: columnIndex("awayTeam", ["Gast", "Gastmannschaft"], 7),
    result: columnIndex("result", ["Ergebnis"], 8),
    status: columnIndex("status", ["Status", "Spielstatus"]),
  };

  const dataStartIndex = headerMap.size > 0 ? 1 : 0;
  for (let i = dataStartIndex; i < rowCount; i += 1) {
    const row = rows.nth(i);
    const cellTexts = await row.locator("th, td").allInnerTexts();
    const normalized = cellTexts.map((txt) => txt.replace(/\s+/g, " ").trim());
    if (normalized.length === 0) continue;
    if (normalized.some((text) => /^spiel$/i.test(text))) {
      // Skip header rows that may appear within the body.
      continue;
    }

    const statusIndex =
      columns.status !== undefined ? columns.status : normalized.length - 1;
    const statusText = normalized[statusIndex] ?? normalized[normalized.length - 1] ?? "";
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
      // Ignore.
    }

    upcoming.push({
      match_number: getCell(normalized, columns.matchNumber),
      kickoff: getCell(normalized, columns.kickoff),
      matchday: getCell(normalized, columns.matchday),
      home_team: getCell(normalized, columns.home),
      away_team: getCell(normalized, columns.away),
      result: getCell(normalized, columns.result),
      status: statusText,
      report_link: linkHref,
      report_link_text: linkText,
    });
  }
  return upcoming;
}

function getCell(cells: string[], index?: number): string {
  if (index === undefined || index < 0) {
    return "";
  }
  return cells[index] ?? "";
}

function normalizeHeader(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function formatDateToDfb(date: Date): string {
  const day = `${date.getDate()}`.padStart(2, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const year = `${date.getFullYear()}`;
  return `${day}.${month}.${year}`;
}

function getDefaultSearchDate(): Date {
  const { year, month, day } = DEFAULT_SEARCH_DATE;
  return new Date(year, month, day);
}

async function trySetCalendarDate(
  page: Page,
  targetDate: Date
): Promise<boolean> {
  const targetString = formatDateToDfb(targetDate);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      if (attempt === 1) {
        console.warn("Retrying date selection after navigation", {
          attempt,
          url: SPIELSUCH_URL,
        });
        await page.goto(SPIELSUCH_URL);
      }

      const rootCandidates: Array<{ locator: Locator; description: string }> = [
        {
          locator: page.locator('form[name="actionForm"]').first(),
          description: 'form[name="actionForm"]',
        },
        {
          locator: page.locator(SPIELSUCH_PANEL_SELECTOR).first(),
          description: SPIELSUCH_PANEL_SELECTOR,
        },
      ];

      let root: { locator: Locator; description: string } | null = null;
      for (const candidate of rootCandidates) {
        try {
          await candidate.locator.waitFor({ state: "attached", timeout: 4_000 });
          root = candidate;
          break;
        } catch {
          continue;
        }
      }

      if (!root) {
        console.warn("No container found for Spielsuche date fields", {
          attempt,
          tried: rootCandidates.map((item) => item.description),
        });
        continue;
      }

      const textInputs = root.locator.locator('input[type="text"]');
      const metadata = await textInputs.evaluateAll((nodes) =>
        nodes.map((node, index) => {
          const input = node as any;
          return {
            index,
            name: input.name ?? "",
              id: input.id ?? "",
              placeholder: input.placeholder ?? "",
              title: input.title ?? "",
              value: input.value ?? "",
            };
          })
        );

      if (!metadata.length) {
        console.warn("No text inputs discovered in container", {
          attempt,
          container: root.description,
        });
        continue;
      }

      const datePattern = /^\d{1,2}\.\d{1,2}\.\d{4}$/;
      const bisCandidate =
        metadata.find(
          (entry) =>
            /bis/i.test(entry.name) ||
            /bis/i.test(entry.id) ||
            /bis/i.test(entry.placeholder) ||
            /bis/i.test(entry.title)
        ) ??
        (() => {
          const withDateValue = metadata.filter((entry) =>
            datePattern.test(entry.value.trim())
          );
          if (withDateValue.length >= 2) {
            return withDateValue[1];
          }
          if (withDateValue.length === 1) {
            return withDateValue[0];
          }
          if (metadata.length >= 2) {
            return metadata[1];
          }
          return metadata[0] ?? null;
        })();

      if (!bisCandidate) {
        console.warn("Bis date input not located", { attempt, metadata });
        continue;
      }

      const bisInput = textInputs.nth(bisCandidate.index);
      const bisVisible = await bisInput
        .waitFor({ state: "visible", timeout: 2_000 })
        .then(() => true)
        .catch(() => false);
      if (!bisVisible) {
        console.warn("Bis input not visible", {
          attempt,
          index: bisCandidate.index,
          metadata: bisCandidate,
        });
        continue;
      }

      await bisInput.focus().catch(() => {});
      await bisInput.click({ clickCount: 3 }).catch(() => {});
      await bisInput.fill(targetString);
      await bisInput.press("Enter").catch(() => {});

      console.info("Set bis date via textbox", {
        attempt,
        index: bisCandidate.index,
        selectorHint:
          bisCandidate.name ||
          bisCandidate.id ||
          bisCandidate.placeholder ||
          bisCandidate.title,
        value: targetString,
      });
      return true;
    } catch (error) {
      console.warn(
        `Date textbox interaction attempt ${attempt + 1} failed (${String(
          error
        )}).`
      );
    }
  }
  return false;
}

function formatCalendarAriaLabel(date: Date): string {
  const monthName = GERMAN_MONTH_LABELS[date.getMonth()] ?? "";
  const day = date.getDate();
  const year = date.getFullYear();
  return `${monthName} ${day}, ${year}`;
}

export function logUpcomingGames(
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


