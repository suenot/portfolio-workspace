# w_portfolio

Portfolio optimization workspace. Each algorithm is an independent Rust crate,
published as its own git repository and wired in here as a **git submodule**.
A single Rust backend exposes all of them over HTTP.

## Layout

```
w_portfolio/
├── Cargo.toml              # cargo workspace root
├── algos/                  # algorithm crates (git submodules)
│   ├── portfolio-hrp/              Hierarchical Risk Parity
│   ├── portfolio-herc/             Hierarchical Equal Risk Contribution
│   ├── portfolio-ghrp/             Generalized HRP
│   ├── portfolio-mhrp/             Modified HRP
│   ├── portfolio-mvo/              Mean-Variance Optimization
│   ├── portfolio-black-litterman/  Black-Litterman
│   ├── portfolio-nco/              Nested Clustered Optimization
│   ├── portfolio-entropy-pooling/  Entropy Pooling
│   ├── portfolio-olps/             Online Portfolio Selection
│   ├── portfolio-rba/              Robust Bayesian Allocation
│   └── portfolio-tic/              Theory-Implied Correlation
├── optimization/backend/   # HTTP server dispatching to every algorithm
└── portfolio-optimizer/    # Next.js front-end app
```

## Algorithm crate contract

Every `algos/portfolio-*` crate exposes one uniform function:

```rust
pub fn optimize(prices: &[Vec<f64>]) -> Vec<f64>
```

`prices[asset][time]` — one inner `Vec` per asset. Returns long-only weights
summing to `1.0`, parallel to the asset axis.

## Getting started

```sh
git clone --recurse-submodules <this-repo>
cargo build --release
cargo run --release --bin portfolio-server   # serves on :3001
```

If you already cloned without submodules:

```sh
git submodule update --init --recursive
```

## Backend API

- `GET  /health` — liveness
- `GET  /api/methods` — list available algorithms
- `POST /api/optimize` — body `{ "prices": { "BTC": [...], ... }, "method": "hrp" }`
