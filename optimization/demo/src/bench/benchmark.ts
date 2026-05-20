/**
 * HRP Benchmark — measures data loading + optimization time vs number of assets
 *
 * Usage: npx tsx src/bench/benchmark.ts
 */

import fs from "fs";
import path from "path";
import { parquetRead } from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { runHRP } from "../lib/hrp";

const DATA_DIR = process.env.WAREHOUSE_DATA_DIR
  || "/Users/suenot/projects/w_trading/w_trender/backtests/data";
const START = "2025-03-01";
const END = "2026-03-01";

// ── Read parquet daily closes (same logic as local-data.ts) ──

async function readDailyCloses(symbol: string): Promise<number[]> {
  const klinesDir = path.join(DATA_DIR, symbol, "klines_1m");
  if (!fs.existsSync(klinesDir)) return [];

  const startMonth = START.slice(0, 7);
  const endMonth = END.slice(0, 7);

  const files = fs.readdirSync(klinesDir)
    .filter((f) => f.endsWith(".parquet"))
    .filter((f) => {
      const m = f.replace(".parquet", "");
      return m >= startMonth && m <= endMonth;
    })
    .sort()
    .map((f) => path.join(klinesDir, f));

  if (files.length === 0) return [];

  const dayMap = new Map<string, number>();

  for (const file of files) {
    const buffer = fs.readFileSync(file);
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    await parquetRead({
      file: ab,
      columns: ["timestamp", "close"],
      compressors,
      onComplete: (data: unknown[][]) => {
        for (const row of data) {
          const ts = row[0] as number;
          const close = row[1] as number;
          const day = new Date(ts * 1000).toISOString().slice(0, 10);
          if (day >= START && day <= END) {
            dayMap.set(day, close);
          }
        }
      },
    });
  }

  return [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, c]) => c);
}

// ── Discover available symbols ──

function listSymbols(): string[] {
  return fs.readdirSync(DATA_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .filter((s) => {
      const kd = path.join(DATA_DIR, s, "klines_1m");
      return fs.existsSync(kd);
    })
    .sort();
}

// ── Benchmark runner ──

async function bench(n: number, symbols: string[]) {
  const subset = symbols.slice(0, n);

  // 1. Data loading
  const t0 = performance.now();
  const prices: Record<string, number[]> = {};
  await Promise.all(
    subset.map(async (s) => {
      const closes = await readDailyCloses(s);
      if (closes.length > 10) prices[s] = closes;
    })
  );
  const tLoad = performance.now() - t0;

  const loaded = Object.keys(prices).length;
  if (loaded < 3) {
    return { n, loaded, tLoad, tHRP: 0, tTotal: tLoad, days: 0 };
  }

  // 2. HRP optimization
  const t1 = performance.now();
  const result = runHRP(prices, Object.keys(prices));
  const tHRP = performance.now() - t1;

  const days = Object.values(prices)[0]?.length || 0;
  return { n, loaded, tLoad, tHRP, tTotal: tLoad + tHRP, days };
}

async function main() {
  console.log("HRP Benchmark");
  console.log(`Data dir: ${DATA_DIR}`);
  console.log(`Period: ${START} → ${END}`);
  console.log("─".repeat(80));

  const allSymbols = listSymbols();
  console.log(`Available symbols with klines_1m: ${allSymbols.length}\n`);

  // Shuffle for diversity
  const shuffled = [...allSymbols].sort(() => Math.random() - 0.5);

  const sizes = [5, 10, 15, 20, 30, 50, 75, 100, 150, 200];
  const results: typeof bench extends (...a: unknown[]) => Promise<infer R> ? R[] : never[] = [];

  console.log(
    "N".padStart(4) + " | " +
    "Loaded".padStart(6) + " | " +
    "Days".padStart(5) + " | " +
    "Load (s)".padStart(9) + " | " +
    "HRP (s)".padStart(9) + " | " +
    "Total (s)".padStart(10)
  );
  console.log("─".repeat(55));

  for (const n of sizes) {
    if (n > shuffled.length) break;
    const r = await bench(n, shuffled);
    results.push(r);

    console.log(
      String(r.n).padStart(4) + " | " +
      String(r.loaded).padStart(6) + " | " +
      String(r.days).padStart(5) + " | " +
      (r.tLoad / 1000).toFixed(2).padStart(9) + " | " +
      (r.tHRP / 1000).toFixed(3).padStart(9) + " | " +
      (r.tTotal / 1000).toFixed(2).padStart(10)
    );
  }

  console.log("\n─".repeat(80));
  console.log("\nSummary:");
  for (const r of results) {
    const bar = "█".repeat(Math.round(r.tTotal / 500));
    console.log(
      `  ${String(r.n).padStart(3)} assets → ${(r.tTotal / 1000).toFixed(2)}s total ` +
      `(load: ${(r.tLoad / 1000).toFixed(2)}s, HRP: ${(r.tHRP * 1000).toFixed(0)}ms) ${bar}`
    );
  }
}

main().catch(console.error);
