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
| Covariance | O(N²·T) |
| Average linkage | **O(N³)** in the hand-rolled versions ← dominates |
| Quasi-diagonalization | O(N²) |
| Recursive-bisection weights | O(N log N) |

Synthetic price generation, correlation and distance are computed but **not** timed.

## Methodology & fairness

- **Six of the seven implementations (C, C++, Zig, Rust, Node, Bun) run the exact
  same hand-rolled algorithm**, including a naive `O(N³)` average linkage. That makes
  them a clean *language* comparison — same operations, same memory layout, same
  data. Prices and resulting weights are bit-identical (verified: at `N=10` every
  implementation yields `w0=0.214035016516, w1=0.138665098707, w2=0.026131011048`).
- **Python is the odd one out, on purpose.** It uses `numpy` + `scipy.cluster.hierarchy`
  — i.e. how Python is actually written. `scipy`'s `linkage` is a compiled `O(N²)`
  nearest-neighbor-chain algorithm and covariance is BLAS-backed, so Python's numbers
  reflect *library quality*, not the language. It is therefore not comparable on the
  linkage column — and it wins, which is the point.

## Indicative results

Single run, Apple Silicon, single-thread, `N = 1000`, 365 observations. Reproduce
with `./run_all.sh`. Microbenchmark — expect ±10–20% between runs.

| Language | TOTAL @ N=1000 |
|---|---:|
| C++ | ~256 ms |
| C | ~260 ms |
| Zig | ~265 ms |
| Bun | ~351 ms |
| Rust | ~398 ms |
| Node.js | ~806 ms |
| Python (numpy/scipy) | **~23 ms** |

Takeaways: among the hand-rolled `O(N³)` versions the compiled languages cluster
tightly (C ≈ C++ ≈ Zig, Rust within ~1.5×), Bun beats Node on the same JS, and the
idiomatic `numpy`/`scipy` Python is an order of magnitude faster than all of them —
because a better *algorithm and library* beats raw language speed. For realistic
portfolios (dozens of assets) every version finishes in single-digit milliseconds.

## Run

```sh
git clone --recurse-submodules https://github.com/suenot/portfolio-workspace
cd portfolio-workspace/benchmarks
./run_all.sh
```

Toolchains: `gcc`/`clang`, `clang++`, `zig`, `cargo`, `python3` (+`numpy`,`scipy`),
`node`, `bun`.
