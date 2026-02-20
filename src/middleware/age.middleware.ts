import { Context, NextFunction } from 'grammy';
import { findUserByTelegramId } from '../database/queries/users.queries';
import logger from '../logger';

// Commands allowed before age verification
const WHITELIST = new Set(['start', 'help', 'verifystatus']);

export function ageVerificationMiddleware() {
  return async (ctx: Context, next: NextFunction) => {
    try {
      const from = ctx.from;
      if (!from) return; // no user
      // allow admins bypass
      const text = ctx.message?.text || '';
      const cmd = (text.split(/\s+/)[0] || '').replace('/', '').toLowerCase();
      if (WHITELIST.has(cmd)) return next();
      const user = await findUserByTelegramId(from.id);
      if (!user) return next();
      if (user.is_age_verified) return next();
      // if not verified, block
      await ctx.reply('⛔ Access denied: kailangan ng age verification (14+). I-type ang /start para magbigay ng iyong petsa ng kapanganakan (format: YYYY-MM-DD).');
    } catch (err) {
      logger.error('age middleware error: ' + (err as Error).message);
      return next();
    }
  };
}
