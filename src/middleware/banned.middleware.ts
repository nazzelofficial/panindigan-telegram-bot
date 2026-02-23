import { Context, NextFunction } from "grammy";
import { findUserByTelegramId, isBannedByTelegramId } from "../database/queries/users.queries";
import logger from "../logger";

export function bannedMiddleware() {
  return async (ctx: Context, next: NextFunction) => {
    const from = ctx.from;
    if (!from) return next();
    
    try {
      const banned = await isBannedByTelegramId(from.id);
      if (banned) {
        logger.warn(`🚫 Blocked message from banned user`, {
          userId: from.id,
          userName: from.first_name,
          chatId: ctx.chat?.id,
          chatType: ctx.chat?.type,
          messageText: ctx.message?.text?.substring(0, 50) || "[non-text]"
        });
        // silently ignore
        return;
      }
    } catch (err) {
      logger.error(`❌ Error checking ban status`, {
        userId: from.id,
        error: (err as Error).message
      });
    }
    return next();
  };
}
