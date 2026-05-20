use portfolio_hrp as hrp;
use std::time::Instant;

fn generate_prices(n_assets: usize, n_days: usize) -> Vec<Vec<f64>> {
    let mut prices = Vec::with_capacity(n_assets);
    let mut seed: u64 = 42;
    for _ in 0..n_assets {
        let mut p = Vec::with_capacity(n_days);
        seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1);
        let start = 100.0 + (seed % 900) as f64;
        p.push(start);
        let vol = 0.01 + (seed % 50) as f64 * 0.001;
        for _ in 1..n_days {
            seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1);
            let u = (seed as f64) / (u64::MAX as f64) - 0.5;
            let ret = vol * u * 0.816;
            p.push(p.last().unwrap() * (ret).exp());
        }
        prices.push(p);
    }
    prices
}

fn fmt_time(us: f64) -> String {
    if us < 1000.0 { format!("{:>8.0}µs", us) }
    else if us < 1_000_000.0 { format!("{:>8.1}ms", us / 1000.0) }
    else { format!("{:>8.2}s ", us / 1_000_000.0) }
}

fn bench(n: usize, days: usize) {
    let prices = generate_prices(n, days);

    let t0 = Instant::now();
    let returns = hrp::log_returns(&prices);
    let t_ret = t0.elapsed().as_micros() as f64;

    let t1 = Instant::now();
    let cov = hrp::covariance_matrix(&returns);
    let t_cov = t1.elapsed().as_micros() as f64;

    let t2 = Instant::now();
    let corr = hrp::correlation_matrix(&cov);
    let t_corr = t2.elapsed().as_micros() as f64;

    let t3 = Instant::now();
    let dist = hrp::distance_matrix(&corr);
    let t_dist = t3.elapsed().as_micros() as f64;

    let t4 = Instant::now();
    let z = hrp::average_linkage(&dist);
    let t_link = t4.elapsed().as_micros() as f64;

    let t5 = Instant::now();
    let order = hrp::leaf_order(&z, n);
    let t_order = t5.elapsed().as_micros() as f64;

    let t6 = Instant::now();
    let cov_q = hrp::quasi_diag(&cov, &order);
    let t_qd = t6.elapsed().as_micros() as f64;

    let t7 = Instant::now();
    let _w = hrp::hrp_weights(&cov_q);
    let t_w = t7.elapsed().as_micros() as f64;

    let total = t_ret + t_cov + t_corr + t_dist + t_link + t_order + t_qd + t_w;

    println!("  {:>6} │ {} │ {} │ {} │ {} │ {} │ {}",
        n, fmt_time(t_ret), fmt_time(t_cov), fmt_time(t_link),
        fmt_time(t_qd), fmt_time(t_w), fmt_time(total));
}

fn main() {
    println!("╔═══════════════════════════════════════════════════════════════════╗");
    println!("║          HRP Benchmark — Rust (release build)                   ║");
    println!("╚═══════════════════════════════════════════════════════════════════╝");
    println!("  365 daily observations per asset\n");
    println!("  {:>6} │ {:>8} │ {:>8} │ {:>8} │ {:>8} │ {:>8} │ {:>8}",
        "N", "LogRet", "Cov", "Linkage", "QuasiD", "Weights", "TOTAL");
    println!("  {}", "─".repeat(67));

    for &n in &[10, 25, 50, 100, 200, 500, 1000, 2000, 5000, 10000] {
        bench(n, 365);
    }
}
