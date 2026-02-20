import { Context, NextFunction } from "grammy";
import { isUserMuted } from "../database/queries/mutes.queries";

export function mutedMiddleware() {
  return async (ctx: Context, next: NextFunction) => {
    const from = ctx.from;
    const chat = ctx.chat;
    if (!from || !chat) return next();
    const muted = await isUserMuted(from.id, chat.id as number);
    if (muted) return; // silently drop
    return next();
  };
}
