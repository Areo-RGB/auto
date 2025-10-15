import type { Page } from "playwright";

export async function login(
  page: Page,
  username: string,
  password: string
): Promise<void> {
  await page.getByTestId("uc-accept-all-button").click();
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.getByTestId("uc-accept-all-button").click();
  await page.getByRole("link", { name: "Anmelden" }).nth(1).click();
  await page.getByRole("textbox", { name: "Benutzerkennung" }).click();
  await page.getByRole("textbox", { name: "Benutzerkennung" }).fill(username);
  await page.getByRole("textbox", { name: "Benutzerkennung" }).press("Tab");
  await page.getByRole("textbox", { name: "Passwort" }).click();
  await page.getByRole("textbox", { name: "Passwort" }).fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
}

export async function navigateToSpielsuche(page: Page): Promise<void> {
  await page.goto(
    "https://www.dfbnet.org/spielplus/mod_sbo/webflow.do?event=START&dmg_menu=102"
  );
}

