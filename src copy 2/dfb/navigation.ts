import type { Page } from "playwright";
import { COMPETITION_TYPES, TEAM_CATEGORIES } from "../constants/catalogs";
import type { CompetitionKey, TeamCategoryKey } from "../types/dfb";
import {
  promptForCompetitionTypes,
  promptForTeamCategory,
} from "../cli/prompts";

export async function navigateToSpielsuche(page: Page): Promise<void> {
  await page.goto(
    "https://www.dfbnet.org/spielplus/mod_sbo/webflow.do?event=START&dmg_menu=102"
  );
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
    // ignore
  }
}

export async function selectTeamCategory(
  page: Page,
  categoryKey: TeamCategoryKey
): Promise<void> {
  const label = TEAM_CATEGORIES[categoryKey] ?? null;
  if (!label) {
    return;
  }

  try {
    await page.getByRole("combobox", { name: "Wettkampftyp" }).nth(2).click();
  } catch {
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
      .catch(() => {});
  }
  try {
    await page.keyboard.press("Escape");
  } catch {}
}

export async function selectCompetitionTypes(
  page: Page,
  types: CompetitionKey[]
): Promise<void> {
  for (const type of types) {
    const label = COMPETITION_TYPES[type];
    if (!label) {
      continue;
    }
    try {
      await page
        .getByRole("combobox", { name: "Wettkampftyp" })
        .first()
        .click();
    } catch {
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
        .catch(() => {});
    }
    try {
      await page.keyboard.press("Escape");
    } catch {}
  }
}

export async function selectDateAndSearch(
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

