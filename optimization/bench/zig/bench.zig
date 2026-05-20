const std = @import("std");
const math = std.math;
const Allocator = std.mem.Allocator;

// ── Timing ──

fn now_us() f64 {
    const ts = std.time.nanoTimestamp();
    return @as(f64, @floatFromInt(ts)) / 1000.0;
}

// ── Generate synthetic prices ──

fn generatePrices(alloc: Allocator, n: usize, days: usize) ![][]f64 {
    var prices = try alloc.alloc([]f64, n);
    var seed: u64 = 42;
    for (0..n) |i| {
        prices[i] = try alloc.alloc(f64, days);
        seed = seed *% 6364136223846793005 +% 1;
        const start: f64 = 100.0 + @as(f64, @floatFromInt(seed % 900));
        prices[i][0] = start;
        const vol: f64 = 0.01 + @as(f64, @floatFromInt(seed % 50)) * 0.001;
        for (1..days) |t| {
            seed = seed *% 6364136223846793005 +% 1;
            const u: f64 = @as(f64, @floatFromInt(seed)) / @as(f64, @floatFromInt(std.math.maxInt(u64))) - 0.5;
            const ret: f64 = vol * u * 0.816;
            prices[i][t] = prices[i][t - 1] * @exp(ret);
        }
    }
    return prices;
}

// ── Log returns ──

fn logReturns(alloc: Allocator, prices: []const []const f64) ![][]f64 {
    const n = prices.len;
    var rets = try alloc.alloc([]f64, n);
    for (0..n) |i| {
        const days = prices[i].len;
        rets[i] = try alloc.alloc(f64, days - 1);
        for (0..days - 1) |t| {
            rets[i][t] = @log(prices[i][t + 1] / prices[i][t]);
        }
    }
    return rets;
}

// ── Covariance matrix (flat) ──

fn covMatrix(alloc: Allocator, rets: []const []const f64) ![]f64 {
    const n = rets.len;
    const T = rets[0].len;
    var means = try alloc.alloc(f64, n);
    defer alloc.free(means);
    for (0..n) |i| {
        var s: f64 = 0;
        for (0..T) |t| s += rets[i][t];
        means[i] = s / @as(f64, @floatFromInt(T));
    }
    var cov = try alloc.alloc(f64, n * n);
    for (0..n) |i| {
        for (i..n) |j| {
            var s: f64 = 0;
            for (0..T) |t| {
                s += (rets[i][t] - means[i]) * (rets[j][t] - means[j]);
            }
            const v = s / @as(f64, @floatFromInt(T - 1));
            cov[i * n + j] = v;
            cov[j * n + i] = v;
        }
    }
    return cov;
}

// ── Correlation & distance ──

fn corrMatrix(alloc: Allocator, cov: []const f64, n: usize) ![]f64 {
    var stds = try alloc.alloc(f64, n);
    defer alloc.free(stds);
    for (0..n) |i| stds[i] = @sqrt(cov[i * n + i]);
    var corr = try alloc.alloc(f64, n * n);
    for (0..n) |i| {
        for (0..n) |j| {
            corr[i * n + j] = if (stds[i] > 0 and stds[j] > 0)
                cov[i * n + j] / (stds[i] * stds[j])
            else
                0;
        }
    }
    return corr;
}

fn distMatrix(alloc: Allocator, corr: []const f64, n: usize) ![]f64 {
    var dist = try alloc.alloc(f64, n * n);
    for (0..n * n) |i| {
        const v = (1.0 - corr[i]) / 2.0;
        dist[i] = @sqrt(if (v > 0) v else 0);
    }
    return dist;
}

// ── Average linkage ──

const LinkageRow = struct { i: usize, j: usize, dist: f64, size: usize };

