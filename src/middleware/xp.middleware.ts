import { Context, NextFunction } from "grammy";
import config from "../config";
import { getOrCreateUserLevel, addXp } from "../database/queries/user_levels.queries";
import { upsertUser } from "../database/queries/users.queries";
import logger from "../logger";

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

    try {
      // ensure user exists
      await upsertUser({ telegram_id: from.id, username: from.username || null, first_name: from.first_name || null, last_name: from.last_name || null });
      const before = await getOrCreateUserLevel(from.id, ctx.chat.id);
      const updated = await addXp(from.id, xpPerMessage, ctx.chat.id);

      // detect level up and award badge based on tier
      const prevLevel = before.level || 1;
      const newLevel = updated.level || prevLevel;
      if (newLevel > prevLevel) {
        logger.info(`🌟 Level up!`, {
          userId: from.id,
          userName: from.first_name,
          chatId: ctx.chat.id,
          newLevel: newLevel,
          previousLevel: prevLevel,
          totalXp: updated.xp
        });
        
        // find matching tier
        const tier = config.levels.tiers.slice().reverse().find((t: any) => t.level === newLevel);
        if (tier) {
          try {
            // award badge matching tier name
            const { findBadgeByKey, createBadge, awardBadgeToUser } = await import("../database/queries/badges.queries");
            const badgeKey = `tier_${newLevel}`;
            let b = await findBadgeByKey(badgeKey);
            if (!b) b = await createBadge(badgeKey, tier.name, `Awarded for reaching level ${newLevel}`, tier.name);
            if (b) {
              await awardBadgeToUser(before.user_id, b.id, undefined);
              logger.info(`🎆 Badge awarded`, {
                userId: from.id,
                badge: tier.name,
                level: newLevel
              });
            }
          } catch (err) {
            logger.warn(`⚠️ Failed to award badge`, {
              userId: from.id,
              level: newLevel,
              error: (err as Error).message
            });
          }
        }
      } else {
        logger.debug(`📈 XP added`, {
          userId: from.id,
          xpAdded: xpPerMessage,
          totalXp: updated.xp,
          level: newLevel
        });
      }
    } catch (err) {
      logger.error(`❌ Error processing XP`, {
        userId: from.id,
        chatId: ctx.chat?.id,
        error: (err as Error).message
      });
    }

    return next();
  };
}
