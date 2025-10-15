import type { Page } from "playwright";

import { askQuestion } from "./cli";

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

export function isCompetitionKey(value: unknown): value is CompetitionKey {
  return typeof value === "string" && value in COMPETITION_TYPES;
}

export function isTeamCategoryKey(value: unknown): value is TeamCategoryKey {
  return typeof value === "string" && value in TEAM_CATEGORIES;
}

export async function selectDefaultDropdownOption(
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
    // ignored
  }
}

export async function selectTeamCategory(
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
    // ignored
  }
}

export async function selectCompetitionTypes(
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
      // ignored
    }
  }
}

export async function promptForTeamCategory(
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

export async function promptForCompetitionTypes(
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
      .map((part) => part.trim())
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

    console.log("Invalid selection. Please enter valid numbers separated by commas.");
  }
}