fn averageLinkage(alloc: Allocator, dist_in: []const f64, n: usize) ![]LinkageRow {
    const cap = 2 * n;
    var D = try alloc.alloc(f64, cap * cap);
    defer alloc.free(D);
    @memset(D, 1e18);
    var active = try alloc.alloc(bool, cap);
    defer alloc.free(active);
    @memset(active, false);
    var sizes = try alloc.alloc(usize, cap);
    defer alloc.free(sizes);

    for (0..n) |i| {
        for (0..n) |j| D[i * cap + j] = dist_in[i * n + j];
        active[i] = true;
        sizes[i] = 1;
    }

    var Z = try alloc.alloc(LinkageRow, n - 1);

    for (0..n - 1) |step| {
        var minD: f64 = 1e18;
        var mi: usize = 0;
        var mj: usize = 0;
        for (0..n + step) |i| {
            if (!active[i]) continue;
            for (i + 1..n + step) |j| {
                if (!active[j]) continue;
                if (D[i * cap + j] < minD) {
                    minD = D[i * cap + j];
                    mi = i;
                    mj = j;
                }
            }
        }
        const nid = n + step;
        sizes[nid] = sizes[mi] + sizes[mj];
        Z[step] = LinkageRow{ .i = mi, .j = mj, .dist = minD, .size = sizes[nid] };

        for (0..nid) |k| {
            if (!active[k] or k == mi or k == mj) continue;
            const nd = (D[mi * cap + k] * @as(f64, @floatFromInt(sizes[mi])) +
                D[mj * cap + k] * @as(f64, @floatFromInt(sizes[mj]))) /
                @as(f64, @floatFromInt(sizes[nid]));
            D[nid * cap + k] = nd;
            D[k * cap + nid] = nd;
        }
        D[nid * cap + nid] = 0;
        active[mi] = false;
        active[mj] = false;
        active[nid] = true;
    }
    return Z;
}

// ── Leaf order ──

fn leafOrder(alloc: Allocator, Z: []const LinkageRow, n: usize) ![]usize {
    var order = try alloc.alloc(usize, n);
    var stack = try alloc.alloc(usize, 2 * n);
    defer alloc.free(stack);
    var sp: usize = 0;
    var cnt: usize = 0;
    stack[sp] = n + Z.len - 1;
    sp += 1;
    while (sp > 0) {
        sp -= 1;
        const node = stack[sp];
        if (node < n) {
            order[cnt] = node;
            cnt += 1;
            continue;
        }
        const r = Z[node - n];
        stack[sp] = r.j;
        sp += 1;
        stack[sp] = r.i;
        sp += 1;
    }
    return order;
}

// ── Quasi-diag ──

fn quasiDiag(alloc: Allocator, cov: []const f64, order: []const usize, n: usize) ![]f64 {
    var qd = try alloc.alloc(f64, n * n);
    for (0..n) |i| {
        for (0..n) |j| {
            qd[i * n + j] = cov[order[i] * n + order[j]];
        }
    }
    return qd;
}

// ── HRP weights ──

fn hrpWeights(alloc: Allocator, covQ: []const f64, n: usize) ![]f64 {
    var w = try alloc.alloc(f64, n);
    @memset(w, 1.0);

    const Seg = struct { idx: []usize };
    var queue = try alloc.alloc(Seg, 2 * n);
    defer alloc.free(queue);
    var qh: usize = 0;
    var qt: usize = 0;

    var all = try alloc.alloc(usize, n);
    for (0..n) |i| all[i] = i;
    queue[qt] = Seg{ .idx = all };
    qt += 1;

    while (qh < qt) {
        const seg = queue[qh];
        qh += 1;
        if (seg.idx.len <= 1) { alloc.free(seg.idx); continue; }
        const mid = seg.idx.len / 2;

        var vL: f64 = 0;
        for (0..mid) |a| for (0..mid) |b| {
            vL += covQ[seg.idx[a] * n + seg.idx[b]];
        };
        vL /= @as(f64, @floatFromInt(mid * mid));

        var vR: f64 = 0;
        const rlen = seg.idx.len - mid;
        for (mid..seg.idx.len) |a| for (mid..seg.idx.len) |b| {
            vR += covQ[seg.idx[a] * n + seg.idx[b]];
        };
        vR /= @as(f64, @floatFromInt(rlen * rlen));

        const alpha = (1.0 / vL) / (1.0 / vL + 1.0 / vR);
        for (0..mid) |i| w[seg.idx[i]] *= alpha;
        for (mid..seg.idx.len) |i| w[seg.idx[i]] *= (1.0 - alpha);

        var left = try alloc.alloc(usize, mid);
        @memcpy(left, seg.idx[0..mid]);
        var right = try alloc.alloc(usize, rlen);
        @memcpy(right, seg.idx[mid..]);

        queue[qt] = Seg{ .idx = left };
        qt += 1;
        queue[qt] = Seg{ .idx = right };
        qt += 1;
        alloc.free(seg.idx);
    }

    var sum: f64 = 0;
    for (0..n) |i| sum += w[i];
    for (0..n) |i| w[i] /= sum;
    return w;
}

