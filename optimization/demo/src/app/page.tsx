"use client";

import { useState, useEffect, useCallback } from "react";
import { runHRP, type HRPResult, type TreeNode } from "@/lib/hrp";

// ── Popular symbols for quick picks ──
const POPULAR = [
  "BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT",
  "DOGEUSDT","ADAUSDT","AVAXUSDT","DOTUSDT","LINKUSDT",
  "MATICUSDT","LTCUSDT","UNIUSDT","ATOMUSDT","NEARUSDT",
  "APTUSDT","ARBUSDT","OPUSDT","SUIUSDT","SEIUSDT",
];

export default function Home() {
  const [allSymbols, setAllSymbols] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSymbols, setLoadingSymbols] = useState(true);
  const [result, setResult] = useState<HRPResult | null>(null);
  const [prices, setPrices] = useState<Record<string, number[]>>({});
  const [dateRange, setDateRange] = useState({ start: "2025-03-01", end: "2026-03-01" });
  const [status, setStatus] = useState("");

  // Load symbols
  useEffect(() => {
    fetch("/api/symbols")
      .then((r) => r.json())
      .then((d) => { setAllSymbols(d); setLoadingSymbols(false); })
      .catch(() => setLoadingSymbols(false));
  }, []);

  // Add random portfolio
  const randomPortfolio = useCallback(() => {
    const usdt = allSymbols.filter((s) => s.endsWith("USDT") && !s.includes("/"));
    const shuffled = [...usdt].sort(() => Math.random() - 0.5);
    setSelected(shuffled.slice(0, 8 + Math.floor(Math.random() * 7)));
    setResult(null);
  }, [allSymbols]);

  // Fetch klines and run optimization
  const optimize = useCallback(async () => {
    if (selected.length < 3) { setStatus("Нужно минимум 3 актива"); return; }
    setLoading(true);
    setStatus("Загружаем данные из Warehouse...");
    try {
      const res = await fetch(
        `/api/klines?symbols=${selected.join(",")}&start=${dateRange.start}&end=${dateRange.end}`
      );
      const data: Record<string, { timestamp: string; close: number }[]> = await res.json();
      const priceMap: Record<string, number[]> = {};
      for (const [sym, rows] of Object.entries(data)) {
        if (rows.length > 10) priceMap[sym] = rows.map((r) => r.close);
      }
      setPrices(priceMap);
      setStatus(`Загружено ${Object.keys(priceMap).length} активов. Оптимизируем...`);

      const hrp = runHRP(priceMap, selected);
      setResult(hrp);
      setStatus(`HRP оптимизация завершена — ${hrp.symbols.length} активов`);
    } catch (e) {
      setStatus(`Ошибка: ${e}`);
    }
    setLoading(false);
  }, [selected, dateRange]);

  const toggle = (s: string) => {
    setSelected((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
    setResult(null);
  };

  const filtered = search
    ? allSymbols.filter((s) => s.toLowerCase().includes(search.toLowerCase())).slice(0, 50)
    : POPULAR.filter((s) => allSymbols.includes(s));

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[hsl(var(--background)/0.8)] backdrop-blur-xl border-b border-[hsl(var(--border))] px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--accent)/0.15)] flex items-center justify-center">
              <span className="text-lg">⚡</span>
            </div>
            <h1 className="text-lg font-black tracking-tight text-[hsl(var(--foreground))]">
              HRP Portfolio Optimizer
            </h1>
          </div>
          {status && (
            <p className="text-xs text-[hsl(var(--muted-foreground))] hidden md:block">{status}</p>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* ── Left Panel: Asset Selector ── */}
        <aside className="space-y-4">
          {/* Search */}
          <div className="glass rounded-2xl p-4">
            <label className="text-xs font-black text-[hsl(var(--accent-darker))] uppercase tracking-widest mb-2 block">
              Активы ({selected.length})
            </label>
            <input
              type="text"
              placeholder="Поиск символа..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground)/0.5)] focus:outline-none focus:border-[hsl(var(--accent)/0.5)]"
            />
          </div>

          {/* Symbol grid */}
          <div className="glass rounded-2xl p-4 max-h-[50vh] overflow-y-auto">
            {loadingSymbols ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Загрузка символов...</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {filtered.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggle(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${
                      selected.includes(s)
                        ? "bg-[hsl(var(--accent))] text-white shadow-lg shadow-[rgba(var(--accent-rgb),0.3)]"
                        : "bg-[hsl(var(--muted)/0.5)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent)/0.15)] hover:text-[hsl(var(--accent-darker))]"
                    }`}
                  >
                    {s.replace("USDT", "")}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date range */}
          <div className="glass rounded-2xl p-4 space-y-3">
            <label className="text-xs font-black text-[hsl(var(--accent-darker))] uppercase tracking-widest">Период</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange((d) => ({ ...d, start: e.target.value }))}
                className="px-3 py-2 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-xs text-[hsl(var(--foreground))]" />
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange((d) => ({ ...d, end: e.target.value }))}
                className="px-3 py-2 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-xs text-[hsl(var(--foreground))]" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={randomPortfolio} disabled={allSymbols.length === 0}
              className="flex-1 px-4 py-3 rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] font-bold text-sm hover:bg-[hsl(var(--muted)/0.8)] transition-all active:scale-95 disabled:opacity-40">
              🎲 Рандом
            </button>
            <button onClick={optimize} disabled={loading || selected.length < 3}
              className="flex-1 px-4 py-3 rounded-xl bg-[hsl(var(--accent))] text-white font-bold text-sm hover:bg-[hsl(var(--accent)/0.85)] transition-all active:scale-95 shadow-lg shadow-[rgba(var(--accent-rgb),0.3)] disabled:opacity-40">
              {loading ? "⏳ Загрузка..." : "⚡ Оптимизировать"}
            </button>
          </div>

          {/* Selected list */}
          {selected.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-[hsl(var(--accent-darker))] uppercase tracking-widest">
                  Портфель
                </span>
                <button onClick={() => { setSelected([]); setResult(null); }}
                  className="text-xs text-[hsl(var(--muted-foreground))] hover:text-red-400 transition-colors">
                  Очистить
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {selected.map((s) => (
                  <span key={s} onClick={() => toggle(s)}
                    className="px-2 py-0.5 rounded-md bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent-darker))] text-xs font-bold cursor-pointer hover:bg-red-500/20 hover:text-red-300 transition-colors">
                    {s.replace("USDT", "")} ×
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ── Right Panel: Results ── */}
        <div className="space-y-6">
          {!result && !loading && (
            <div className="glass rounded-3xl p-12 text-center">
              <div className="text-6xl mb-4">🌳</div>
              <h2 className="text-2xl font-black text-[hsl(var(--foreground))] mb-2">HRP Portfolio Optimizer</h2>
              <p className="text-[hsl(var(--muted-foreground))] font-light max-w-md mx-auto">
                Выберите активы из Warehouse, нажмите «Оптимизировать» — и алгоритм построит дерево кластеров и назначит веса по HRP.
              </p>
            </div>
          )}

          {loading && (
            <div className="glass rounded-3xl p-12 text-center">
              <div className="text-5xl animate-pulse mb-4">⚡</div>
              <p className="text-[hsl(var(--muted-foreground))]">Загружаем данные и считаем HRP...</p>
            </div>
          )}

          {result && (
            <>
              {/* Weights bar chart */}
              <div className="glass rounded-3xl p-6">
                <h3 className="text-sm font-black text-[hsl(var(--accent-darker))] uppercase tracking-widest mb-4">
                  Веса портфеля (HRP)
                </h3>
                <WeightsChart symbols={result.symbols} weights={result.weights} />
              </div>

              {/* Tree visualization */}
              <div className="glass rounded-3xl p-6">
                <h3 className="text-sm font-black text-[hsl(var(--accent-darker))] uppercase tracking-widest mb-4">
                  Дерево кластеров (Дендрограмма)
                </h3>
                <TreeViz node={result.tree} depth={0} />
              </div>

              {/* Correlation matrix */}
              <div className="glass rounded-3xl p-6 overflow-x-auto">
                <h3 className="text-sm font-black text-[hsl(var(--accent-darker))] uppercase tracking-widest mb-4">
                  Корреляционная матрица
                </h3>
                <CorrMatrix symbols={result.symbols} corr={result.corrMatrix} order={result.order} />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ── WeightsChart ──
function WeightsChart({ symbols, weights }: { symbols: string[]; weights: number[] }) {
  const pairs = symbols.map((s, i) => ({ s, w: weights[i] })).sort((a, b) => b.w - a.w);
  const max = Math.max(...pairs.map((p) => p.w));

  return (
    <div className="space-y-1.5">
      {pairs.map(({ s, w }) => (
        <div key={s} className="flex items-center gap-3 group">
          <span className="w-24 text-xs font-bold text-[hsl(var(--foreground))] text-right shrink-0 truncate">
            {s.replace("USDT", "")}
          </span>
          <div className="flex-1 h-6 bg-[hsl(var(--background))] rounded-lg overflow-hidden relative">
            <div
              className="h-full rounded-lg bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--accent-dark))] transition-all duration-700 group-hover:brightness-125"
              style={{ width: `${(w / max) * 100}%` }}
            />
          </div>
          <span className="w-14 text-xs font-mono text-[hsl(var(--muted-foreground))] text-right">
            {(w * 100).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── TreeViz (recursive) ──
function TreeViz({ node, depth }: { node: TreeNode; depth: number }) {
  const isLeaf = !node.children;
  const pct = (node.weight * 100).toFixed(1);

  return (
    <div className={`${depth > 0 ? "ml-4 border-l-2 border-[hsl(var(--border))] pl-4" : ""}`}>
      <div className={`flex items-center gap-2 py-1 group ${isLeaf ? "" : "cursor-default"}`}>
        {/* Node indicator */}
        <div className={`w-3 h-3 rounded-full shrink-0 ${
          isLeaf
            ? "bg-[hsl(var(--accent))] shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]"
            : "bg-[hsl(var(--muted))] border border-[hsl(var(--border))]"
        }`} />

        {isLeaf ? (
          <span className="text-sm font-bold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--accent-darker))] transition-colors">
            {node.label.replace("USDT", "")}
          </span>
        ) : (
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Cluster</span>
        )}

        <span className="text-xs font-mono text-[hsl(var(--muted-foreground)/0.7)]">
          {pct}%
        </span>

        {isLeaf && (
          <div className="flex-1 max-w-32">
            <div className="h-1.5 bg-[hsl(var(--muted)/0.3)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[hsl(var(--accent))] rounded-full"
                style={{ width: `${node.weight * 100 * 5}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {node.children?.map((c) => (
        <TreeViz key={c.id} node={c} depth={depth + 1} />
      ))}
    </div>
  );
}

// ── CorrMatrix ──
function CorrMatrix({ symbols, corr, order }: { symbols: string[]; corr: number[][]; order: number[] }) {
  const n = order.length;
  const labels = order.map((i) => symbols[i]?.replace("USDT", "") || "?");

  function cellColor(v: number): string {
    if (v >= 0.7) return "bg-emerald-500/60";
    if (v >= 0.4) return "bg-emerald-500/30";
    if (v >= 0.1) return "bg-emerald-500/10";
    if (v >= -0.1) return "bg-transparent";
    if (v >= -0.4) return "bg-red-500/15";
    if (v >= -0.7) return "bg-red-500/30";
    return "bg-red-500/50";
  }

  return (
    <div className="inline-block">
      <table className="border-collapse">
        <thead>
          <tr>
            <th />
            {labels.map((l) => (
              <th key={l} className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] px-1 pb-1 -rotate-45 origin-bottom-left w-6">
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {order.map((i, ri) => (
            <tr key={i}>
              <td className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] pr-2 text-right whitespace-nowrap">
                {labels[ri]}
              </td>
              {order.map((j, ci) => {
                const v = corr[i][j];
                return (
                  <td key={`${i}-${j}`} className={`w-5 h-5 ${cellColor(v)} border border-[hsl(var(--border)/0.3)]`}
                    title={`${labels[ri]}/${labels[ci]}: ${v.toFixed(2)}`} />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
