/**
 * Direct parquet reader from local filesystem.
 * Reads warehouse-format data: DATA_DIR/{SYMBOL}/klines_1m/YYYY-MM.parquet
 *
 * Set WAREHOUSE_DATA_DIR env to use direct file reading (no warehouse server needed).
 */

import fs from "fs";
import path from "path";
import { parquetRead } from "hyparquet";
import { compressors } from "hyparquet-compressors";

export function getDataDir(): string | null {
  return process.env.WAREHOUSE_DATA_DIR || null;
}

/** List all symbols (top-level dirs in DATA_DIR) */
export function listSymbols(dataDir: string): string[] {
  if (!fs.existsSync(dataDir)) return [];
  const entries = fs.readdirSync(dataDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

/** List available monthly parquet files for a symbol */
function listMonthFiles(dataDir: string, symbol: string, start?: string, end?: string): string[] {
  const klinesDir = path.join(dataDir, symbol, "klines_1m");
  if (!fs.existsSync(klinesDir)) return [];

  let files = fs
    .readdirSync(klinesDir)
    .filter((f) => f.endsWith(".parquet"))
    .sort();

  // Filter by month range
  if (start) {
    const startMonth = start.slice(0, 7); // "YYYY-MM"
    files = files.filter((f) => f.replace(".parquet", "") >= startMonth);
  }
  if (end) {
    const endMonth = end.slice(0, 7);
    files = files.filter((f) => f.replace(".parquet", "") <= endMonth);
  }

  return files.map((f) => path.join(klinesDir, f));
}

/** Read parquet file and return rows with {timestamp, close} */
async function readParquetFile(
  filePath: string
): Promise<{ timestamp: number; close: number }[]> {
  const buffer = fs.readFileSync(filePath);
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );

  const rows: { timestamp: number; close: number }[] = [];

  await parquetRead({
    file: arrayBuffer,
    columns: ["timestamp", "close"],
    compressors,
    onComplete: (data: unknown[][]) => {
      for (const row of data) {
        rows.push({
          timestamp: row[0] as number,
          close: row[1] as number,
        });
      }
    },
  });

  return rows;
}

/** Load daily-resampled close prices for a symbol */
export async function loadDailyCloses(
  dataDir: string,
  symbol: string,
  start?: string,
  end?: string
): Promise<{ timestamp: string; close: number }[]> {
  const files = listMonthFiles(dataDir, symbol, start, end);
  if (files.length === 0) return [];

  // Read all relevant month files
  const allRows: { timestamp: number; close: number }[] = [];
  for (const file of files) {
    try {
      const rows = await readParquetFile(file);
      allRows.push(...rows);
    } catch {
      // skip corrupted files
    }
  }

  if (allRows.length === 0) return [];

  // Resample to daily (last close per day)
  const dayMap = new Map<string, { timestamp: string; close: number }>();
  for (const r of allRows) {
    const date = new Date(r.timestamp * 1000);
    const day = date.toISOString().slice(0, 10);

    // Filter by exact date range
    if (start && day < start) continue;
    if (end && day > end) continue;

    dayMap.set(day, { timestamp: day, close: r.close });
  }

  return [...dayMap.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
