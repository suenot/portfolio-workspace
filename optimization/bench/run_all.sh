#!/bin/bash
# HRP Benchmark Runner — compares Node.js, Rust, C, Zig
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$DIR")"

echo "═══════════════════════════════════════════════════════"
echo "  HRP Multi-Language Benchmark"
echo "  $(date)"
echo "═══════════════════════════════════════════════════════"
echo ""

# ── 1. C ──
echo "▶ Building C benchmark..."
cd "$DIR/c"
gcc -O3 -o hrp_bench bench.c -lm 2>&1
echo "▶ Running C benchmark..."
echo ""
./hrp_bench
echo ""

# ── 2. Rust ──
echo "▶ Building Rust benchmark (release)..."
cd "$ROOT/backend"
cargo build --release --bin hrp-bench 2>&1 | tail -1
echo "▶ Running Rust benchmark..."
echo ""
./target/release/hrp-bench
echo ""

# ── 3. Zig ──
echo "▶ Building Zig benchmark (ReleaseFast)..."
cd "$DIR/zig"
zig build-exe bench.zig -OReleaseFast -fno-llvm 2>&1 || zig build-exe bench.zig -OReleaseFast 2>&1
echo "▶ Running Zig benchmark..."
echo ""
./bench
echo ""

# ── 4. Node.js ──
echo "▶ Running Node.js benchmark..."
echo ""
cd "$ROOT/demo"
node --max-old-space-size=8192 src/bench/bench-compute.mjs
echo ""

echo "═══════════════════════════════════════════════════════"
echo "  Done! Compare TOTAL columns above."
echo "═══════════════════════════════════════════════════════"
