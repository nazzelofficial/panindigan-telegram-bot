import { Context, NextFunction } from "grammy";
import { isUserMuted } from "../database/queries/mutes.queries";
import logger from "../logger";

export function mutedMiddleware() {
  return async (ctx: Context, next: NextFunction) => {
    const from = ctx.from;
    const chat = ctx.chat;
    if (!from || !chat) return next();
    
    try {
      const muted = await isUserMuted(from.id, chat.id as number);
      if (muted) {
        logger.warn(`🔇 Silenced message from muted user`, {
          userId: from.id,
          userName: from.first_name,
          chatId: chat.id,
          messageText: ctx.message?.text?.substring(0, 50) || "[non-text]"
        });
        return; // silently drop
      }
    } catch (err) {
      logger.error(`❌ Error checking mute status`, {
        userId: from.id,
        chatId: chat.id,
        error: (err as Error).message
      });
    }
    return next();
  };
}
