import { CONTEXT_KEYS } from "./catalogs";
import type { MatchContext, RefereeGroup } from "../types/dfb";

export const TARGET_MATCH_CONTEXT: MatchContext = {
  Saison: "Saison25/26",
  Mannschaftsart: "MannschaftsartD-Junioren",
  Spielklasse: "SpielklasseKreisklasse C",
  Gebiet: "GebietKreis Berlin",
  Wettkampf: "WettkampfMeisterschaft",
  Staffel: "Staffelunt. D-Junioren Kreisklasse C St.1 Hin",
  Runde: "RundeRunde 1",
};

export const DEFAULT_REFEREE_GROUPS: RefereeGroup[] = [
  {
    context: { ...TARGET_MATCH_CONTEXT },
    referees: [
      { Vorname: "Paul", Nachname: "Ziske" },
      { Vorname: "Gregor", Nachname: "Aschenbroich" },
    ],
  },
];

export const EXPECTED_DETAIL_TEXT = CONTEXT_KEYS.map(
  (key) => TARGET_MATCH_CONTEXT[key] ?? ""
).join("");
