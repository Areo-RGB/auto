import fs from "fs";
import { REFEREE_CSV_PATH, REFEREE_JSON_PATH } from "../constants/paths";
import type {
  CsvConversionOptions,
  RefereeGroup,
  RefereeRecord,
} from "../types/dfb";
import { groupRefereeRecords } from "./store";

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current);
  return result;
}

export function convertRefereeCsvToJson(
  options: CsvConversionOptions = {}
): RefereeGroup[] {
  const {
    csvPath = REFEREE_CSV_PATH,
    jsonPath = REFEREE_JSON_PATH,
    overwrite = false,
  } = options;
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found at ${csvPath}`);
  }
  if (!overwrite && fs.existsSync(jsonPath)) {
    throw new Error(
      `JSON file already exists at ${jsonPath}. Pass { overwrite: true } to replace it.`
    );
  }
  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    fs.writeFileSync(jsonPath, JSON.stringify([], null, 2), "utf-8");
    return [];
  }

  const headers = parseCsvLine(lines[0]!);
  if (!headers.length) {
    throw new Error(`CSV header row at ${csvPath} is empty.`);
  }

  const records: RefereeRecord[] = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record: RefereeRecord = {};
    headers.forEach((key, idx) => {
      const value = values[idx] ?? "";
      record[key] = value;
    });
    return record;
  });
  const groups = groupRefereeRecords(records);
  fs.writeFileSync(jsonPath, JSON.stringify(groups, null, 2), "utf-8");
  return groups;
}

