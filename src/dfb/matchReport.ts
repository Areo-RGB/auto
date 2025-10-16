import type { BrowserContext, Page } from "playwright";

import { EXPECTED_DETAIL_TEXT } from "../constants/defaults";
import type { UpcomingGame } from "../types/dfb";
import { findFrameWithText } from "../browser/frames";
import { handlePrivacyPopup } from "../browser/privacy";
import { findRefereesForDetails } from "../referees/store";

export async function processMatchReportPage(page: Page): Promise<void> {
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
      .getByText(EXPECTED_DETAIL_TEXT, { exact: false })
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
