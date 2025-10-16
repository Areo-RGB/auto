import type { Page } from "playwright";

import { handlePrivacyPopup } from "../browser/privacy";

export async function login(
  page: Page,
  username: string,
  password: string
): Promise<void> {
  await handlePrivacyPopup(page);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await handlePrivacyPopup(page);
  await page.getByRole("link", { name: "Anmelden" }).nth(1).click();
  await handlePrivacyPopup(page);
  await page.getByRole("textbox", { name: "Benutzerkennung" }).click();
  await page.getByRole("textbox", { name: "Benutzerkennung" }).fill(username);
  await page.getByRole("textbox", { name: "Benutzerkennung" }).press("Tab");
  await page.getByRole("textbox", { name: "Passwort" }).click();
  await page.getByRole("textbox", { name: "Passwort" }).fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await handlePrivacyPopup(page);
}
