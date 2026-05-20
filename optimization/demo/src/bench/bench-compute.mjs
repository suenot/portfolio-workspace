/**
 * HRP Pure Computation Benchmark — synthetic data, no I/O
 * Tests HRP algorithm scaling from 10 to 10000 assets
 *
 * Usage: node src/bench/bench-compute.mjs
 */

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
  return corr.map((row) => row.map((rho) => Math.sqrt(Math.max(0, (1 - rho) / 2))));
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
  // Iterative to avoid stack overflow for large n
  const stack = [n + Z.length - 1];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node < n) { order.push(node); continue; }
    const row = Z[node - n];
    stack.push(row.j); // push j first so i is processed first (stack is LIFO)
    stack.push(row.i);
  }
  return order;
}

function hrpWeights(covQ, n) {
  const w = new Array(n).fill(1);
  function cv(idx) { let v = 0; for (const i of idx) for (const j of idx) v += covQ[i][j]; return v / (idx.length ** 2); }
  // Iterative bisection to avoid stack overflow
  const queue = [Array.from({ length: n }, (_, i) => i)];
  while (queue.length > 0) {
    const idx = queue.shift();
    if (idx.length <= 1) continue;
    const mid = Math.floor(idx.length / 2);
    const left = idx.slice(0, mid), right = idx.slice(mid);
    const vL = cv(left), vR = cv(right);
    const alpha = 1 / vL / (1 / vL + 1 / vR);
    for (const i of left) w[i] *= alpha;
    for (const i of right) w[i] *= 1 - alpha;
    queue.push(left);
    queue.push(right);
  }
  const sum = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / sum);
}

// ── Generate synthetic price data ──

function generatePrices(nAssets, nDays) {
  const prices = [];
  for (let i = 0; i < nAssets; i++) {
    const p = [100 + Math.random() * 900]; // start price 100-1000
    const drift = (Math.random() - 0.5) * 0.001;
    const vol = 0.01 + Math.random() * 0.05;
    for (let t = 1; t < nDays; t++) {
      const ret = drift + vol * (Math.random() + Math.random() + Math.random() - 1.5) * 0.816;
      p.push(p[t - 1] * Math.exp(ret));
    }
    prices.push(p);
  }
  return prices;
}

// ── Benchmark per-step ──

function benchSteps(nAssets, nDays) {
  const prices = generatePrices(nAssets, nDays);

  const t0 = performance.now();
  const rets = computeLogReturns(prices);
  const tRet = performance.now() - t0;

  const t1 = performance.now();
  const cov = covarianceMatrix(rets);
  const tCov = performance.now() - t1;

  const t2 = performance.now();
  const corr = correlationMatrix(cov);
  const tCorr = performance.now() - t2;

  const t3 = performance.now();
  const dist = distanceMatrix(corr);
  const tDist = performance.now() - t3;

  const t4 = performance.now();
  const Z = averageLinkage(dist);
  const tLink = performance.now() - t4;

  const t5 = performance.now();
  const order = getLeafOrder(Z, nAssets);
  const tOrder = performance.now() - t5;

  const t6 = performance.now();
  const n = order.length;
  const covQ = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => cov[order[i]][order[j]]));
  const tQD = performance.now() - t6;

  const t7 = performance.now();
  hrpWeights(covQ, n);
  const tW = performance.now() - t7;

  const total = tRet + tCov + tCorr + tDist + tLink + tOrder + tQD + tW;

  return { nAssets, nDays, tRet, tCov, tCorr, tDist, tLink, tOrder, tQD, tW, total };
}

function fmt(ms) {
  if (ms < 1) return (ms * 1000).toFixed(0).padStart(6) + "µs";
  if (ms < 1000) return ms.toFixed(1).padStart(6) + "ms";
  return (ms / 1000).toFixed(2).padStart(6) + "s ";
}

// ── Main ──

console.log("╔═══════════════════════════════════════════════════════════════════╗");
console.log("║         HRP Pure Computation Benchmark (synthetic data)         ║");
console.log("╚═══════════════════════════════════════════════════════════════════╝");
console.log("  365 daily observations per asset\n");

const sizes = [10, 25, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
const DAYS = 365;

console.log(
  "  " + "N".padStart(6) + " │ " +
  "LogRet".padStart(8) + " │ " +
  "Cov".padStart(8) + " │ " +
  "Linkage".padStart(8) + " │ " +
  "QuasiD".padStart(8) + " │ " +
  "Weights".padStart(8) + " │ " +
  "TOTAL".padStart(8)
);
console.log("  " + "─".repeat(67));

const results = [];

for (const n of sizes) {
  // Memory check: n×n matrix needs n² × 8 bytes
  const memGB = (n * n * 8) / (1024 ** 3);
  if (memGB > 4) {
    console.log(`  ${String(n).padStart(6)} │ ⚠️  Skipped — would need ${memGB.toFixed(1)}GB RAM for ${n}×${n} matrix`);
    continue;
  }

  process.stdout.write(`  ${String(n).padStart(6)} │ computing...`);

  try {
    const r = benchSteps(n, DAYS);
    results.push(r);

    process.stdout.clearLine?.(0);
    process.stdout.cursorTo?.(0);
    console.log(
      "  " + String(n).padStart(6) + " │ " +
      fmt(r.tRet) + " │ " +
      fmt(r.tCov) + " │ " +
      fmt(r.tLink) + " │ " +
      fmt(r.tQD) + " │ " +
      fmt(r.tW) + " │ " +
      fmt(r.total)
    );
  } catch (e) {
    process.stdout.clearLine?.(0);
    process.stdout.cursorTo?.(0);
    console.log(`  ${String(n).padStart(6)} │ ❌ ${e.message?.slice(0, 50)}`);
  }
}

console.log("\n  " + "═".repeat(67));
console.log("\n  📊 Scaling visualization:\n");

for (const r of results) {
  const bar = "█".repeat(Math.max(1, Math.round(Math.log10(r.total + 1) * 10)));
  console.log(
    `  ${String(r.nAssets).padStart(6)} assets │ ${fmt(r.total)} │ ${bar}`
  );
}

console.log("\n  📐 Complexity breakdown:");
console.log("    • Log returns:      O(n × T)");
console.log("    • Covariance:       O(n² × T)");
console.log("    • Correlation:      O(n²)");
console.log("    • Distance matrix:  O(n²)");
console.log("    • Average linkage:  O(n³)  ← dominates for large n");
console.log("    • Quasi-diag:       O(n²)");
console.log("    • Recursive weights: O(n log n)");
