/**
 * HRP Portfolio Optimization — Pure TypeScript implementation
 * Based on López de Prado (2016)
 */

// ── Matrix utilities ───────────────────────────────────────────

export function computeLogReturns(prices: number[][]): number[][] {
  // prices[asset][time] -> returns[asset][time-1]
  return prices.map((p) => {
    const ret: number[] = [];
    for (let i = 1; i < p.length; i++) {
      ret.push(Math.log(p[i] / p[i - 1]));
    }
    return ret;
  });
}

export function covarianceMatrix(returns: number[][]): number[][] {
  const n = returns.length;
  const T = returns[0].length;
  const means = returns.map((r) => r.reduce((a, b) => a + b, 0) / T);
  const cov: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let s = 0;
      for (let t = 0; t < T; t++) {
        s += (returns[i][t] - means[i]) * (returns[j][t] - means[j]);
      }
      cov[i][j] = s / (T - 1);
      cov[j][i] = cov[i][j];
    }
  }
  return cov;
}

export function correlationMatrix(cov: number[][]): number[][] {
  const n = cov.length;
  const stds = cov.map((_, i) => Math.sqrt(cov[i][i]));
  const corr: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      corr[i][j] = stds[i] > 0 && stds[j] > 0 ? cov[i][j] / (stds[i] * stds[j]) : 0;
    }
  }
  return corr;
}

// ── Distance matrix ───────────────────────────────────────────

export function distanceMatrix(corr: number[][]): number[][] {
  const n = corr.length;
  return corr.map((row) => row.map((rho) => Math.sqrt((1 - rho) / 2)));
}

// ── Hierarchical clustering (average linkage) ─────────────────

export interface LinkageRow {
  i: number;
  j: number;
  dist: number;
  size: number;
}

export function averageLinkage(dist: number[][]): LinkageRow[] {
  const n = dist.length;
  const Z: LinkageRow[] = [];
  const active = new Set<number>();
  for (let i = 0; i < n; i++) active.add(i);
  const sizes: number[] = new Array(2 * n - 1).fill(1);
  const D: number[][] = dist.map((r) => [...r]);

  for (let step = 0; step < n - 1; step++) {
    let minD = Infinity, mi = -1, mj = -1;
    const ids = [...active];
    for (let a = 0; a < ids.length; a++) {
      for (let b = a + 1; b < ids.length; b++) {
        if (D[ids[a]][ids[b]] < minD) {
          minD = D[ids[a]][ids[b]];
          mi = ids[a];
          mj = ids[b];
        }
      }
    }
    const newId = n + step;
    sizes[newId] = sizes[mi] + sizes[mj];
    Z.push({ i: mi, j: mj, dist: minD, size: sizes[newId] });

    // Update distances (average linkage)
    const newDist = new Array(2 * n - 1).fill(Infinity);
    for (const k of active) {
      if (k === mi || k === mj) continue;
      newDist[k] = (D[mi][k] * sizes[mi] + D[mj][k] * sizes[mj]) / sizes[newId];
    }

    // Expand D if needed
    while (D.length <= newId) D.push(new Array(D[0]?.length || 0).fill(Infinity));
    for (let r = 0; r < D.length; r++) {
      while (D[r].length <= newId) D[r].push(Infinity);
    }
    for (const k of active) {
      if (k === mi || k === mj) continue;
      D[newId][k] = newDist[k];
      D[k][newId] = newDist[k];
    }
    D[newId][newId] = 0;

    active.delete(mi);
    active.delete(mj);
    active.add(newId);
  }
  return Z;
}

// ── Leaf order (seriation) ────────────────────────────────────

export function getLeafOrder(Z: LinkageRow[], n: number): number[] {
  const order: number[] = [];
  function traverse(node: number) {
    if (node < n) {
      order.push(node);
      return;
    }
    const row = Z[node - n];
    traverse(row.i);
    traverse(row.j);
  }
  traverse(n + Z.length - 1);
  return order;
}

// ── Quasi-diagonalization ─────────────────────────────────────

export function quasiDiag(cov: number[][], order: number[]): number[][] {
  const n = order.length;
  const qd: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      qd[i][j] = cov[order[i]][order[j]];
    }
  }
  return qd;
}

// ── Recursive bisection (HRP weights) ─────────────────────────

