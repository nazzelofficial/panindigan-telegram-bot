import { Context, NextFunction } from "grammy";
import config from "../config";
import logger from "../logger";

const windows = new Map<number, number[]>();

export function rateLimitMiddleware() {
  const max = config.rateLimit.maxMessages;
  const windowMs = config.rateLimit.windowMs;
  return async (ctx: Context, next: NextFunction) => {
    const from = ctx.from;
    if (!from) return next();
    
    const now = Date.now();
    const arr = windows.get(from.id) || [];
    const filtered = arr.filter((t) => now - t < windowMs);
    filtered.push(now);
    windows.set(from.id, filtered);
    
    if (filtered.length > max) {
      logger.warn(`🛳 Rate limit exceeded for user`, {
        userId: from.id,
        userName: from.first_name,
        messageCount: filtered.length,
        maxAllowed: max,
        windowMs: windowMs,
        chatId: ctx.chat?.id
      });
      await ctx.reply("⚠️ Mabagal muna — masyadong maraming mensahe. Pakiantay.");
      return;
    }
    return next();
  };
}
