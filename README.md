# Panindigan

> A production-ready Telegram community support bot built with TypeScript, Node.js, [Grammy](https://grammy.dev/), and PostgreSQL.

Panindigan provides group moderation, XP-based leveling, badge rewards, NSFW scanning, dynamic welcome cards, daily streaks, and a full admin toolkit — everything you need to run a healthy, engaged Telegram community.

---

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Commands](#commands)
- [Migrations](#migrations)
- [Security](#security)
- [Changelog](#changelog)

---

## Features

### 🏆 XP & Leveling
Per-chat XP tracking with configurable level tiers, leaderboards, and admin tools to manually set levels or award XP.

### 🎖️ Badges & Rewards
Badges are automatically awarded at level milestones. Members can view their earned badges with `/badges`.

### 🛡️ Moderation
Full moderation suite: ban, unban, warn, mute, and unmute — with warning history and bulk-clear support.

### 📋 Reports
Members can submit `/report`s for admin review. Admins can list, dismiss, or action reports via dedicated commands.

### 📢 Broadcasts
Interactive broadcast flow with live progress tracking. In-progress broadcasts can be cancelled at any time with `/broadcastcancel`.

### 🔞 NSFW Scanning
Configurable per-chat NSFW detection powered by TensorFlow. Toggle it on/off, tune sensitivity, review logs, and define automated actions.

### 🖼️ Welcome & Goodbye Cards
Canvas + Sharp based dynamic image cards for member joins and departures. Fully customizable — set background images (photo or URL), text color, preview before saving, and toggle independently per chat.

### 📅 Daily Rewards & Streaks
Members can claim XP rewards daily with `/daily` and track their login streaks with `/streak`.

### ❓ Help System
Categorized help pages with inline keyboard navigation via `/help`.

---

## Requirements

- **Node.js** 23 or higher
- **pnpm**
- **PostgreSQL** database
- System libraries for image generation: **Cairo**, **Pango**, **libjpeg**
- *(Optional)* Native bindings for `@tensorflow/tfjs-node` (NSFW scanning — increases memory usage)

---

## Quick Start

**1. Clone the repository and install dependencies:**

```bash
git clone <repo-url>
cd panindigan
pnpm install
```

**Preferred pnpm version (recommended for reproducible installs)**

This project pins `pnpm@10.30.1`. Use Corepack to activate the exact pnpm version before installing:

```bash
corepack enable
corepack prepare pnpm@10.30.1 --activate
pnpm -v # should print 10.30.1
pnpm install
```

**Remote verification (optional but recommended for managed instances)**

This bot can verify its license/instance state against an official verification endpoint. Set the following environment variables to enable the feature:

| Variable | Description |
|---|---|
| `API_VERIFY_URL` | Verification endpoint (defaults to `https://api.panindigan.com/verify`) |
| `INSTANCE_ID` | Unique identifier for this bot instance (required to enable remote verification) |

When verification is enabled, the bot will periodically contact the verification endpoint. If the endpoint denies access or becomes unreachable, the bot will disable command handling and inform chats that features are temporarily unavailable.


**2. Set environment variables** in your hosting environment (never commit secrets):

| Variable | Description |
|---|---|
| `BOT_TOKEN` | Your Telegram bot token from [@BotFather](https://t.me/BotFather) |
| `DATABASE_URL` | PostgreSQL connection string |
| `ADMIN_IDS` | Comma-separated Telegram user IDs for bot admins |

**3. Run database migrations:**

```bash
pnpm run migrate
```

## Docker

Build and run the official Docker image (the `Dockerfile` includes native deps needed for `canvas`, `sharp`, and native module builds):

```bash
# Build image
docker build -t panindigan-bot:latest .

# Run container (uses .env file for secrets)
docker run --env-file .env --name panindigan -d panindigan-bot:latest
```

Notes:
- The container image installs system libraries required for image generation and native modules; it also activates `pnpm@10.30.1` via Corepack.
- Ensure your `.env` file contains `BOT_TOKEN`, `DATABASE_URL`, and `ADMIN_IDS` before starting the container.

**4. Start the bot:**

```bash
# Development (with hot reload)
pnpm run dev

# Production
pnpm run build
pnpm start
```

---

## Configuration

Runtime defaults are defined in `config.json`, including:

- Command prefixes
- Level thresholds and XP values
- NSFW detection defaults
- Welcome/goodbye card templates
- Rate limits

Per-chat settings (NSFW toggle, command prefix, welcome/goodbye state) are stored persistently in the `chat_settings` database table.

---

## Commands

### Member Commands

| Command | Description |
|---|---|
| `/help` | Browse categorized help pages |
| `/daily` | Claim your daily XP reward |
| `/streak` | View your current login streak |
| `/badges` | View your earned badges |
| `/report` | Report a user or message to admins |
| `/myreports` | View your submitted reports |

### Moderation Commands

| Command | Description |
|---|---|
| `/ban` | Ban a user from the group |
| `/unban` | Unban a user |
| `/warn` | Issue a warning to a user |
| `/warnings` | View a user's warnings |
| `/clearwarnings` | Clear all warnings for a user |
| `/mute` | Mute a user |
| `/unmute` | Unmute a user |
| `/mutelist` | List currently muted users |

### Admin Commands

| Command | Description |
|---|---|
| `/reports` | View all pending reports |
| `/dismissreport` | Dismiss a report |
| `/actionreport` | Take action on a report |
| `/togglensfw` | Enable or disable NSFW scanning |
| `/nsfwconfig` | Configure NSFW detection settings |
| `/nsfwstatus` | View current NSFW scan status and logs |
| `/setwelcome` | Set the welcome card (photo or URL background, text color) |
| `/setgoodbye` | Set the goodbye card |
| `/previewwelcome` | Preview the welcome card before saving |
| `/previewgoodbye` | Preview the goodbye card before saving |
| `/resetwelcome` | Reset welcome card to defaults |
| `/resetgoodbye` | Reset goodbye card to defaults |
| `/togglewelcome` | Enable or disable welcome messages |
| `/togglegoodbye` | Enable or disable goodbye messages |
| `/broadcastcancel` | Cancel an in-progress broadcast |

---

## Migrations

All SQL migrations live in the `sql/` directory. Run all pending migrations with:

```bash
pnpm run migrate
```

Always run this command before starting the bot for the first time, and after pulling updates that include new migration files.

---

## Security

- Store `BOT_TOKEN`, `DATABASE_URL`, and `ADMIN_IDS` **only** as environment variables in your host environment.
- Never commit secrets to version control.
- Restrict database access to the application host.

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the full release history and notable changes.

---

<p align="center">Built with ❤️ using <a href="https://grammy.dev/">Grammy</a>, TypeScript, and PostgreSQL.</p>