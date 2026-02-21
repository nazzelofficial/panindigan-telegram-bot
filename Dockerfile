# Multi-stage Dockerfile for Panindigan Telegram Bot
# Builder stage: install dev deps and build TypeScript
FROM node:20-bullseye-slim AS builder

# Install system dependencies required by native builds
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libvips-dev \
    curl \
    unzip \
    git \
  && rm -rf /var/lib/apt/lists/*

# Enable Corepack and activate pnpm
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./

# Install full dependencies (including dev) for build
RUN pnpm install --frozen-lockfile || pnpm install

# Copy the rest and build
COPY . .
RUN pnpm run build
# Ensure an assets directory exists (avoids COPY failing when no assets folder present)
RUN mkdir -p /app/assets || true
# Download Inter font (SIL Open Font License) into assets/fonts for canvas rendering
RUN mkdir -p /app/assets/fonts && \
  curl -L -o /tmp/inter.zip https://github.com/rsms/inter/releases/latest/download/Inter-latest.zip && \
  unzip -o /tmp/inter.zip -d /tmp/inter && \
  cp /tmp/inter/fonts/ttf/*.ttf /app/assets/fonts/ || true; \
  rm -rf /tmp/inter /tmp/inter.zip || true

# Runtime stage: smaller image with production deps only
FROM node:20-bullseye-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libjpeg62-turbo \
    librsvg2-2 \
    libvips42 \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

WORKDIR /app

# Copy package metadata and install production deps only
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod || pnpm install --prod

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/assets ./assets
# Copy configuration JSON into runtime image so compiled code can require it
COPY --from=builder /app/config.json ./

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
