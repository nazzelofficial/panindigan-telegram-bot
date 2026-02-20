import { Context, NextFunction } from "grammy";
import config from "../config";
import nsfwjs from "nsfwjs";
import * as tf from "@tensorflow/tfjs-node";
import fetch from "node-fetch";
import logger from "../logger";
import { query } from "../database/connection";
import { getChatSettings } from "../database/queries/chat_settings.queries";

let model: nsfwjs.NSFWJS | null = null;

async function loadModel() {
  if (model) return model;
  try {
    model = await nsfwjs.load();
    return model;
  } catch (err) {
    logger.error("Failed to load NSFW model: " + (err as Error).message);
    return null;
  }
}

export function nsfwMiddleware() {
  return async (ctx: Context, next: NextFunction) => {
    if (!config.nsfw.enabled) return next();
    // check chat-level override (if set, it wins)
    const chatId = ctx.chat?.id;
    if (chatId) {
      try {
        const chatSetting = await getChatSettings(chatId as number);
        if (chatSetting && chatSetting.nsfw_enabled === false) return next();
        // override thresholds and flags from chat settings if present
        if (chatSetting) {
          // @ts-ignore
          if (typeof chatSetting.nsfw_threshold === 'number') config.nsfw.threshold = chatSetting.nsfw_threshold;
          // @ts-ignore
          if (typeof chatSetting.nsfw_delete_on_detect === 'boolean') config.nsfw.deleteOnDetect = chatSetting.nsfw_delete_on_detect;
          // @ts-ignore
          if (typeof chatSetting.nsfw_notify_user === 'boolean') config.nsfw.notifyUser = chatSetting.nsfw_notify_user;
        }
      } catch (err) {
        logger.warn("Failed to read chat nsfw setting: " + (err as Error).message);
      }
    }
    if (!ctx.message) return next();
    const photos = (ctx.message as any).photo;
    if (!photos || !photos.length) return next();

    const fileId = photos[photos.length - 1].file_id;
    try {
      const botFile = await ctx.api.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${botFile.file_path}`;
      const res = await fetch(fileUrl);
      const buffer = await res.buffer();
      await loadModel();
      if (!model) return next();
      const image = tf.node.decodeImage(buffer, 3) as any;
      const predictions = await (model as any).classify(image);
      image.dispose();
      const porn = predictions.find((p: any) => p.className.toLowerCase().includes("porn"))?.probability || 0;
      const sexy = predictions.find((p: any) => p.className.toLowerCase().includes("sexy"))?.probability || 0;
      const combined = porn + sexy;
      if (combined >= config.nsfw.threshold) {
        // delete message
        if (config.nsfw.deleteOnDetect) {
          try { await ctx.deleteMessage(); } catch {}
        }
        // log
        await query(`INSERT INTO nsfw_logs(user_id, chat_id, file_id, confidence_score, action_taken) VALUES($1,$2,$3,$4,$5)`, [ctx.from?.id || null, ctx.chat?.id || null, fileId, combined, config.nsfw.deleteOnDetect ? 'deleted' : 'warned']);
        if (config.nsfw.notifyUser && ctx.from) {
          try { await ctx.api.sendMessage(ctx.from.id, "⚠️ Ang ipinadalang larawan ay na-tag bilang hindi angkop at na-delete."); } catch {}
        }
        return;
      }
    } catch (err) {
      logger.error("NSFW check failed: " + (err as Error).message);
    }
    return next();
  };
}
