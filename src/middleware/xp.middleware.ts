import { Context, NextFunction } from "grammy";
import config from "../config";
import { getOrCreateUserLevel, addXp } from "../database/queries/user_levels.queries";
import { upsertUser } from "../database/queries/users.queries";

const lastXp = new Map<string, number>();

export function xpMiddleware() {
  const xpPerMessage = config.levels.xpPerMessage;
  const cooldownMs = (config.levels.xpCooldownSeconds || 60) * 1000;
  return async (ctx: Context, next: NextFunction) => {
    const from = ctx.from;
    if (!from || !ctx.chat || ctx.chat.type === "private") return next();
    const now = Date.now();
    const key = `${from.id}:${ctx.chat.id}`;
    const last = lastXp.get(key) || 0;
    if (now - last < cooldownMs) return next();
    lastXp.set(key, now);

    // ensure user exists
    await upsertUser({ telegram_id: from.id, username: from.username || null, first_name: from.first_name || null, last_name: from.last_name || null });
    const before = await getOrCreateUserLevel(from.id, ctx.chat.id);
    const updated = await addXp(from.id, xpPerMessage, ctx.chat.id);

    // detect level up and award badge based on tier
    try {
      const prevLevel = before.level || 1;
      const newLevel = updated.level || prevLevel;
      if (newLevel > prevLevel) {
        // find matching tier
        const tier = config.levels.tiers.slice().reverse().find((t: any) => t.level === newLevel);
        if (tier) {
          // award badge matching tier name
          const { findBadgeByKey, createBadge, awardBadgeToUser } = await import("../database/queries/badges.queries");
          const key = `tier_${newLevel}`;
          let b = await findBadgeByKey(key);
          if (!b) b = await createBadge(key, tier.name, `Awarded for reaching level ${newLevel}`, tier.name);
          if (b) await awardBadgeToUser(before.user_id, b.id, undefined);
        }
      }
    } catch (err) {
      // ignore badge errors
    }

    return next();
  };
}
