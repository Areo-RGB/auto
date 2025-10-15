import type { BrowserContext, Page } from "playwright";
import { handlePrivacyPopup } from "../browser/privacy";
import { findFrameWithText } from "../browser/frames";
import { findRefereesForDetails } from "../referees/store";

async function processMatchReportPage(page: Page): Promise<void> {
  try {
    await page.waitForLoadState("domcontentloaded", { timeout: 15000 });
  } catch {
    return;
  }

  const frame = await findFrameWithText(page, "Schiedsrichter hinzufügen");
  if (!frame) {
    return;
  }

  try {
    await frame
      .getByText("Saison25/26MannschaftsartD-", { exact: false })
      .waitFor({ timeout: 5000 });
  } catch {
    return;
  }

  const referees = findRefereesForDetails();
  if (referees.length === 0) {
    return;
  }

  for (const [firstName, lastName] of referees) {
    try {
      await frame
        .getByText("Schiedsrichter hinzufügen")
        .click({ timeout: 5000 });
      await frame.waitForTimeout(500);
    } catch {
      continue;
    }

    try {
      await frame.getByRole("textbox", { name: /Vorname/i }).fill(firstName);
      await frame.waitForTimeout(200);
      await frame.getByRole("textbox", { name: /Nachname/i }).fill(lastName);
      await frame.waitForTimeout(200);
      await frame.getByText("Hinzufügen").click();
      await frame.waitForTimeout(200);
      await frame.getByText("Speichern", { exact: true }).click();
      await frame.waitForTimeout(200);
      await frame.getByRole("button", { name: "OK" }).click();
      await frame.waitForTimeout(200);
    } catch (err) {
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
  } catch (err) {}
}

export async function openMatchReport(
  context: BrowserContext,
  game: { report_link: string }
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

