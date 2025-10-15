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
import * as navigation from "../src/navigation_to_spielsuche";

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

describe("convertRefereeCsvToJson", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dfb-tests-"));
  const csvPath = path.join(tempRoot, "referees.csv");
  const jsonPath = path.join(tempRoot, "referees.json");

  afterAll(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("converts CSV data into JSON records and persists to disk", () => {
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
        "\"MannschaftsartD-Junioren\"",
        "SpielklasseKreisklasse C",
        "GebietKreis Berlin",
        "WettkampfMeisterschaft",
        "\"Staffelunt. D-Junioren Kreisklasse C St.1 Hin\"",
        "RundeRunde 1",
        "Paul",
        "Ziske",
      ].join(","),
    ].join("\n");

    fs.writeFileSync(csvPath, csvContent, "utf-8");

    const records = navigation.convertRefereeCsvToJson({
      csvPath,
      jsonPath,
      overwrite: true,
    });

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      context: {
        Saison: "Saison25/26",
        Mannschaftsart: "MannschaftsartD-Junioren",
        Spielklasse: "SpielklasseKreisklasse C",
        Gebiet: "GebietKreis Berlin",
        Wettkampf: "WettkampfMeisterschaft",
        Staffel: "Staffelunt. D-Junioren Kreisklasse C St.1 Hin",
        Runde: "RundeRunde 1",
      },
      referees: [{ Vorname: "Paul", Nachname: "Ziske" }],
    });

    const persisted = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    expect(persisted).toEqual(records);
  });
});

describe("ensureRefereeJson", () => {
  beforeEach(() => {
    fs.rmSync(refereeJsonPath, { force: true });
    fs.rmSync(refereeCsvPath, { force: true });
  });

  it("writes default referee entries when no sources exist", () => {
    navigation.ensureRefereeJson();

    expect(fs.existsSync(refereeJsonPath)).toBe(true);
    const records = JSON.parse(fs.readFileSync(refereeJsonPath, "utf-8"));
    expect(Array.isArray(records)).toBe(true);
    expect(records).toHaveLength(1);
    const referees = records[0].referees ?? [];
    const surnames = referees.map((entry: any) => entry?.Nachname);
    expect(surnames).toContain("Ziske");
    expect(surnames).toContain("Aschenbroich");
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
    fs.writeFileSync(refereeCsvPath, csvContent, "utf-8");

    navigation.ensureRefereeJson();

    const records = JSON.parse(fs.readFileSync(refereeJsonPath, "utf-8"));
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      referees: [{ Vorname: "Custom", Nachname: "Referee" }],
    });
  });
});

describe("loadRefereeGroups", () => {
  beforeEach(() => {
    fs.rmSync(refereeCsvPath, { force: true });
  });

  it("returns an empty array when the saved JSON is empty", () => {
    fs.writeFileSync(refereeJsonPath, "", "utf-8");

    const records = navigation.loadRefereeGroups();
    expect(records).toEqual([]);
  });

  it("falls back to default entries when the JSON is invalid", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    fs.writeFileSync(refereeJsonPath, "{ invalid json", "utf-8");

    const records = navigation.loadRefereeGroups();

    expect(warnSpy).toHaveBeenCalled();
    expect(records).toHaveLength(1);
    const lastNames = records[0].referees.map((entry: any) => entry?.Nachname);
    expect(lastNames).toContain("Ziske");
    expect(lastNames).toContain("Aschenbroich");
  });
});

describe("findRefereesForDetails", () => {
  it("returns referee name tuples for the expected match context", () => {
    const records = [
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
    fs.writeFileSync(refereeJsonPath, JSON.stringify(records, null, 2), "utf-8");

    const result = navigation.findRefereesForDetails();
    expect(result).toEqual([
      ["Paula", "Ziske"],
      ["Gregor", "Aschenbroich"],
    ]);
  });

  it("returns an empty array when no matching referees exist", () => {
    const noMatches = [
      {
        context: {
          Saison: "Saison23/24",
          Mannschaftsart: "MannschaftsartHerren",
          Spielklasse: "",
          Gebiet: "",
          Wettkampf: "",
          Staffel: "",
          Runde: "",
        },
        referees: [{ Vorname: "Other", Nachname: "Ref" }],
      },
    ];
    fs.writeFileSync(refereeJsonPath, JSON.stringify(noMatches, null, 2), "utf-8");

    const result = navigation.findRefereesForDetails();
    expect(result).toEqual([]);
  });
});
