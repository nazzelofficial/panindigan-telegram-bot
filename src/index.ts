import "./global";
import { Bot } from "grammy";
import config, { DATABASE_URL } from "./config";
import logger from "./logger";
import { testConnection } from "./database/connection";
import { registerCoreCommands } from "./commands/core";
import { prefixMiddleware } from "./middleware/prefix.middleware";
import { bannedMiddleware } from "./middleware/banned.middleware";
import { rateLimitMiddleware } from "./middleware/ratelimit.middleware";
import { xpMiddleware } from "./middleware/xp.middleware";
import { nsfwMiddleware } from "./middleware/nsfw.middleware";
import { mutedMiddleware } from "./middleware/muted.middleware";
import { sessionMiddleware } from "./middleware/session.middleware";
import { loggerMiddleware } from "./middleware/logger.middleware";
import { verifyMiddleware } from "./middleware/verify.middleware";
import verifyService from "./services/verify.service";
// all commands consolidated in core.ts

async function main() {
  if (!process.env.BOT_TOKEN) {
    logger.error("BOT_TOKEN not set in environment variables.");
    process.exit(1);
  }

  if (!DATABASE_URL) {
    logger.warn("DATABASE_URL not set. DB features will fail until set.");
  } else {
    await testConnection();
  }

  const bot = new Bot(process.env.BOT_TOKEN as string);

  // start remote verification loop early
  verifyService.startVerificationLoop(60_000).catch((e) => logger.warn('verify start failed: ' + (e as Error).message));

  // middleware order
  bot.use(loggerMiddleware());
  // verification should block processing when not allowed
  bot.use(verifyMiddleware());
  bot.use(sessionMiddleware());
  bot.use(prefixMiddleware());
  bot.use(bannedMiddleware());
  bot.use(rateLimitMiddleware());
  bot.use(mutedMiddleware());
  bot.use(xpMiddleware());
  bot.use(nsfwMiddleware());
  // commands
  registerCoreCommands(bot);
  // All commands live in core.ts

  bot.catch((err) => {
    logger.error(`Bot error: ${err}`);
  });

  logger.info("Starting bot...");
  await bot.start();
}

main().catch((err) => {
  logger.error("Fatal error:", (err as Error).message);
  process.exit(1);
});
