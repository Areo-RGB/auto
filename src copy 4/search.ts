import type { Page } from "playwright";

import {
  CompetitionKey,
  TeamCategoryKey,
  promptForCompetitionTypes,
  promptForTeamCategory,
  selectCompetitionTypes,
  selectTeamCategory,
} from "./filters";

interface SearchOptions {
  teamCategoryKey?: TeamCategoryKey | null;
  competitionKeys?: CompetitionKey[];
  interactive: boolean;
}

export async function selectDateAndSearch(
  page: Page,
  options: SearchOptions
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

