import { Context, NextFunction } from "grammy";
import { findUserByTelegramId, isBannedByTelegramId } from "../database/queries/users.queries";

export function bannedMiddleware() {
  return async (ctx: Context, next: NextFunction) => {
    const from = ctx.from;
    if (!from) return next();
    const banned = await isBannedByTelegramId(from.id);
    if (banned) {
      // silently ignore
      return;
    }
    return next();
  };
}
