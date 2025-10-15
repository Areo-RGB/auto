import type { BrowserContext, Frame, Page } from "playwright";

import { EXPECTED_DETAIL_TEXT, findRefereesForDetails } from "./refereeData";
import type { UpcomingGame } from "./types";

export async function handlePrivacyPopup(page: Page): Promise<void> {
  try {
    const button = page.getByTestId("uc-accept-all-button");
    await button.waitFor({ state: "visible", timeout: 5000 });
    await button.click();
  } catch {
    // Popup not shown; nothing to do.
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
        const locator = frame.getByText(text, { exact: false });
        const count = await locator.count();
        if (count > 0) {
          return frame;
        }
      } catch {
        // ignore transient frame errors
      }
    }
    await page.waitForTimeout(step);
  }

  return null;
}

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
    } catch (error) {
      console.log(
        `Could not complete referee entry for ${firstName} ${lastName} (${error}).`
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
  } catch (error) {
    console.log(`Could not complete Mannschaften sequence (${error}).`);
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
  } catch (error) {
    await matchPage.close().catch(() => {});
    throw error;
  }
}

