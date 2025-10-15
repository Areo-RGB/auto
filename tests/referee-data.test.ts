import fs from "fs";
import os from "os";
import path from "path";

import { describe, expect, it } from "vitest";

import {
  TARGET_MATCH_CONTEXT,
  convertRefereeCsvToJson,
  findRefereesForDetails,
  loadRefereeGroups,
  parseCsvLine,
  type RefereeGroup,
} from "../src copy 4/referee-data";

const HEADERS = [
  "Saison",
  "Mannschaftsart",
  "Spielklasse",
  "Gebiet",
  "Wettkampf",
  "Staffel",
  "Runde",
  "Vorname",
  "Nachname",
];

function createTempFile(name: string): string {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ref-data-")), name);
}

describe("referee-data utilities", () => {
  it("parses CSV lines with quoted commas", () => {
    const line = '"Doe, John",Club,"Quoted \"Value\""';
    expect(parseCsvLine(line)).toEqual([
      "Doe, John",
      "Club",
      'Quoted "Value"',
    ]);
  });

  it("converts CSV rows into grouped referee data", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ref-csv-"));
    const csvPath = path.join(tempDir, "referees.csv");
    const jsonPath = path.join(tempDir, "referees.json");

    const rows = [
      HEADERS.join(","),
      [
        TARGET_MATCH_CONTEXT.Saison,
        TARGET_MATCH_CONTEXT.Mannschaftsart,
        TARGET_MATCH_CONTEXT.Spielklasse,
        TARGET_MATCH_CONTEXT.Gebiet,
        TARGET_MATCH_CONTEXT.Wettkampf,
        TARGET_MATCH_CONTEXT.Staffel,
        TARGET_MATCH_CONTEXT.Runde,
        "Alex",
        "Muster",
      ].join(","),
      [
        TARGET_MATCH_CONTEXT.Saison,
        TARGET_MATCH_CONTEXT.Mannschaftsart,
        TARGET_MATCH_CONTEXT.Spielklasse,
        TARGET_MATCH_CONTEXT.Gebiet,
        TARGET_MATCH_CONTEXT.Wettkampf,
        TARGET_MATCH_CONTEXT.Staffel,
        TARGET_MATCH_CONTEXT.Runde,
        "Jamie",
        "Beispiel",
      ].join(","),
      [
        "Saison24/25",
        TARGET_MATCH_CONTEXT.Mannschaftsart,
        TARGET_MATCH_CONTEXT.Spielklasse,
        TARGET_MATCH_CONTEXT.Gebiet,
        TARGET_MATCH_CONTEXT.Wettkampf,
        TARGET_MATCH_CONTEXT.Staffel,
        TARGET_MATCH_CONTEXT.Runde,
        "Other",
        "Ref",
      ].join(","),
    ];

    fs.writeFileSync(csvPath, rows.join("\n"), "utf-8");

    const groups = convertRefereeCsvToJson({
      csvPath,
      jsonPath,
      overwrite: true,
    });

    expect(groups).toHaveLength(2);
    const primaryGroup = groups.find((group) =>
      group.referees.some((ref) => ref.Vorname === "Alex")
    ) as RefereeGroup | undefined;
    expect(primaryGroup).toBeDefined();
    expect(primaryGroup?.referees).toEqual([
      { Vorname: "Alex", Nachname: "Muster" },
      { Vorname: "Jamie", Nachname: "Beispiel" },
    ]);

    expect(fs.existsSync(jsonPath)).toBe(true);
  });

  it("falls back to default groups when JSON is invalid", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ref-json-"));
    const jsonPath = path.join(tempDir, "referees.json");
    fs.writeFileSync(jsonPath, "not-json", "utf-8");

    const groups = loadRefereeGroups(jsonPath);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.referees[0]?.Vorname).toBeDefined();
  });

  it("returns referees that match the target context", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ref-match-"));
    const jsonPath = path.join(tempDir, "referees.json");
    const group: RefereeGroup = {
      context: { ...TARGET_MATCH_CONTEXT },
      referees: [
        { Vorname: "Casey", Nachname: "One" },
        { Vorname: "Riley", Nachname: "Two" },
      ],
    };
    fs.writeFileSync(jsonPath, JSON.stringify([group], null, 2), "utf-8");

    const referees = findRefereesForDetails(TARGET_MATCH_CONTEXT, jsonPath);
    expect(referees).toEqual([
      ["Casey", "One"],
      ["Riley", "Two"],
    ]);
  });
});

