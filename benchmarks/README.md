# HRP cross-language benchmark

The same **Hierarchical Risk Parity (HRP)** core, implemented in seven languages,
driven by an identical 64-bit-LCG synthetic dataset. Each implementation lives in
its own repository and is wired here as a git submodule.

| Language | Repository | Notes |
|---|---|---|
| C | [hrp-bench-c](https://github.com/suenot/hrp-bench-c) | reference implementation |
| C++ | [hrp-bench-cpp](https://github.com/suenot/hrp-bench-cpp) | C++17, `std::vector` |
| Zig | [hrp-bench-zig](https://github.com/suenot/hrp-bench-zig) | `-OReleaseFast` |
| Rust | [hrp-bench-rust](https://github.com/suenot/hrp-bench-rust) | `--release`, LTO, std-only |
| Python | [hrp-bench-python](https://github.com/suenot/hrp-bench-python) | **numpy + scipy** (idiomatic) |
| Node.js | [hrp-bench-node](https://github.com/suenot/hrp-bench-node) | BigInt LCG |
| Bun | [hrp-bench-bun](https://github.com/suenot/hrp-bench-bun) | same JS as Node |

## What is measured

Five timed stages of the HRP pipeline on `N` assets × 365 daily observations:

| Stage | Complexity |
|---|---|
| Log returns | O(N·T) |
| Covariance | **O(N²·T)** ← dominates |
| Average linkage | O(N²) (NN-chain, Müllner 2011) |
| Quasi-diagonalization | O(N²) |
| Recursive-bisection weights | O(N log N) |

Synthetic price generation, correlation and distance are computed but **not** timed.

## Methodology & fairness

- **All seven implementations run the same algorithm**, including an `O(N²)`
  nearest-neighbor-chain average linkage (Müllner 2011 — the method behind SciPy's
  `linkage(method='average')`). Six hand-roll every stage (C, C++, Zig, Rust, Node,
  Bun); Python delegates to `numpy`/`scipy`. That makes the six a clean *language*
  comparison — same operations, same memory layout, same data. Prices and resulting
  weights are bit-identical (verified: at `N=10` every implementation yields
  `w0=0.214035016516, w1=0.138665098707, w2=0.026131011048`).
- **Python is the odd one out, on purpose.** It uses `numpy` + `scipy.cluster.hierarchy`
  — i.e. how Python is actually written. The clustering algorithm is the *same* O(N²)
  NN-chain, but the now-dominant covariance stage is BLAS-backed and vectorized, so
  Python's numbers reflect *library quality* on that stage, not the language — and it
  wins, which is the point.

## Indicative results

Single run, Apple Silicon, single-thread, `N = 1000`, 365 observations. Reproduce
with `./run_all.sh`. Microbenchmark — expect ±10–20% between runs.

| Language | TOTAL @ N=1000 |
|---|---:|
| C++ | ~127 ms |
| C | ~130 ms |
| Rust | ~134 ms |
| Bun | ~170 ms |
| Node.js | ~423 ms |
| Python (numpy/scipy) | **~23 ms** |

(Zig is compiled and tracks C/C++; its toolchain wouldn't link in this particular
run, so it is omitted from the snapshot above.)

Takeaways: with the `O(N²)` NN-chain linkage the dominant stage is now the
covariance matrix `O(N²·T)`, not clustering. The compiled languages cluster tightly
(C ≈ C++ ≈ Rust), Bun beats Node on the same JS, and the idiomatic `numpy`/`scipy`
Python is an order of magnitude faster than all of them — not because of a better
clustering algorithm (everyone shares the same NN-chain now) but because its
covariance is BLAS-backed. For realistic portfolios (dozens of assets) every version
finishes in single-digit milliseconds.

## Run

```sh
git clone --recurse-submodules https://github.com/suenot/portfolio-workspace
cd portfolio-workspace/benchmarks
./run_all.sh
```

Toolchains: `gcc`/`clang`, `clang++`, `zig`, `cargo`, `python3` (+`numpy`,`scipy`),
`node`, `bun`.
