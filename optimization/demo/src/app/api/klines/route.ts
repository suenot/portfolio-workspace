import { NextRequest, NextResponse } from "next/server";
import { getDataDir, loadDailyCloses } from "@/lib/local-data";

const WAREHOUSE = process.env.WAREHOUSE_URL || "http://localhost:8020/api/v1";

export async function GET(req: NextRequest) {
  const searchParams = new URL(req.url).searchParams;
  const symbols = searchParams.get("symbols"); // comma-separated
  const tf = searchParams.get("tf") || "1m";
  const start = searchParams.get("start") || "2025-01-01";
  const end = searchParams.get("end") || "2025-03-01";

  if (!symbols) {
    return NextResponse.json({ error: "symbols required" }, { status: 400 });
  }

  const symbolList = symbols.split(",").map((s) => s.trim()).slice(0, 20);
  const results: Record<string, { timestamp: string; close: number }[]> = {};

  const dataDir = getDataDir();

  if (dataDir) {
    // ── Direct filesystem read (fastest) ──
    await Promise.all(
      symbolList.map(async (symbol) => {
        try {
          const rows = await loadDailyCloses(dataDir, symbol, start, end);
          if (rows.length > 0) results[symbol] = rows;
        } catch {
          // skip failed symbols
        }
      })
    );
  } else {
    // ── Fallback to warehouse HTTP API ──
    await Promise.all(
      symbolList.map(async (symbol) => {
        try {
          const url = `${WAREHOUSE}/data/${symbol}/klines?tf=${tf}&start=${start}&end=${end}&format=json`;
          const res = await fetch(url);
          if (!res.ok) return;
          const data: { timestamp: string; close: number }[] = await res.json();

          // Resample to daily
          const dayMap = new Map<string, { timestamp: string; close: number }>();
          for (const r of data) {
            const day = r.timestamp.slice(0, 10);
            dayMap.set(day, { timestamp: day, close: r.close });
          }
          results[symbol] = [...dayMap.values()].sort((a, b) =>
            a.timestamp.localeCompare(b.timestamp)
          );
        } catch {
          // skip
        }
      })
    );
  }

  return NextResponse.json(results);
}
