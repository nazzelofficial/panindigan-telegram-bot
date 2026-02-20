import { Context, NextFunction } from 'grammy';
import verifyService from '../services/verify.service';

export function verifyMiddleware() {
  return async (ctx: Context, next: NextFunction) => {
    if (!verifyService.isVerified()) {
      // If not verified, block handling and inform admins if direct message
      try {
        const msg = '⚠️ Service temporarily disabled: instance not verified. Some bot features are unavailable.';
        // Reply in-chat when possible
        if (ctx.chat && ctx.chat.type !== 'private') {
          await ctx.api.sendMessage(ctx.chat.id, msg).catch(() => {});
        } else if (ctx.chat && ctx.chat.type === 'private' && ctx.from) {
          await ctx.api.sendMessage(ctx.chat.id, msg).catch(() => {});
        }
      } catch {}
      return; // stop processing any further handlers
    }
    return next();
  };
}
