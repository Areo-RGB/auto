import { ensureRefereeJson } from "../referees/store";
import type { BrowserContext } from "playwright";
import { run } from "./run";
import { askQuestion } from "../cli/prompts";

async function main(): Promise<void> {
  ensureRefereeJson();
  let context: BrowserContext | undefined;
  try {
    const result = await run({ headless: false });
    context = result.context;
    await askQuestion("Press Enter to close browser...");
  } catch (err) {
    console.error(err);
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
  }
}

if (require.main === module) {
  // Load env (optional)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("dotenv").config();
  } catch {}
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

