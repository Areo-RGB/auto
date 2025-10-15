import express from "express";
import path from "path";
import {
  COMPETITION_TYPES,
  TEAM_CATEGORIES,
  ensureRefereeJson,
  filterGamesByTeam,
  isCompetitionKey,
  isTeamCategoryKey,
  openMatchReport,
  run,
  type CompetitionKey,
  type RunResult,
  type TeamCategoryKey,
  type UpcomingGame,
} from "./navigation_to_spielsuche";

const PORT = Number(process.env.PORT ?? "3000");
const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");

ensureRefereeJson();

const app = express();
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

let automation: RunResult | null = null;
let games: UpcomingGame[] = [];

function uniqueTeams(list: UpcomingGame[]): string[] {
  const teams = new Set<string>();
  for (const game of list) {
    if (game.home_team) teams.add(game.home_team);
    if (game.away_team) teams.add(game.away_team);
  }
  return Array.from(teams).sort((a, b) => a.localeCompare(b));
}

async function closeAutomation(): Promise<void> {
  if (!automation) {
    return;
  }
  await automation.browser.close().catch(() => {});
  automation = null;
  games = [];
}

app.get("/api/options", (_req, res) => {
  res.json({
    teamCategories: Object.entries(TEAM_CATEGORIES).map(([key, label]) => ({
      key,
      label,
    })),
    competitionTypes: Object.entries(COMPETITION_TYPES).map(([key, label]) => ({
      key,
      label,
    })),
  });
});

app.get("/api/games", (_req, res) => {
  res.json({
    games: games.map((game, index) => ({ index, ...game })),
    teams: uniqueTeams(games),
  });
});

app.post("/api/run", async (req, res) => {
  const body = req.body ?? {};
  const rawTeamCategory = body.teamCategoryKey;
  const rawCompetitionKeys = Array.isArray(body.competitionKeys)
    ? body.competitionKeys
    : [];
  const teamCategoryKey = isTeamCategoryKey(rawTeamCategory)
    ? rawTeamCategory
    : null;
  const competitionKeys = rawCompetitionKeys.filter(isCompetitionKey) as CompetitionKey[];

  const headless = Boolean(body.headless ?? false);

  try {
    await closeAutomation();
    const result = await run({
      headless,
      interactive: false,
      teamCategoryKey,
      competitionKeys,
    });
    automation = result;
    games = result.upcomingGames;

    res.json({
      games: games.map((game, index) => ({ index, ...game })),
      teams: uniqueTeams(games),
      selectedTeamCategory: result.selectedTeamCategory,
      selectedCompetitionKeys: result.selectedCompetitionKeys,
    });
  } catch (err) {
    await closeAutomation();
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

app.post("/api/filter", (req, res) => {
  const body = req.body ?? {};
  const team = typeof body.team === "string" && body.team.trim().length > 0 ? body.team.trim() : null;
  if (!team) {
    return res.json({
      games: games.map((game, index) => ({ index, ...game })),
    });
  }
  const filtered = filterGamesByTeam(games, team);
  res.json({
    games: filtered.map((game) => ({
      index: games.indexOf(game),
      ...game,
    })),
  });
});

app.post("/api/open-match", async (req, res) => {
  if (!automation) {
    return res.status(409).json({ error: "Automation session not active. Run the search first." });
  }
  const matchIndex = Number(req.body?.index);
  if (!Number.isInteger(matchIndex) || matchIndex < 0 || matchIndex >= games.length) {
    return res.status(400).json({ error: "Invalid match index." });
  }

  const game = games[matchIndex]!;
  try {
    const page = await openMatchReport(automation.context, game);
    res.json({
      success: true,
      url: page.url(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

app.post("/api/add-referees", async (req, res) => {
  if (!automation) {
    return res.status(409).json({ error: "Automation session not active. Run the search first." });
  }
  const team = typeof req.body?.team === "string" ? req.body.team.trim() : "";
  if (!team) {
    return res.status(400).json({ error: "Team name is required." });
  }
  const targetGames = filterGamesByTeam(games, team);
  if (targetGames.length === 0) {
    return res.status(404).json({ error: `No games found for team '${team}'.` });
  }

  const failures: { index: number; message: string }[] = [];
  let successCount = 0;
  for (const game of targetGames) {
    try {
      const page = await openMatchReport(automation.context, game);
      await page.close().catch(() => {});
      successCount += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failures.push({ index: games.indexOf(game), message });
    }
  }

  res.json({
    team,
    processed: targetGames.length,
    successCount,
    failureCount: failures.length,
    failures,
  });
});

app.post("/api/close", async (_req, res) => {
  await closeAutomation();
  res.json({ success: true });
});

app.use((_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

const server = app.listen(PORT, () => {
  console.log(`DFB automation UI available at http://localhost:${PORT}`);
});

const shutdown = async () => {
  await closeAutomation();
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
