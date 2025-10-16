import type { Page } from "playwright";

import { COMPETITION_TYPES, TEAM_CATEGORIES } from "../constants/catalogs";
import type { CompetitionKey, TeamCategoryKey } from "../types/dfb";

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
    // Ignore.
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
    // Ignore.
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
      // Ignore.
    }
  }
}
