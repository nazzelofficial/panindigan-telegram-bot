# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).

---

## [0.1.0] — 2026-02-20

### 🎉 Initial Release

---

### Added

#### Project Foundation
- Full TypeScript scaffold: `package.json`, `tsconfig.json`, and initial project layout.
- Configuration loader and `config.json` with runtime settings and defaults.
- Migration runner (`src/migrate.ts`) to apply SQL files in the `sql/` directory sequentially.

#### Database
- `sql/001_init.sql` — initial schema: `users`, `user_levels`, `welcome_goodbye_config`, `warnings`, `faq`, `suggestions`, `nsfw_logs`, `broadcasts`, `badges`, `mutes`, `daily_rewards`, `audit_logs`.
- `sql/002_chat_settings.sql` — persistent `chat_settings` table for per-chat configuration.
- `sql/006_add_command_prefix.sql` — adds `command_prefix` column to `chat_settings`.
- Database layer and query modules: `src/database/connection.ts`, `users.queries.ts`, `user_levels.queries.ts`, `warnings.queries.ts`, `suggestions.queries.ts`, `chat_settings.queries.ts`.

#### Middleware
- Prefix parser, banned users, rate-limit, XP/levels, session, and logger middleware.
- NSFW scanning middleware using `nsfwjs` + `@tensorflow/tfjs-node` with logging to `nsfw_logs`.

#### Commands — Member
`/start`, `/help`, `/me`, `/ping`, `/status`, `/rank`, `/leaderboard`, `/levels`, `/suggest`, `/mysuggestions`, `/tracksuggestion`, `/upvote`, `/topsuggestions`, `/notify`, `/language`, `/faq` *(skeleton)*, `/daily`, `/streak`, `/badges`, `/report`, `/myreports`.

#### Commands — Admin & Moderation
`/ban`, `/unban`, `/warn`, `/warnings`, `/clearwarnings`, `/mute`, `/unmute`, `/mutelist`, `/setwelcome`, `/setgoodbye`, `/previewwelcome`, `/previewgoodbye`, `/resetwelcome`, `/resetgoodbye`, `/togglewelcome`, `/togglegoodbye`, `/suggestions`, `/approvesuggestion`, `/rejectsuggestion`, `/nsfwlogs`, `/clearnsfwlog`, `/togglensfw`, `/nsfwconfig`, `/nsfwstatus`, `/reports`, `/dismissreport`, `/actionreport`, `/broadcastcancel`, `/setprefix`, `/listprefix`.

#### Features
- **XP & Leveling** — chat-scoped XP tracking and level tiers persisted in `user_levels`.
- **Badges** — auto-award flow on level-up; `/badges` command to view earned badges.
- **Mutes** — `mutes` table, mute queries, and `muted` middleware.
- **Reports** — member `/report` flow and full admin review UI (`/reports`, `/dismissreport`, `/actionreport`).
- **Broadcasts** — interactive broadcast flow with progress tracking; `/broadcastcancel` stops an in-progress broadcast and persists cancellation status.
- **NSFW controls** — per-chat toggle stored in `chat_settings`; `/nsfwconfig` and `/nsfwstatus` for granular management.
- **Per-chat command prefixes** — configurable via `command_prefix` in `chat_settings`; `/setprefix` and `/listprefix` commands.
- **Welcome/Goodbye card system** — Canvas + Sharp based dynamic image generation with full admin flow:
  - Multi-step `/setwelcome` and `/setgoodbye` (message, text color, background via photo upload or URL).
  - `/previewwelcome` and `/previewgoodbye` render live previews from persisted config.
  - `/resetwelcome`, `/resetgoodbye`, `/togglewelcome`, `/togglegoodbye` for per-chat control.
  - Uploaded backgrounds saved to `assets/` with path persisted in the database.
- **Help system** — structured, categorized help pages with inline keyboard navigation.

---

### Changed

- Consolidated separate command modules into a single `src/commands/core.ts` for maintainability.
- Help text and categories updated to reflect all newly added commands and admin utilities.

---

### Notes

- Some features are scaffolded in the schema but not yet fully implemented: broadcast system UI, scheduled maintenance, full FAQ CRUD, daily rewards, and complete audit logging on every admin action.
- NSFW model loading (`@tensorflow/tfjs-node`) requires native bindings and may need additional system dependencies (e.g., Cairo, libvips) on the host.

---

For setup and deployment instructions, see [README.md](./README.md).