import readline from "readline";

import type { Page } from "playwright";

import {
  COMPETITION_TYPES,
  TEAM_CATEGORIES,
} from "../constants/catalogs";
import type { CompetitionKey, TeamCategoryKey } from "../types/dfb";
import { selectDefaultDropdownOption } from "../dfb/navigation";

export function askQuestion(question: string): Promise<string> {
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
