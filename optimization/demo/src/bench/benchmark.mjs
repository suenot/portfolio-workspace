/**
 * HRP Benchmark — measures data loading + optimization time vs number of assets
 * Uses temp Python script file for reliable parquet reading
 *
 * Usage: node src/bench/benchmark.mjs
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const DATA_DIR = process.env.WAREHOUSE_DATA_DIR
  || "/Users/suenot/projects/w_trading/w_trender/backtests/data";
const START = "2025-03-01";
const END = "2026-03-01";

// ── Read daily closes via temp Python script ──

function readDailyCloses(symbol) {
  const klinesDir = path.join(DATA_DIR, symbol, "klines_1m");
  if (!fs.existsSync(klinesDir)) return [];

  const startMonth = START.slice(0, 7);
  const endMonth = END.slice(0, 7);

  const files = fs.readdirSync(klinesDir)
    .filter((f) => f.endsWith(".parquet"))
    .filter((f) => { const m = f.replace(".parquet", ""); return m >= startMonth && m <= endMonth; })
    .sort()
    .map((f) => path.join(klinesDir, f));

  if (files.length === 0) return [];

  const tmpScript = path.join(os.tmpdir(), `hrp_bench_${process.pid}.py`);
  fs.writeFileSync(tmpScript, `
import pandas as pd, json, sys
frames = []
for f in ${JSON.stringify(files)}:
    try:
        df = pd.read_parquet(f, columns=['timestamp','close'])
        frames.append(df)
    except: pass
if not frames:
    print('[]')
    sys.exit()
df = pd.concat(frames)
df['day'] = pd.to_datetime(df['timestamp'].astype('int64'), unit='s').dt.strftime('%Y-%m-%d')
df = df[(df['day'] >= '${START}') & (df['day'] <= '${END}')]
daily = df.groupby('day')['close'].last().sort_index()
print(json.dumps(daily.tolist()))
`);

  try {
    const out = execSync(`python3 "${tmpScript}"`, { timeout: 60000, maxBuffer: 50 * 1024 * 1024 });
    return JSON.parse(out.toString().trim());
  } catch {
    return [];
  }
}

// ── HRP engine (inlined) ──

function computeLogReturns(prices) {
  return prices.map((p) => {
    const r = [];
    for (let i = 1; i < p.length; i++) r.push(Math.log(p[i] / p[i - 1]));
    return r;
  });
}

function covarianceMatrix(rets) {
  const n = rets.length, T = rets[0].length;
  const means = rets.map((r) => r.reduce((a, b) => a + b, 0) / T);
  const cov = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = i; j < n; j++) {
      let s = 0;
      for (let t = 0; t < T; t++) s += (rets[i][t] - means[i]) * (rets[j][t] - means[j]);
      cov[i][j] = cov[j][i] = s / (T - 1);
    }
  return cov;
}

function correlationMatrix(cov) {
  const n = cov.length;
  const stds = cov.map((_, i) => Math.sqrt(cov[i][i]));
  return cov.map((row, i) => row.map((v, j) => stds[i] && stds[j] ? v / (stds[i] * stds[j]) : 0));
}

function distanceMatrix(corr) {
  return corr.map((row) => row.map((rho) => Math.sqrt((1 - rho) / 2)));
}

function averageLinkage(dist) {
  const n = dist.length, Z = [], active = new Set();
  for (let i = 0; i < n; i++) active.add(i);
  const sizes = new Array(2 * n).fill(1);
  const D = dist.map((r) => [...r]);
  for (let step = 0; step < n - 1; step++) {
    let minD = Infinity, mi = -1, mj = -1;
    const ids = [...active];
    for (let a = 0; a < ids.length; a++)
      for (let b = a + 1; b < ids.length; b++)
        if (D[ids[a]][ids[b]] < minD) { minD = D[ids[a]][ids[b]]; mi = ids[a]; mj = ids[b]; }
    const newId = n + step;
    sizes[newId] = sizes[mi] + sizes[mj];
    Z.push({ i: mi, j: mj, dist: minD, size: sizes[newId] });
    while (D.length <= newId) D.push(new Array(D[0]?.length || 0).fill(Infinity));
    for (let r = 0; r < D.length; r++) while (D[r].length <= newId) D[r].push(Infinity);
    for (const k of active) {
      if (k === mi || k === mj) continue;
      const nd = (D[mi][k] * sizes[mi] + D[mj][k] * sizes[mj]) / sizes[newId];
      D[newId][k] = nd; D[k][newId] = nd;
    }
    D[newId][newId] = 0;
    active.delete(mi); active.delete(mj); active.add(newId);
  }
  return Z;
}

function getLeafOrder(Z, n) {
  const order = [];
  function traverse(node) { if (node < n) { order.push(node); return; } const row = Z[node - n]; traverse(row.i); traverse(row.j); }
  traverse(n + Z.length - 1);
  return order;
}

function hrpWeights(covQ, n) {
  const w = new Array(n).fill(1);
  function cv(idx) { let v = 0; for (const i of idx) for (const j of idx) v += covQ[i][j]; return v / (idx.length ** 2); }
  function bisect(idx) {
    if (idx.length <= 1) return;
    const mid = Math.floor(idx.length / 2), left = idx.slice(0, mid), right = idx.slice(mid);
    const vL = cv(left), vR = cv(right), alpha = 1 / vL / (1 / vL + 1 / vR);
    for (const i of left) w[i] *= alpha;
    for (const i of right) w[i] *= 1 - alpha;
    bisect(left); bisect(right);
  }
  bisect(Array.from({ length: n }, (_, i) => i));
  const sum = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / sum);
}

function runFullHRP(priceArrays) {
  const minLen = Math.min(...priceArrays.map((p) => p.length));
  const aligned = priceArrays.map((p) => p.slice(p.length - minLen));
  const rets = computeLogReturns(aligned);
  const cov = covarianceMatrix(rets);
  const corr = correlationMatrix(cov);
  const dist = distanceMatrix(corr);
  const Z = averageLinkage(dist);
  const order = getLeafOrder(Z, priceArrays.length);
  const n = order.length;
  const covQ = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => cov[order[i]][order[j]]));
  return hrpWeights(covQ, n);
}

// ── Main ──

function listSymbols() {
  return fs.readdirSync(DATA_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .filter((s) => fs.existsSync(path.join(DATA_DIR, s, "klines_1m")))
    .sort();
}

const allSymbols = listSymbols();
const shuffled = [...allSymbols].sort(() => Math.random() - 0.5);

console.log("╔══════════════════════════════════════════════════════════╗");
console.log("║           HRP Portfolio Optimization Benchmark          ║");
console.log("╚══════════════════════════════════════════════════════════╝");
console.log(`  Data: ${DATA_DIR}`);
console.log(`  Period: ${START} → ${END}`);
console.log(`  Symbols available: ${allSymbols.length}\n`);

const header =
  "  " + "N".padStart(4) + " │ " + "OK".padStart(4) + " │ " +
  "Days".padStart(5) + " │ " + "Load".padStart(8) + " │ " +
  "HRP".padStart(10) + " │ " + "Total".padStart(8);
console.log(header);
console.log("  " + "─".repeat(52));

const sizes = [5, 10, 15, 20, 30, 50, 75, 100, 150, 200];
const results = [];

for (const n of sizes) {
  if (n > shuffled.length) break;
  const subset = shuffled.slice(0, n);

  const t0 = performance.now();
  const arrays = [];
  for (const s of subset) {
    const c = readDailyCloses(s);
    if (c.length > 10) arrays.push(c);
  }
  const tLoad = performance.now() - t0;

  let tHRP = 0, days = arrays[0]?.length || 0;
  if (arrays.length >= 3) {
    const t1 = performance.now();
    runFullHRP(arrays);
    tHRP = performance.now() - t1;
  }

  const r = { n, loaded: arrays.length, days, tLoad, tHRP, tTotal: tLoad + tHRP };
  results.push(r);

  console.log(
    "  " + String(r.n).padStart(4) + " │ " + String(r.loaded).padStart(4) + " │ " +
    String(r.days).padStart(5) + " │ " + (r.tLoad / 1000).toFixed(2).padStart(7) + "s │ " +
    r.tHRP.toFixed(1).padStart(8) + "ms │ " + (r.tTotal / 1000).toFixed(2).padStart(7) + "s"
  );
}

console.log("\n  " + "═".repeat(52));
console.log("\n  📊 Scaling:\n");
for (const r of results) {
  const loadBar = "░".repeat(Math.max(1, Math.round(r.tLoad / 2000)));
  const hrpBar = "█".repeat(Math.max(0, Math.round(r.tHRP / 100)));
  console.log(
    `  ${String(r.n).padStart(4)} assets │ load ${loadBar} ${(r.tLoad / 1000).toFixed(1)}s │ HRP ${hrpBar || "·"} ${r.tHRP.toFixed(0)}ms`
  );
}
console.log("\n  ℹ  HRP = O(n³) linkage. Load = O(n) × parquet I/O.");
