import { Bot } from "grammy";
import { DATABASE_URL } from "./config";
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
import { ageVerificationMiddleware } from "./middleware/age.middleware";
// all commands consolidated in core.ts

async function main() {
  logger.info("⚙️ Initializing bot startup sequence...");
  
  if (!process.env.BOT_TOKEN) {
    logger.error("❌ CRITICAL: BOT_TOKEN not set in environment variables. Cannot proceed.", {
      error: "MISSING_BOT_TOKEN"
    });
    process.exit(1);
  }
  logger.info("✅ BOT_TOKEN loaded successfully");

  if (!DATABASE_URL) {
    logger.warn("⚠️ DATABASE_URL not configured. Database features will be unavailable.", {
      warning: "NO_DATABASE_URL"
    });
  } else {
    try {
      logger.info("🔄 Testing database connection...");
      await testConnection();
      logger.info("✅ Database connection successful");
    } catch (err) {
      logger.error("❌ Database connection failed", {
        error: (err as Error).message,
        timestamp: new Date().toISOString()
      });
      throw err;
    }
  }

  const bot = new Bot(process.env.BOT_TOKEN as string);
  logger.info("✅ Bot instance created");

  // start remote verification loop early
  logger.info("🔐 Starting verification service...");
  verifyService.startVerificationLoop(60_000).catch((e) => {
    logger.warn("⚠️ Verification service startup failed", {
      error: (e as Error).message,
      timestamp: new Date().toISOString()
    });
  });

  // middleware order
  logger.info("📦 Registering middleware stack...");
  bot.use(loggerMiddleware());
  logger.debug("  └─ Logger middleware registered");
  // verification should block processing when not allowed
  bot.use(verifyMiddleware());
  logger.debug("  └─ Verification middleware registered");
  // require age verification for most commands
  bot.use(ageVerificationMiddleware());
  logger.debug("  └─ Age verification middleware registered");
  bot.use(sessionMiddleware());
  logger.debug("  └─ Session middleware registered");
  bot.use(prefixMiddleware());
  logger.debug("  └─ Prefix middleware registered");
  bot.use(bannedMiddleware());
  logger.debug("  └─ Banned users middleware registered");
  bot.use(rateLimitMiddleware());
  logger.debug("  └─ Rate limit middleware registered");
  bot.use(mutedMiddleware());
  logger.debug("  └─ Muted users middleware registered");
  bot.use(xpMiddleware());
  logger.debug("  └─ XP middleware registered");
  bot.use(nsfwMiddleware());
  logger.debug("  └─ NSFW filter middleware registered");
  logger.info("✅ All middleware registered successfully");

  // commands
  logger.info("🎮 Registering command handlers...");
  registerCoreCommands(bot);
  logger.info("✅ All command handlers registered");

  bot.catch((err) => {
    logger.error("❌ Unhandled bot error", {
      error: String(err),
      timestamp: new Date().toISOString()
    });
  });

  logger.info("🚀 Starting bot polling...");
  await bot.start();
  logger.info("✅ Bot is now running");
}

logger.info("════════════════════════════════════════════════════════");
logger.info("           🤖 PANINDIGAN BOT LAUNCHER 🤖");
logger.info("════════════════════════════════════════════════════════");

main().catch((err) => {
  logger.error("❌ FATAL ERROR: Bot startup failed", {
    error: (err as Error).message,
    stack: (err as Error).stack,
    timestamp: new Date().toISOString()
  });
  logger.info("════════════════════════════════════════════════════════");
  logger.info("Bot shutdown due to fatal error");
  logger.info("════════════════════════════════════════════════════════");
  process.exit(1);
});
