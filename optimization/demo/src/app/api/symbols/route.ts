import { NextResponse } from "next/server";
import { getDataDir, listSymbols } from "@/lib/local-data";

const WAREHOUSE = process.env.WAREHOUSE_URL || "http://localhost:8020/api/v1";

export async function GET() {
  // Prefer direct filesystem if WAREHOUSE_DATA_DIR is set
  const dataDir = getDataDir();
  if (dataDir) {
    const symbols = listSymbols(dataDir);
    return NextResponse.json(symbols);
  }

  // Fallback to warehouse HTTP API
  const res = await fetch(`${WAREHOUSE}/data/symbols`, { next: { revalidate: 300 } });
  const symbols: string[] = await res.json();
  return NextResponse.json(symbols);
}
