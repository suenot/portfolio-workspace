//! Portfolio optimization HTTP server.
//!
//! Exposes every algorithm crate in the workspace behind one endpoint:
//! `POST /api/optimize` with `{ prices, method }`.

use axum::{extract::Json, routing::{get, post}, Router};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tower_http::cors::CorsLayer;

/// All optimization methods, in display order.
const METHODS: &[(&str, &str)] = &[
    ("hrp", "Hierarchical Risk Parity"),
    ("herc", "Hierarchical Equal Risk Contribution"),
    ("ghrp", "Generalized Hierarchical Risk Parity"),
    ("mhrp", "Modified Hierarchical Risk Parity"),
    ("mvo", "Mean-Variance Optimization"),
    ("black_litterman", "Black-Litterman"),
    ("nco", "Nested Clustered Optimization"),
    ("entropy_pooling", "Entropy Pooling"),
    ("olps", "Online Portfolio Selection"),
    ("rba", "Robust Bayesian Allocation"),
    ("tic", "Theory-Implied Correlation"),
];

/// Dispatch a method name to its algorithm crate.
fn dispatch(method: &str, prices: &[Vec<f64>]) -> Option<Vec<f64>> {
    let weights = match method {
        "hrp" => portfolio_hrp::optimize(prices),
        "herc" => portfolio_herc::optimize(prices),
        "ghrp" => portfolio_ghrp::optimize(prices),
        "mhrp" => portfolio_mhrp::optimize(prices),
        "mvo" => portfolio_mvo::optimize(prices),
        "black_litterman" | "bl" => portfolio_black_litterman::optimize(prices),
        "nco" => portfolio_nco::optimize(prices),
        "entropy_pooling" | "ep" => portfolio_entropy_pooling::optimize(prices),
        "olps" => portfolio_olps::optimize(prices),
        "rba" => portfolio_rba::optimize(prices),
        "tic" => portfolio_tic::optimize(prices),
        _ => return None,
    };
    Some(weights)
}

#[derive(Deserialize)]
struct OptimizeRequest {
    prices: HashMap<String, Vec<f64>>,
    #[serde(default = "default_method")]
    method: String,
}

fn default_method() -> String {
    "hrp".to_string()
}

#[derive(Serialize)]
struct OptimizeResponse {
    weights: HashMap<String, f64>,
    method: String,
    elapsed_us: u64,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

#[derive(Serialize)]
enum ApiResult {
    #[serde(untagged)]
    Ok(OptimizeResponse),
    #[serde(untagged)]
    Err(ErrorResponse),
}

async fn optimize(Json(req): Json<OptimizeRequest>) -> Json<ApiResult> {
    let symbols: Vec<String> = req.prices.keys().cloned().collect();

    if symbols.len() < 2 {
        return Json(ApiResult::Err(ErrorResponse {
            error: "need at least 2 assets".to_string(),
        }));
    }

    let price_vecs: Vec<Vec<f64>> = symbols.iter().map(|s| req.prices[s].clone()).collect();

    let start = std::time::Instant::now();
    let weights = match dispatch(&req.method, &price_vecs) {
        Some(w) => w,
        None => {
            return Json(ApiResult::Err(ErrorResponse {
                error: format!("unknown method: {}", req.method),
            }));
        }
    };
    let elapsed = start.elapsed().as_micros() as u64;

    let weight_map: HashMap<String, f64> = symbols
        .iter()
        .cloned()
        .zip(weights.iter().copied())
        .collect();

    Json(ApiResult::Ok(OptimizeResponse {
        weights: weight_map,
        method: req.method,
        elapsed_us: elapsed,
    }))
}

#[derive(Serialize)]
struct MethodInfo {
    id: &'static str,
    name: &'static str,
}

async fn methods() -> Json<Vec<MethodInfo>> {
    Json(
        METHODS
            .iter()
            .map(|&(id, name)| MethodInfo { id, name })
            .collect(),
    )
}

async fn health() -> &'static str {
    "ok"
}

#[tokio::main]
async fn main() {
    let port = std::env::var("PORT").unwrap_or_else(|_| "3001".to_string());
    let addr = format!("0.0.0.0:{}", port);

    let app = Router::new()
        .route("/health", get(health))
        .route("/api/methods", get(methods))
        .route("/api/optimize", post(optimize))
        .layer(CorsLayer::permissive());

    println!("Portfolio Backend (Rust) — {} algorithms — listening on {}", METHODS.len(), addr);
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
