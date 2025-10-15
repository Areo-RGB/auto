import type { Frame, Page } from "playwright";

export async function findFrameWithText(
  page: Page,
  text: string,
  timeoutMs = 5000
): Promise<Frame | null> {
  const step = 250;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    for (const frame of page.frames()) {
      try {
        const locator = frame.getByText(text);
        const count = await locator.count();
        if (count > 0) {
          return frame;
        }
      } catch (err) {
        // ignore
      }
    }
    await page.waitForTimeout(step);
  }
  return null;
}

