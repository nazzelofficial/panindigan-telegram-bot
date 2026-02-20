import { Context, NextFunction } from "grammy";
import config from "../config";

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
      await ctx.reply("⚠️ Mabagal muna — masyadong maraming mensahe. Pakiantay.");
      return;
    }
    return next();
  };
}
