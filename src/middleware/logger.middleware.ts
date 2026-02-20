import { Context, NextFunction } from "grammy";
import logger from "../logger";

export function loggerMiddleware() {
  return async (ctx: Context, next: NextFunction) => {
    const from = ctx.from;
    const chat = ctx.chat;
    const type = (ctx as any).updateType;
    logger.info(`Update: type=${type} from=${from?.id || 'unknown'} chat=${chat?.id || 'unknown'}`);
    try {
      await next();
    } catch (err) {
      logger.error(`Handler error: ${(err as Error).message}`);
      throw err;
    }
  };
}
