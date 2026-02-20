# Dockerfile for Panindigan Telegram Bot
# Uses Debian slim for better native dependency support (canvas, sharp, tfjs-node)
FROM node:20-bullseye-slim

# Install system dependencies required by canvas, sharp, and building native modules
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
    git \
  && rm -rf /var/lib/apt/lists/*

# Enable Corepack and activate pinned pnpm version
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

WORKDIR /app

# Copy package metadata first for layer caching
COPY package.json pnpm-lock.yaml* ./

# Install production dependencies only (build step will install dev deps if needed)
RUN pnpm install --frozen-lockfile --prod || pnpm install --prod

# Copy rest of the application
COPY . .

# Build TypeScript
RUN pnpm run build

ENV NODE_ENV=production

# Run the bot
CMD ["node", "dist/index.js"]