// ── Format ──

fn fmtTime(us: f64, buf: []u8) []u8 {
    if (us < 1000) {
        return std.fmt.bufPrint(buf, "{d:>6.0}µs", .{us}) catch buf[0..0];
    } else if (us < 1e6) {
        return std.fmt.bufPrint(buf, "{d:>6.1}ms", .{us / 1e3}) catch buf[0..0];
    } else {
        return std.fmt.bufPrint(buf, "{d:>6.2}s ", .{us / 1e6}) catch buf[0..0];
    }
}

fn benchOne(alloc: Allocator, n: usize, days: usize) !void {
    const prices = try generatePrices(alloc, n, days);
    defer {
        for (prices) |p| alloc.free(p);
        alloc.free(prices);
    }

    const prices_const: []const []const f64 = @ptrCast(prices);

    var t0 = now_us();
    const rets = try logReturns(alloc, prices_const);
    defer {
        for (rets) |r| alloc.free(r);
        alloc.free(rets);
    }
    const t_ret = now_us() - t0;

    const rets_const: []const []const f64 = @ptrCast(rets);

    t0 = now_us();
    const cov = try covMatrix(alloc, rets_const);
    defer alloc.free(cov);
    const t_cov = now_us() - t0;

    const corr = try corrMatrix(alloc, cov, n);
    defer alloc.free(corr);

    const dist = try distMatrix(alloc, corr, n);
    defer alloc.free(dist);

    t0 = now_us();
    const Z = try averageLinkage(alloc, dist, n);
    defer alloc.free(Z);
    const t_link = now_us() - t0;

    const order = try leafOrder(alloc, Z, n);
    defer alloc.free(order);

    t0 = now_us();
    const qd = try quasiDiag(alloc, cov, order, n);
    defer alloc.free(qd);
    const t_qd = now_us() - t0;

    t0 = now_us();
    const w = try hrpWeights(alloc, qd, n);
    defer alloc.free(w);
    const t_w = now_us() - t0;

    const total = t_ret + t_cov + t_link + t_qd + t_w;

    var b1: [32]u8 = undefined;
    var b2: [32]u8 = undefined;
    var b3: [32]u8 = undefined;
    var b4: [32]u8 = undefined;
    var b5: [32]u8 = undefined;
    var b6: [32]u8 = undefined;

    const stdout = std.io.getStdOut().writer();
    try stdout.print("  {d:>6} │ {s} │ {s} │ {s} │ {s} │ {s} │ {s}\n", .{
        n,
        fmtTime(t_ret, &b1),
        fmtTime(t_cov, &b2),
        fmtTime(t_link, &b3),
        fmtTime(t_qd, &b4),
        fmtTime(t_w, &b5),
        fmtTime(total, &b6),
    });
}

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    const alloc = gpa.allocator();

    const stdout = std.io.getStdOut().writer();
    try stdout.print("╔═══════════════════════════════════════════════════════════════════╗\n", .{});
    try stdout.print("║          HRP Benchmark — Zig (ReleaseFast)                      ║\n", .{});
    try stdout.print("╚═══════════════════════════════════════════════════════════════════╝\n", .{});
    try stdout.print("  365 daily observations per asset\n\n", .{});
    try stdout.print("  {s:>6} │ {s:>8} │ {s:>8} │ {s:>8} │ {s:>8} │ {s:>8} │ {s:>8}\n", .{
        "N", "LogRet", "Cov", "Linkage", "QuasiD", "Weights", "TOTAL",
    });
    try stdout.print("  ───────────────────────────────────────────────────────────────────\n", .{});

    const sizes = [_]usize{ 10, 25, 50, 100, 200, 500, 1000, 2000, 5000, 10000 };
    for (sizes) |n| {
        try benchOne(alloc, n, 365);
    }
}
