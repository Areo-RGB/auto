import type { Page } from "playwright";

export async function handlePrivacyPopup(page: Page): Promise<void> {
  try {
    const button = page.getByTestId("uc-accept-all-button");
    await button.waitFor({ state: "visible", timeout: 5000 });
    await button.click();
  } catch (err) {
    // popup not shown
  }
}

