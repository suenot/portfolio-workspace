#!/bin/bash
# HRP cross-language benchmark runner.
# Builds and runs every language implementation on the same synthetic dataset.
# Each implementation is a git submodule under benchmarks/<lang>/.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "═══════════════════════════════════════════════════════"
echo "  HRP Multi-Language Benchmark — $(date)"
echo "═══════════════════════════════════════════════════════"

run() { echo ""; echo "▶ $1"; echo ""; }

run "C (gcc -O3)"
( cd "$DIR/c" && make -s run )

run "C++ (clang++ -O3 -std=c++17)"
( cd "$DIR/cpp" && make -s run )

run "Zig (ReleaseFast)"
( cd "$DIR/zig" && zig build-exe bench.zig -OReleaseFast && ./bench )

run "Rust (release)"
( cd "$DIR/rust" && cargo run --release -q )

run "Python (numpy + scipy)"
( cd "$DIR/python" && python3 bench.py )

run "Node.js"
( cd "$DIR/node" && node bench.mjs )

run "Bun"
( cd "$DIR/bun" && bun bench.mjs )

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Done. Compare the TOTAL columns above."
echo "═══════════════════════════════════════════════════════"
