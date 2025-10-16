export const CONTEXT_KEYS = [
  "Saison",
  "Mannschaftsart",
  "Spielklasse",
  "Gebiet",
  "Wettkampf",
  "Staffel",
  "Runde",
] as const;

export const CONTEXT_KEY_SEPARATOR = "::";

export const COMPETITION_TYPES = {
  meisterschaft: "Meisterschaft",
  spielnachmittag: "Spielnachmittag",
  pokal: "Pokal",
  turnier: "Turnier",
  freundschaftsspiel: "Freundschaftsspiel",
  futsal: "Futsal-Ligabetrieb",
  hallenturnier: "Hallenturnier",
  beachsoccer: "Beachsoccer-Meisterschaft",
  auswahlspiel: "Auswahlspiel",
  auswahl_freundschaftsspiel: "Auswahl-Freundschaftsspiel",
  auswahlturnier: "Auswahlturnier",
  auswahl_trainingsspiel: "Auswahl-Trainingsspiel",
} as const;

export const TEAM_CATEGORIES = {
  herren_u70: "Herren Ü70",
  herren_u60: "Herren Ü60",
  herren_u60_freizeit: "Herren Ü60 Freizeit/Betrieb",
  herren_u50: "Herren Ü50",
  herren_u50_freizeit: "Herren Ü50 Freizeit/Betrieb",
  herren_u40: "Herren Ü40",
  herren_u40_11er: "Herren Ü40 (11er)",
  herren_u40_freizeit: "Herren Ü40 Freizeit/Betrieb",
  herren_u32: "Herren Ü32",
  herren_u32_freizeit: "Herren Ü32 Freizeit/Betrieb",
  herren: "Herren",
  herren_freizeit: "Herren Freizeit/Betrieb",
  herren_handicap: "Herren Handicap-Fußball",
  a_junioren: "A-Junioren",
  b_junioren: "B-Junioren",
  c_junioren: "C-Junioren",
  d_junioren: "D-Junioren",
  e_junioren: "E-Junioren",
  f_junioren: "F-Junioren",
  g_junioren: "G-Junioren",
  frauen_u32: "Frauen Ü32",
  frauen: "Frauen",
  a_juniorinnen: "A-Juniorinnen",
  b_juniorinnen: "B-Juniorinnen",
  c_juniorinnen: "C-Juniorinnen",
  d_juniorinnen: "D-Juniorinnen",
  e_juniorinnen: "E-Juniorinnen",
  f_juniorinnen: "F-Juniorinnen",
  g_juniorinnen: "G-Juniorinnen",
  freizeitsport: "Freizeitsport",
} as const;

export const TEAM_FILTER_PREFIX = "FC Hertha 03";
