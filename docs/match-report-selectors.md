# Match-Report Selectors

Playwright-friendly locators for the new DFB match-report UI, derived from the snapshots you supplied. All selectors rely on ARIA roles/names to stay resilient against markup changes. Adjust the team-specific text patterns as needed for other fixtures.

## Spielverlauf Tab

- **Root container**: `page.locator("mr-root")` — main wrapper for all match-report tabs.
- **Navigation tabs**: `page.locator("mr-root nav").getByRole("button", { name: "Spielverlauf" })` — switch between Info / Mannschaften / Spielverlauf.
- **Header line (metadata)**: `page.locator("mr-root").getByText(/\d+\s\|\s\d{2}\.\d{2}\.\d{4},\s\d{2}:\d{2}\s\|/)`.
- **Home team heading**: `page.locator("mr-root").getByRole("heading", { level: 4, name: /FC Hertha \d+ IV/ })` (same pattern for away side).
- **Spielleitung section**: `page.locator("mr-root").getByRole("heading", { level: 3, name: "Spielleitung" }).locator("xpath=following-sibling::section[1]")`.
  - Individual dropdowns: `page.locator("mr-root").getByRole("combobox", { name: /Schiedsrichter \uf069/i })` (glyph `` = `\uf069`).
- **Ergebnis select**: `page.locator("mr-root").getByRole("combobox", { name: "Spielergebnis \uf069" })`.
- **Spielzeit inputs**: `page.locator("mr-root").getByRole("textbox", { name: "Beginn\uf069" })` and `{ name: "Ende\uf069" }`.
- **Bemerkungen textarea**: `page.locator("mr-root").getByRole("textbox", { name: "Sonstige Bemerkungen" })`.
- **Accordion sections (Strafen, Torschützen, Vorkommnisse, …)**: `page.locator("mr-root").getByRole("heading", { level: 3, name: /Torschützen|Strafen|Vorkommnisse/ })` with the content inside `.locator("xpath=following-sibling::section[1]")`.
- **Vorkommnisse checkboxes**: e.g. `page.locator("mr-root").getByRole("checkbox", { name: "Gewalthandlung" })` / `"Diskriminierung"` / `"Spielabbruch als Folge der Vorkommnisse"`.
- **Vorkommnisse matrix**: `page.locator("mr-root").getByRole("table").filter({ hasText: "Beschuldigte Geschädigte" })`; rows via `getByRole("row", { name: /Spieler\*innen/ })` and cells via `.locator("input[type='checkbox']")`.
- **Support links**: `page.locator("mr-root").getByRole("link", { name: "hier" })` and `"Anlaufstelle für Gewalt- und Diskriminierungsvorfälle"`.
- **Blocking banner**: `page.locator("mr-root").getByRole("heading", { level: 4, name: "Bearbeitung nicht möglich" })`; related paragraphs with `.locator("xpath=following-sibling::p")`.
- **Print button**: `page.locator("mr-root").getByRole("button", { name: /Drucken/ })` (expanded state indicates toggle).

## Mannschaften Tab

- **Team card toggle**: `page.locator("mr-team-info").filter({ hasText: /FC Hertha 03 IV D-Junioren\|/ }).getByRole("img")` — click to expand.
- **Roster load button**: `page.getByText("Laden", { exact: true })` (shows current match roster).
- **Compact view**: `page.locator("mr-root").getByRole("checkbox", { name: "kompakte Ansicht" })`.
- **Hide officials**: `page.locator("mr-root").getByRole("checkbox", { name: "Teamoffizielle nicht veröffentlichen" })`.
- **Team officials area**: `page.locator("mr-root").getByText("Gemeldete Teamoffizielle", { exact: false })` (cards follow inside `mr-team-official` elements).
- **Starting lineup player cards**: `page.locator("mr-root").locator("mr-lineup-player").filter({ hasText: /Startaufstellung/ })`; individual players matched via `getByText(/Nachname, Vorname/)`.
- **Bench players**: `page.locator("mr-root").getByText("Ersatzbank", { exact: false }).locator("xpath=following-sibling::mr-lineup-player")`.
- **Jersey number spinbutton**: `page.locator("mr-root").getByRole("spinbutton", { name: "Rückennummer" })` (often adjacent to each player card).
- **Action buttons**: `page.locator("mr-root").getByRole("button", { name: "Speichern" })`, `"Freigeben"`, `"Bearbeitung abbrechen"`, and `"Drucken "`.

Use these as building blocks in your Playwright flows to interact with the match report without relying on brittle CSS class names.*** End Patch
