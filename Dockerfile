# Portfolio optimization backend — serves all 12 algorithms over HTTP.
#
# Dokploy clones this repo without git submodules, so the algorithm crates
# under algos/ arrive empty. They are public, so we clone them directly at
# build time before compiling the cargo workspace.

FROM rust:1-slim AS builder
WORKDIR /build
RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY . .
RUN for a in hrp herc ghrp mhrp mvo black-litterman nco entropy-pooling olps rba tic pipeline; do \
      rm -rf "algos/portfolio-$a" \
      && git clone --depth 1 "https://github.com/suenot/portfolio-$a.git" "algos/portfolio-$a"; \
    done
RUN cargo build --release --bin portfolio-server

FROM debian:bookworm-slim AS runner
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /build/target/release/portfolio-server /usr/local/bin/portfolio-server
ENV PORT=3001
EXPOSE 3001
CMD ["portfolio-server"]
