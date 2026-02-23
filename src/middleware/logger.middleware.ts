import { Context, NextFunction } from "grammy";
import logger from "../logger";

export function loggerMiddleware() {
  return async (ctx: Context, next: NextFunction) => {
    const from = ctx.from;
    const chat = ctx.chat;
    const updateType = (ctx as any).updateType;
    const messageText = ctx.message?.text ? ctx.message.text.substring(0, 100) : "[no text]";
    const startTime = Date.now();

    try {
      const logContext = {
        updateType,
        fromId: from?.id,
        fromName: from?.first_name,
        chatId: chat?.id,
        chatType: chat?.type,
        messageText: messageText,
        isBotCommand: ctx.message?.entities?.[0]?.type === "bot_command"
      };

      if (updateType === "message") {
        logger.info(`📨 Message received`, logContext);
      } else if (updateType === "callback_query") {
        logger.info(`🔘 Callback query`, logContext);
      } else {
        logger.debug(`📥 Update: ${updateType}`, logContext);
      }

      await next();

      const duration = Date.now() - startTime;
      logger.debug(`✓ Update processed in ${duration}ms`, { ...logContext, duration });
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Handler error after ${duration}ms`, {
        updateType,
        fromId: from?.id,
        chatId: chat?.id,
        messageText,
        error: (err as Error).message,
        stack: (err as Error).stack,
        duration
      });
      throw err;
    }
  };
}