export function hrpWeights(covQ: number[][], order: number[]): number[] {
  const n = order.length;
  const w = new Array(n).fill(1);

  function bisect(indices: number[]) {
    if (indices.length <= 1) return;
    const mid = Math.floor(indices.length / 2);
    const left = indices.slice(0, mid);
    const right = indices.slice(mid);

    const varL = clusterVariance(covQ, left);
    const varR = clusterVariance(covQ, right);

    const alpha = 1 / varL / (1 / varL + 1 / varR);
    for (const i of left) w[i] *= alpha;
    for (const i of right) w[i] *= 1 - alpha;

    bisect(left);
    bisect(right);
  }

  const allIdx = Array.from({ length: n }, (_, i) => i);
  bisect(allIdx);

  // Normalize
  const sum = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / sum);
}

function clusterVariance(cov: number[][], indices: number[]): number {
  const m = indices.length;
  let v = 0;
  for (const i of indices) {
    for (const j of indices) {
      v += cov[i][j];
    }
  }
  return v / (m * m);
}

// ── Tree structure for visualization ──────────────────────────

export interface TreeNode {
  id: string;
  label: string;
  weight: number;
  children?: TreeNode[];
}

export function buildTree(
  Z: LinkageRow[],
  n: number,
  labels: string[],
  weights: number[],
  order: number[]
): TreeNode {
  // Map from leaf-in-quasi-diag-order to original index
  function build(node: number): TreeNode {
    if (node < n) {
      const origIdx = order[node];
      return {
        id: `leaf-${origIdx}`,
        label: labels[origIdx],
        weight: weights[node],
      };
    }
    const row = Z[node - n];
    const left = build(row.i < n ? findQDIndex(row.i) : row.i);
    const right = build(row.j < n ? findQDIndex(row.j) : row.j);
    return {
      id: `node-${node}`,
      label: `Cluster`,
      weight: left.weight + right.weight,
      children: [left, right],
    };
  }

  function findQDIndex(orig: number): number {
    // For leaves, return the original index directly
    return orig;
  }

  // Simplified: build from linkage directly
  function buildFromLinkage(node: number): TreeNode {
    if (node < n) {
      return {
        id: `leaf-${node}`,
        label: labels[node],
        weight: 0, // will be filled
      };
    }
    const row = Z[node - n];
    const l = buildFromLinkage(row.i);
    const r = buildFromLinkage(row.j);
    return {
      id: `node-${node}`,
      label: "",
      weight: 0,
      children: [l, r],
    };
  }

  const tree = buildFromLinkage(n + Z.length - 1);

  // Assign weights to leaves
  function assignWeights(node: TreeNode): number {
    if (!node.children) {
      const idx = parseInt(node.id.replace("leaf-", ""));
      const qdIdx = order.indexOf(idx);
      node.weight = qdIdx >= 0 ? weights[qdIdx] : 0;
      return node.weight;
    }
    let sum = 0;
    for (const c of node.children) sum += assignWeights(c);
    node.weight = sum;
    return sum;
  }
  assignWeights(tree);

  return tree;
}

// ── Full pipeline ─────────────────────────────────────────────

export interface HRPResult {
  symbols: string[];
  weights: number[]; // in original symbol order
  order: number[];
  linkage: LinkageRow[];
  tree: TreeNode;
  covMatrix: number[][];
  corrMatrix: number[][];
}

export function runHRP(
  prices: Record<string, number[]>,
  symbolOrder: string[]
): HRPResult {
  const symbols = symbolOrder.filter((s) => prices[s] && prices[s].length > 10);
  const priceArrays = symbols.map((s) => prices[s]);

  // Align lengths
  const minLen = Math.min(...priceArrays.map((p) => p.length));
  const aligned = priceArrays.map((p) => p.slice(p.length - minLen));

  const returns = computeLogReturns(aligned);
  const cov = covarianceMatrix(returns);
  const corr = correlationMatrix(cov);
  const dist = distanceMatrix(corr);
  const Z = averageLinkage(dist);
  const order = getLeafOrder(Z, symbols.length);
  const covQ = quasiDiag(cov, order);
  const wQ = hrpWeights(covQ, order);

  // Map weights back to original order
  const weights = new Array(symbols.length).fill(0);
  for (let i = 0; i < order.length; i++) {
    weights[order[i]] = wQ[i];
  }

  const tree = buildTree(Z, symbols.length, symbols, wQ, order);

  return { symbols, weights, order, linkage: Z, tree, covMatrix: cov, corrMatrix: corr };
}
