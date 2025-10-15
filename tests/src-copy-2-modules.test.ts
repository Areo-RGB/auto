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

import * as api from "../src copy 2";
import {
  REFEREE_CSV_PATH,
  REFEREE_JSON_PATH,
} from "../src copy 2/constants/paths";

let originalRefereeJson: string | null = null;
let originalRefereeCsv: string | null = null;

beforeAll(() => {
  if (fs.existsSync(REFEREE_JSON_PATH)) {
    originalRefereeJson = fs.readFileSync(REFEREE_JSON_PATH, "utf-8");
  }
  if (fs.existsSync(REFEREE_CSV_PATH)) {
    originalRefereeCsv = fs.readFileSync(REFEREE_CSV_PATH, "utf-8");
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(() => {
  if (originalRefereeJson !== null) {
    fs.writeFileSync(REFEREE_JSON_PATH, originalRefereeJson, "utf-8");
  } else {
    fs.rmSync(REFEREE_JSON_PATH, { force: true });
  }
  if (originalRefereeCsv !== null) {
    fs.writeFileSync(REFEREE_CSV_PATH, originalRefereeCsv, "utf-8");
  } else {
    fs.rmSync(REFEREE_CSV_PATH, { force: true });
  }
});

describe("convertRefereeCsvToJson (modular)", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dfb-mod-tests-"));
  const csvPath = path.join(tempRoot, "referees.csv");
  const jsonPath = path.join(tempRoot, "referees.json");

  afterAll(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("converts CSV data into grouped JSON and persists to disk", () => {
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

    const groups = api.convertRefereeCsvToJson({
      csvPath,
      jsonPath,
      overwrite: true,
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]?.context).toMatchObject({
      Saison: "Saison25/26",
      Mannschaftsart: "MannschaftsartD-Junioren",
      Spielklasse: "SpielklasseKreisklasse C",
    });
    expect(groups[0]?.referees).toEqual([
      { Vorname: "Paul", Nachname: "Ziske" },
    ]);

    const persisted = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    expect(persisted).toEqual(groups);
  });
});

describe("ensureRefereeJson/loadRefereeGroups (modular)", () => {
  beforeEach(() => {
    fs.rmSync(REFEREE_JSON_PATH, { force: true });
    fs.rmSync(REFEREE_CSV_PATH, { force: true });
  });

  it("writes default grouped referees when no sources exist", () => {
    api.ensureRefereeJson();

    expect(fs.existsSync(REFEREE_JSON_PATH)).toBe(true);
    const groups = api.loadRefereeGroups();
    expect(Array.isArray(groups)).toBe(true);
    expect(groups).toHaveLength(1);
    const names = groups[0]?.referees.map((r) => r.Nachname);
    expect(names).toContain("Ziske");
    expect(names).toContain("Aschenbroich");
  });

  it("prefers CSV conversion when a referees.csv file is present", () => {
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
    fs.writeFileSync(REFEREE_CSV_PATH, csvContent, "utf-8");

    api.ensureRefereeJson();

    const groups = api.loadRefereeGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0]?.referees).toEqual([
      { Vorname: "Custom", Nachname: "Referee" },
    ]);
  });
});

describe("findRefereesForDetails (modular)", () => {
  it("returns name tuples for the target match context", () => {
    const customGroups = [
      {
        context: {
          Saison: "Saison25/26",
          Mannschaftsart: "MannschaftsartD-Junioren",
          Spielklasse: "SpielklasseKreisklasse C",
          Gebiet: "GebietKreis Berlin",
          Wettkampf: "WettkampfMeisterschaft",
          Staffel: "Staffelunt. D-Junioren Kreisklasse C St.1 Hin",
          Runde: "RundeRunde 1",
        },
        referees: [
          { Vorname: "Paula", Nachname: "Ziske" },
          { Vorname: "Gregor", Nachname: "Aschenbroich" },
        ],
      },
      {
        context: {
          Saison: "Saison23/24",
          Mannschaftsart: "MannschaftsartHerren",
          Spielklasse: "SpielklasseKreisliga A",
          Gebiet: "GebietKreis Munich",
          Wettkampf: "WettkampfFreundschaftsspiel",
          Staffel: "StaffelSomething Else",
          Runde: "Runde 2",
        },
        referees: [{ Vorname: "Other", Nachname: "Ref" }],
      },
    ];

    fs.writeFileSync(
      REFEREE_JSON_PATH,
      JSON.stringify(customGroups, null, 2),
      "utf-8"
    );

    const result = api.findRefereesForDetails();
    expect(result).toEqual([
      ["Paula", "Ziske"],
      ["Gregor", "Aschenbroich"],
    ]);
  });

  it("returns an empty array when no matching groups exist", () => {
    const noMatchGroups = [
      {
        context: {
          Saison: "Saison23/24",
          Mannschaftsart: "MannschaftsartHerren",
          Spielklasse: "SpielklasseKreisliga A",
          Gebiet: "GebietKreis Munich",
          Wettkampf: "WettkampfFreundschaftsspiel",
          Staffel: "StaffelSomething Else",
          Runde: "Runde 2",
        },
        referees: [{ Vorname: "Other", Nachname: "Ref" }],
      },
    ];
    fs.writeFileSync(
      REFEREE_JSON_PATH,
      JSON.stringify(noMatchGroups, null, 2),
      "utf-8"
    );

    const result = api.findRefereesForDetails();
    expect(result).toEqual([]);
  });
});

