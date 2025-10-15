import fs from "fs";
import os from "os";
import path from "path";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  COMPETITION_TYPES,
  DEFAULT_REFEREE_GROUPS,
  TEAM_CATEGORIES,
  convertRefereeCsvToJson,
  ensureRefereeJson,
  filterGamesByTeam,
  findRefereesForDetails,
  isCompetitionKey,
  isTeamCategoryKey,
  loadRefereeGroups,
  TARGET_MATCH_CONTEXT,
  type UpcomingGame,
} from "../src copy 4/navigation_to_spielsuche";

const projectRoot = path.resolve(__dirname, "..");
const refereeJsonPath = path.join(projectRoot, "referees.json");
const refereeCsvPath = path.join(projectRoot, "referees.csv");

let originalRefereeJson: string | null = null;
let originalRefereeCsv: string | null = null;

beforeAll(() => {
  if (fs.existsSync(refereeJsonPath)) {
    originalRefereeJson = fs.readFileSync(refereeJsonPath, "utf-8");
  }
  if (fs.existsSync(refereeCsvPath)) {
    originalRefereeCsv = fs.readFileSync(refereeCsvPath, "utf-8");
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(() => {
  if (originalRefereeJson !== null) {
    fs.writeFileSync(refereeJsonPath, originalRefereeJson, "utf-8");
  } else {
    fs.rmSync(refereeJsonPath, { force: true });
  }
  if (originalRefereeCsv !== null) {
    fs.writeFileSync(refereeCsvPath, originalRefereeCsv, "utf-8");
  } else {
    fs.rmSync(refereeCsvPath, { force: true });
  }
});

describe("convertRefereeCsvToJson (copy4)", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dfb-copy4-"));
  const csvPath = path.join(tempRoot, "referees.csv");
  const jsonPath = path.join(tempRoot, "referees.json");

  afterAll(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("groups referee records by shared match context", () => {
    const csvContent = [
      [
        "Saison",
        "Mannschaftsart",
        "Spielklasse",
        "Gebiet",
        "Wettkampf",
        "Staffel",
        "Runde",
        "Vorname",
        "Nachname",
      ].join(","),
      [
        "Saison25/26",
        '"MannschaftsartD-Junioren"',
        "SpielklasseKreisklasse C",
        "GebietKreis Berlin",
        "WettkampfMeisterschaft",
        '"Staffelunt. D-Junioren Kreisklasse C St.1 Hin"',
        "RundeRunde 1",
        "Paul",
        "Ziske",
      ].join(","),
    ].join("\n");

    fs.writeFileSync(csvPath, csvContent, "utf-8");

    const groups = convertRefereeCsvToJson({
      csvPath,
      jsonPath,
      overwrite: true,
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      context: TARGET_MATCH_CONTEXT,
      referees: [{ Vorname: "Paul", Nachname: "Ziske" }],
    });

    const persisted = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    expect(persisted).toEqual(groups);
  });
});

describe("ensureRefereeJson (copy4)", () => {
  beforeEach(() => {
    fs.rmSync(refereeJsonPath, { force: true });
    fs.rmSync(refereeCsvPath, { force: true });
  });

  it("writes the default referee groups when no files exist", () => {
    ensureRefereeJson();

    expect(fs.existsSync(refereeJsonPath)).toBe(true);
    const saved = JSON.parse(fs.readFileSync(refereeJsonPath, "utf-8"));
    expect(Array.isArray(saved)).toBe(true);
    expect(saved).toEqual(DEFAULT_REFEREE_GROUPS);
    const allReferees = saved.flatMap((group: any) => group?.referees ?? []);
    expect(allReferees.map((ref: any) => ref?.Nachname)).toEqual([
      "Ziske",
      "Aschenbroich",
    ]);
  });

  it("prefers converting an existing referees.csv file", () => {
    const csvContent = [
      [
        "Saison",
        "Mannschaftsart",
        "Spielklasse",
        "Gebiet",
        "Wettkampf",
        "Staffel",
        "Runde",
        "Vorname",
        "Nachname",
      ].join(","),
      [
        "Saison25/26",
        "MannschaftsartD-Junioren",
        "SpielklasseKreisklasse C",
        "GebietKreis Berlin",
        "WettkampfMeisterschaft",
        "Staffelunt. D-Junioren Kreisklasse C St.1 Hin",
        "RundeRunde 1",
        "Custom",
        "Referee",
      ].join(","),
    ].join("\n");
    fs.writeFileSync(refereeCsvPath, csvContent, "utf-8");

    ensureRefereeJson();

    const saved = JSON.parse(fs.readFileSync(refereeJsonPath, "utf-8"));
    expect(saved).toHaveLength(1);
    expect(saved[0].referees).toEqual([
      { Vorname: "Custom", Nachname: "Referee" },
    ]);
  });
});

describe("loadRefereeGroups (copy4)", () => {
  beforeEach(() => {
    fs.rmSync(refereeCsvPath, { force: true });
  });

  it("returns an empty array when the JSON file is empty", () => {
    fs.writeFileSync(refereeJsonPath, "", "utf-8");

    const groups = loadRefereeGroups();
    expect(groups).toEqual([]);
  });

  it("falls back to defaults when the JSON is malformed", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    fs.writeFileSync(refereeJsonPath, "{ invalid json", "utf-8");

    const groups = loadRefereeGroups();

    expect(warnSpy).toHaveBeenCalled();
    expect(groups).toEqual(DEFAULT_REFEREE_GROUPS);
  });
});

describe("findRefereesForDetails (copy4)", () => {
  it("returns referee name tuples for the target match context", () => {
    const groups = [
      {
        context: TARGET_MATCH_CONTEXT,
        referees: [
          { Vorname: "Paula", Nachname: "Ziske" },
          { Vorname: "Gregor", Nachname: "Aschenbroich" },
        ],
      },
      {
        context: { ...TARGET_MATCH_CONTEXT, Saison: "Other" },
        referees: [{ Vorname: "Other", Nachname: "Ref" }],
      },
    ];
    fs.writeFileSync(refereeJsonPath, JSON.stringify(groups, null, 2), "utf-8");

    const result = findRefereesForDetails();
    expect(result).toEqual([
      ["Paula", "Ziske"],
      ["Gregor", "Aschenbroich"],
    ]);
  });

  it("returns an empty array when no match context aligns", () => {
    const noMatches = [
      {
        context: { ...TARGET_MATCH_CONTEXT, Mannschaftsart: "Other" },
        referees: [{ Vorname: "Custom", Nachname: "Ref" }],
      },
    ];
    fs.writeFileSync(refereeJsonPath, JSON.stringify(noMatches, null, 2), "utf-8");

    const result = findRefereesForDetails();
    expect(result).toEqual([]);
  });
});

describe("filterGamesByTeam (copy4)", () => {
  const sampleGames: UpcomingGame[] = [
    {
      match_number: "1",
      kickoff: "01.01.2030",
      matchday: "1",
      home_team: "FC Hertha 03 A",
      away_team: "Opponent A",
      result: "",
      status: "geplant",
      report_link: "",
      report_link_text: "",
    },
    {
      match_number: "2",
      kickoff: "02.01.2030",
      matchday: "2",
      home_team: "Opponent B",
      away_team: "FC Hertha 03 A",
      result: "",
      status: "geplant",
      report_link: "",
      report_link_text: "",
    },
  ];

  it("returns games where the team appears as home or away", () => {
    const filtered = filterGamesByTeam(sampleGames, "FC Hertha 03 A");
    expect(filtered).toHaveLength(2);
  });

  it("returns an empty array when the team is absent", () => {
    const filtered = filterGamesByTeam(sampleGames, "Nonexistent");
    expect(filtered).toEqual([]);
  });
});

describe("type guards (copy4)", () => {
  it("accepts known competition keys", () => {
    for (const key of Object.keys(COMPETITION_TYPES)) {
      expect(isCompetitionKey(key)).toBe(true);
    }
    expect(isCompetitionKey("unknown")).toBe(false);
    expect(isCompetitionKey(123)).toBe(false);
  });

  it("accepts known team category keys", () => {
    for (const key of Object.keys(TEAM_CATEGORIES)) {
      expect(isTeamCategoryKey(key)).toBe(true);
    }
    expect(isTeamCategoryKey("unknown")).toBe(false);
    expect(isTeamCategoryKey(null)).toBe(false);
  });
});
