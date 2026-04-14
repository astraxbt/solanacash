# ============================================================================
# SolanaCash Relayer - Docker Image
# Bundles: Node.js, nargo (Noir), sunspot (Go/gnark), circuit artifacts
# ============================================================================

# Stage 1: Build sunspot from source
FROM golang:1.24-bookworm AS sunspot-builder

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
RUN git clone https://github.com/reilabs/sunspot.git /sunspot
WORKDIR /sunspot/go
RUN go build -o /usr/local/bin/sunspot .

# Stage 2: Install nargo
FROM debian:bookworm-slim AS nargo-installer

RUN apt-get update && apt-get install -y curl bash && rm -rf /var/lib/apt/lists/*
RUN curl -L https://raw.githubusercontent.com/noir-lang/noirup/refs/heads/main/install | bash
ENV PATH="/root/.nargo/bin:${PATH}"
RUN noirup -v 1.0.0-beta.13

# Stage 3: Final image
FROM node:22-bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy sunspot binary
COPY --from=sunspot-builder /usr/local/bin/sunspot /usr/local/bin/sunspot

# Copy nargo binary
COPY --from=nargo-installer /root/.nargo/bin/nargo /usr/local/bin/nargo

# Set up app directory
WORKDIR /app

# Copy circuit artifacts (pre-compiled)
COPY noir_circuit/ /app/noir_circuit/

# Copy relayer source
COPY relayer/package.json relayer/package-lock.json /app/relayer/
WORKDIR /app/relayer
RUN npm ci --omit=dev

COPY relayer/src/ /app/relayer/src/
COPY relayer/tsconfig.json /app/relayer/

# The keypair is mounted at runtime (not baked into the image)
# docker run -v /path/to/keypair:/app/keypair ...

# Environment defaults
ENV PORT=3001
ENV RPC_URL=https://api.devnet.solana.com
ENV SHIELDED_POOL_PROGRAM_ID=33k7WbNmCBgwQMhH4Y9fQHJpkr7HS3GYKomZHbuBbPso
ENV ZK_VERIFIER_PROGRAM_ID=GzJDDpR3MxDmSq36EZLZ6amET9dJx5SMfb9dUTfp5cEB
ENV RELAYER_WALLET_PATH=/app/keypair/relayer.json
ENV TREE_STATE_PATH=/app/data/tree-state.json

EXPOSE 3001

CMD ["npx", "tsx", "src/server.ts"]
