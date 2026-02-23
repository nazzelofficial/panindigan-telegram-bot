import { Context, NextFunction } from 'grammy';
import verifyService from '../services/verify.service';
import logger from '../logger';

export function verifyMiddleware() {
  return async (ctx: Context, next: NextFunction) => {
    if (!verifyService.isVerified()) {
      // If not verified, block handling and inform admins if direct message
      try {
        const msg = '⚠️ Service temporarily disabled: instance not verified. Some bot features are unavailable.';
        logger.warn(`🚫 Blocked command due to verification failure`, {
          command: ctx.message?.text?.substring(0, 50) || '[unknown]',
          userId: ctx.from?.id,
          chatId: ctx.chat?.id,
          chatType: ctx.chat?.type,
          instanceId: process.env.INSTANCE_ID || process.env.HOSTNAME,
          timestamp: new Date().toISOString()
        });
        // Reply in-chat when possible
        if (ctx.chat && ctx.chat.type !== 'private') {
          await ctx.api.sendMessage(ctx.chat.id, msg).catch(() => {});
        } else if (ctx.chat && ctx.chat.type === 'private' && ctx.from) {
          await ctx.api.sendMessage(ctx.chat.id, msg).catch(() => {});
        }
      } catch (err) {
        logger.error(`❌ Error in verification middleware`, {
          error: (err as Error).message,
          userId: ctx.from?.id,
          chatId: ctx.chat?.id
        });
      }
      return; // stop processing any further handlers
    }
    return next();
  };
}
