import express from "express";

import {
  COMPETITION_TYPES,
  TEAM_CATEGORIES,
  ensureRefereeJson,
  filterGamesByTeam,
  openMatchReport,
  run,
  type RunOptions,
  type RunResult,
  type UpcomingGame,
} from "./navigation_to_spielsuche";

const PORT = Number(process.env.PORT ?? "3000");

ensureRefereeJson();

const app = express();
app.use(express.json());

let automation: RunResult | null = null;

function normalizeRunOptions(body: Record<string, unknown>): RunOptions {
  const competitionKeys = Array.isArray(body.competitionKeys)
    ? (body.competitionKeys.filter((value): value is string => typeof value === "string") as RunOptions["competitionKeys"])
    : [];

  return {
    headless: Boolean(body.headless ?? false),
    interactive: Boolean(body.interactive ?? false),
    teamCategoryKey:
      typeof body.teamCategoryKey === "string" && body.teamCategoryKey in TEAM_CATEGORIES
        ? (body.teamCategoryKey as RunOptions["teamCategoryKey"])
        : null,
    competitionKeys,
  };
}

function summarizeGames(list: UpcomingGame[]): Array<UpcomingGame & { index: number }> {
  return list.map((game, index) => ({ index, ...game }));
}

function buildHtml(): string {
  const categories = JSON.stringify(
    Object.entries(TEAM_CATEGORIES).map(([key, label]) => ({ key, label }))
  );
  const competitions = JSON.stringify(
    Object.entries(COMPETITION_TYPES).map(([key, label]) => ({ key, label }))
  );
  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <title>DFB Automation</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f6f7fb; color: #222; }
      header { background: #152238; color: #fff; padding: 1.5rem; }
      main { padding: 1.5rem; }
      section { background: #fff; border-radius: 8px; padding: 1rem 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
      h1, h2 { margin: 0 0 1rem 0; }
      form { display: grid; gap: 0.75rem; }
      label { font-weight: 600; display: flex; flex-direction: column; gap: 0.25rem; }
      input[type="text"], select { padding: 0.5rem; border-radius: 4px; border: 1px solid #d0d4dc; }
      button { padding: 0.6rem 1rem; border-radius: 4px; border: none; background: #316cf4; color: #fff; font-weight: 600; cursor: pointer; }
      button.secondary { background: #fff; color: #316cf4; border: 1px solid #316cf4; }
      button:disabled { opacity: 0.5; cursor: not-allowed; }
      table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.92rem; }
      th, td { border: 1px solid #e5e8f0; padding: 0.5rem; text-align: left; }
      th { background: #f0f3fa; }
      .status { margin-top: 1rem; font-family: monospace; white-space: pre-wrap; }
      .grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
      .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    </style>
  </head>
  <body>
    <header>
      <h1>DFB Automation Dashboard</h1>
      <p>Starte die Spielsuche, filtere Ergebnisse und öffne Spielberichte direkt aus dem Browser.</p>
    </header>
    <main>
      <section>
        <h2>Automation ausführen</h2>
        <form id="run-form">
          <div class="grid">
            <label>
              Teamkategorie
              <select id="team-category">
                <option value="">Keine Auswahl</option>
              </select>
            </label>
            <label>
              Wettkampftypen
              <select id="competition-types" multiple size="4"></select>
            </label>
            <label>
              <span>Headless (nur Suche)</span>
              <input type="checkbox" id="headless" />
            </label>
          </div>
          <div class="actions">
            <button type="submit">Automation starten</button>
            <button type="button" class="secondary" id="reset-btn">Automation stoppen</button>
          </div>
        </form>
        <div class="status" id="status-log"></div>
      </section>

      <section>
        <h2>Ergebnisse</h2>
        <div class="grid">
          <label>
            Team filtern
            <input type="text" id="team-filter" placeholder="Teamname (optional)" />
          </label>
          <div class="actions">
            <button type="button" id="apply-filter">Filter anwenden</button>
            <button type="button" class="secondary" id="clear-filter">Filter zurücksetzen</button>
          </div>
        </div>
        <div id="games-container"></div>
      </section>
    </main>
    <script type="module">
      const state = {
        games: [],
        filteredGames: [],
        selectedTeamCategory: null,
        selectedCompetitionKeys: []
      };

      const teamCategories = ${categories};
      const competitionTypes = ${competitions};

      const dom = {
        runForm: document.getElementById("run-form"),
        teamCategory: document.getElementById("team-category"),
        competitionTypes: document.getElementById("competition-types"),
        headless: document.getElementById("headless"),
        resetBtn: document.getElementById("reset-btn"),
        statusLog: document.getElementById("status-log"),
        teamFilter: document.getElementById("team-filter"),
        applyFilter: document.getElementById("apply-filter"),
        clearFilter: document.getElementById("clear-filter"),
        gamesContainer: document.getElementById("games-container")
      };

      function populateSelect(select, entries, options = {}) {
        const includeDefault = Boolean(options.includeDefault);
        select.innerHTML = "";
        if (includeDefault) {
          const defaultOption = document.createElement("option");
          defaultOption.value = "";
          defaultOption.textContent = "Keine Auswahl";
          if (!select.multiple) {
            defaultOption.selected = true;
          }
          select.appendChild(defaultOption);
        }
        for (const entry of entries) {
          const option = document.createElement("option");
          option.value = entry.key;
          option.textContent = entry.label;
          select.appendChild(option);
        }
      }

      function setStatus(message, isError = false) {
        dom.statusLog.textContent = message;
        dom.statusLog.style.color = isError ? "#c62828" : "#1b5e20";
      }

      function renderGames(list) {
        if (!list.length) {
          dom.gamesContainer.innerHTML = "<p>Keine Spiele gefunden. Bitte Automation ausführen.</p>";
          return;
        }
        const rows = list
          .map(
            (game) => \`
              <tr>
                <td>\${game.index}</td>
                <td>\${game.match_number}</td>
                <td>\${game.kickoff}</td>
                <td>\${game.matchday}</td>
                <td>\${game.home_team}</td>
                <td>\${game.away_team}</td>
                <td>\${game.result}</td>
                <td>\${game.status}</td>
                <td>
                  <button data-index="\${game.index}" class="open-match">Bericht öffnen</button>
                </td>
              </tr>
            \`
          )
          .join("");
        dom.gamesContainer.innerHTML = \`
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Spiel-ID</th>
                <th>Anstoß</th>
                <th>Spieltag</th>
                <th>Heim</th>
                <th>Auswärts</th>
                <th>Ergebnis</th>
                <th>Status</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>\${rows}</tbody>
          </table>
        \`;

        dom.gamesContainer.querySelectorAll(".open-match").forEach((button) => {
          button.addEventListener("click", async (event) => {
            const index = Number(event.currentTarget.dataset.index);
            await openMatch(index);
          });
        });
      }

      async function fetchState() {
        try {
          const response = await fetch("/api/state");
          if (!response.ok) {
            throw new Error("Status konnte nicht geladen werden");
          }
          const payload = await response.json();
          state.games = payload.games ?? [];
          state.filteredGames = state.games;
          renderGames(state.filteredGames);
          if (!payload.running) {
            setStatus("Automation ist inaktiv.");
          }
        } catch (error) {
          console.error(error);
          setStatus(error.message ?? "Unbekannter Fehler beim Laden des Status.", true);
        }
      }

      async function runAutomation(event) {
        event.preventDefault();
        const selectedCompetitions = Array.from(dom.competitionTypes.selectedOptions).map((option) => option.value);
        const payload = {
          teamCategoryKey: dom.teamCategory.value || null,
          competitionKeys: selectedCompetitions,
          headless: dom.headless.checked,
          interactive: false
        };
        try {
          const response = await fetch("/api/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (!response.ok) {
            throw new Error(await response.text());
          }
          const result = await response.json();
          state.games = result.games ?? [];
          state.filteredGames = state.games;
          renderGames(state.filteredGames);
          setStatus(\`Automation erfolgreich ausgeführt (\${state.games.length} Spiele gefunden).\`);
        } catch (error) {
          console.error(error);
          setStatus(error.message ?? "Automation konnte nicht gestartet werden.", true);
        }
      }

      async function resetAutomation() {
        try {
          const response = await fetch("/api/reset", { method: "POST" });
          if (!response.ok) {
            throw new Error(await response.text());
          }
          state.games = [];
          state.filteredGames = [];
          renderGames([]);
          setStatus("Automation wurde gestoppt.");
        } catch (error) {
          console.error(error);
          setStatus(error.message ?? "Automation konnte nicht gestoppt werden.", true);
        }
      }

      async function applyFilter() {
        const team = dom.teamFilter.value.trim();
        if (!team) {
          state.filteredGames = state.games;
          renderGames(state.filteredGames);
          return;
        }
        const response = await fetch("/api/filter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ team })
        });
        if (!response.ok) {
          setStatus("Filter konnte nicht angewendet werden.", true);
          return;
        }
        const result = await response.json();
        state.filteredGames = result.games ?? [];
        renderGames(state.filteredGames);
      }

      async function openMatch(index) {
        try {
          const response = await fetch("/api/open-match", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ index })
          });
          if (!response.ok) {
            throw new Error(await response.text());
          }
          const result = await response.json();
          const url = result.url ?? "Spielbericht geöffnet.";
          setStatus(\`Spielbericht geöffnet: \${url}\`);
        } catch (error) {
          console.error(error);
          setStatus(error.message ?? "Spielbericht konnte nicht geöffnet werden.", true);
        }
      }

      dom.runForm.addEventListener("submit", runAutomation);
      dom.resetBtn.addEventListener("click", resetAutomation);
      dom.applyFilter.addEventListener("click", applyFilter);
      dom.clearFilter.addEventListener("click", () => {
        dom.teamFilter.value = "";
        state.filteredGames = state.games;
        renderGames(state.filteredGames);
      });

      populateSelect(dom.teamCategory, teamCategories, { includeDefault: true });
      populateSelect(dom.competitionTypes, competitionTypes, { includeDefault: true });
      fetchState();
    </script>
  </body>
</html>`;
}

async function shutdownAutomation(): Promise<void> {
  if (!automation) {
    return;
  }
  await automation.browser.close().catch(() => {});
  automation = null;
}

app.post("/api/run", async (req, res) => {
  const options = normalizeRunOptions(req.body ?? {});
  try {
    await shutdownAutomation();
    automation = await run(options);
    res.json({
      success: true,
      games: summarizeGames(automation.upcomingGames),
      selectedTeamCategory: automation.selectedTeamCategory,
      selectedCompetitionKeys: automation.selectedCompetitionKeys,
    });
  } catch (error) {
    await shutdownAutomation();
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

app.get("/api/state", (_req, res) => {
  res.json({
    running: Boolean(automation),
    games: summarizeGames(automation?.upcomingGames ?? []),
    selectedTeamCategory: automation?.selectedTeamCategory ?? null,
    selectedCompetitionKeys: automation?.selectedCompetitionKeys ?? [],
  });
});

app.post("/api/filter", (req, res) => {
  if (!automation) {
    return res.status(409).json({ error: "Automation ist nicht aktiv." });
  }
  const team = typeof req.body?.team === "string" ? req.body.team.trim() : "";
  if (!team) {
    return res.json({ games: summarizeGames(automation.upcomingGames) });
  }
  const filtered = filterGamesByTeam(automation.upcomingGames, team);
  res.json({ games: summarizeGames(filtered) });
});

app.post("/api/open-match", async (req, res) => {
  if (!automation) {
    return res.status(409).json({ error: "Automation ist nicht aktiv." });
  }
  const index = Number(req.body?.index);
  if (!Number.isInteger(index) || index < 0 || index >= automation.upcomingGames.length) {
    return res.status(400).json({ error: "Ungültiger Spielindex." });
  }
  const game = automation.upcomingGames[index];
  if (!game) {
    return res.status(404).json({ error: "Spiel wurde nicht gefunden." });
  }
  try {
    const page = await openMatchReport(automation.context, game);
    res.json({ success: true, url: page.url() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

app.post("/api/reset", async (_req, res) => {
  await shutdownAutomation();
  res.json({ success: true });
});

app.get("/", (_req, res) => {
  res.type("html").send(buildHtml());
});

const server = app.listen(PORT, () => {
  console.log(`DFB automation UI available at http://localhost:${PORT}`);
});

const heartbeat = setInterval(() => {}, 60_000);

const terminate = async () => {
  await shutdownAutomation();
  clearInterval(heartbeat);
  server.close(() => process.exit(0));
};

process.on("SIGINT", terminate);
process.on("SIGTERM", terminate);
