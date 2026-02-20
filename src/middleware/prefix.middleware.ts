import { Context, NextFunction } from "grammy";
import config from "../config";

export function prefixMiddleware() {
  return async (ctx: Context, next: NextFunction) => {
    if (!ctx.message || !("text" in ctx.message)) return next();
    const text = ctx.message.text || "";
    const values = config.prefix.values as string[];
    for (const p of values) {
      const cmp = config.prefix.caseSensitive ? p : p.toLowerCase();
      const subject = config.prefix.caseSensitive ? text : text.toLowerCase();
      if (subject.startsWith(cmp)) {
        // attach parsed command to session for handlers
        (ctx as any).prefixCommand = text.slice(p.length).trim();
        return next();
      }
    }
    return next();
  };
}
